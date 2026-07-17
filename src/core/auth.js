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
  user: null,     // { id } | null。ログイン済みかの判定にのみ使う
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

// 表示名は持たない。Google の名前・メールアドレスは画面に出さない
// （本名が意図せず表示されるため）。ユーザーが決める表示名は別途プロフィールとして扱う。
function toUser(session) {
  if (!session?.user) return null
  return { id: session.user.id }
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

// 表示名（profiles テーブル）。Google の名前は使わず、本人が決めた表示名をマイページに出す。
// #5（投稿）で他人の投稿者名を見せるため、読み取りは全員可・書き込みは本人のみ（RLS）。
// 初期行はサインアップ時に DB トリガーが既定名で作るので、通常は必ず1行ある。
export async function fetchDisplayName() {
  const sb = await getClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('ログインが必要です。')
  const { data, error } = await sb
    .from('profiles').select('display_name').eq('user_id', user.id).maybeSingle()
  if (error) {
    console.warn('[auth] 表示名の取得に失敗しました。', error)
    throw new Error('表示名を読み込めませんでした。時間をおいて再度お試しください。')
  }
  return data?.display_name ?? ''
}

// upsert（PK=user_id）で保存する。初期行が無い既存ユーザーでも、insert/update の
// RLS ポリシー内で行を作れる。長さ・空のガードは呼び出し側と DB の CHECK が持つ。
export async function updateDisplayName(name) {
  const sb = await getClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) throw new Error('ログインが必要です。')
  const { data, error } = await sb
    .from('profiles').upsert({ user_id: user.id, display_name: name }).select('display_name').single()
  if (error) {
    console.warn('[auth] 表示名の保存に失敗しました。', error)
    throw new Error('表示名を保存できませんでした。時間をおいて再度お試しください。')
  }
  return data.display_name
}
