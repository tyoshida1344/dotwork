import { reactive } from 'vue'

// 学習者のログイン（Supabase Auth の Google OAuth）。
// 管理者（admins テーブル＋Edge Function の独自トークン）とは完全に別系統で、こちらは
// Supabase Auth の JWT をそのまま使い、作品の読み書きは RLS（auth.uid()）で守る。
//
// lessons.js と同じく supabase.js を静的 import しない。@supabase/supabase-js を
// エディタの初期バンドルから切り離し、必要になった時だけ動的 import するため。
export const isAuthAvailable = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

// ログイン状態。ready になるまでヘッダーはログイン導線を出さない
// （未ログイン表示 → ログイン済み表示 のちらつきを避けるため）。
export const authState = reactive({
  ready: false,
  user: null,     // { id, name } | null
})

let client = null
let ensuring = null

async function getClient() {
  if (!client) ({ supabase: client } = await import('./supabase.js'))
  return client
}

// ログイン済みの形跡が localStorage にあるか。supabase-js はセッションを
// `sb-<プロジェクト参照>-auth-token` に保存する。
function hasStoredSession() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith('sb-') && k.endsWith('-auth-token')) return true
    }
  } catch { /* localStorage 不可（プライベートモード等）は未ログイン扱い */ }
  return false
}

// Google の認可画面から戻ってきた直後か。トークンは URL に載っており、
// supabase-js が拾ってセッションにする（implicit フローなのでハッシュ側）。
function isAuthRedirect() {
  return /[#&](access_token|error)=/.test(location.hash) || /[?&]code=/.test(location.search)
}

function toUser(session) {
  if (!session?.user) return null
  const meta = session.user.user_metadata ?? {}
  return {
    id: session.user.id,
    name: meta.name || meta.full_name || session.user.email || 'ユーザー',
  }
}

// 保存済みセッションを復元し、以後の変化（ログイン・ログアウト・トークン更新）を購読する。
// OAuth から戻った直後は URL に載ったトークンがここでセッションになる（detectSessionInUrl）。
// 何度呼んでも購読は一度きり。
//
// ログインの形跡が無いうちは supabase-js を読み込まない。エディタを開いただけの
// 未ログイン利用者に 200KB 超のチャンクを取らせないため（ログインボタンを出すのに実体は要らない）。
export function ensureAuth() {
  if (!isAuthAvailable) { authState.ready = true; return Promise.resolve(null) }
  if (!hasStoredSession() && !isAuthRedirect()) { authState.ready = true; return Promise.resolve(null) }
  if (!ensuring) {
    ensuring = (async () => {
      try {
        const sb = await getClient()
        const { data } = await sb.auth.getSession()
        authState.user = toUser(data.session)
        sb.auth.onAuthStateChange((_event, session) => { authState.user = toUser(session) })
      } catch (e) {
        console.warn('[auth] セッションの復元に失敗しました。', e)
      }
      authState.ready = true
      return authState.user
    })()
  }
  return ensuring
}

// Google の認可画面へ遷移する。戻り先は既定で Supabase の Site URL（＝エディタ）。
// redirectTo を渡す場合、その URL は Supabase 側の許可リストに載っている必要がある。
// 遷移でエディタの描画は失われるため、呼ぶ側が works.js の stashEditor() で退避しておくこと。
export async function signInWithGoogle(redirectTo) {
  const sb = await getClient()
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: redirectTo ? { redirectTo } : undefined,
  })
  if (error) throw error
}

export async function signOut() {
  const sb = await getClient()
  await sb.auth.signOut()
  authState.user = null
}
