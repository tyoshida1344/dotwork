import { supabase } from '~/core/supabase.js'

// 学習者の表示名（profiles）の読み書き。
// works と同じく anon クライアント＋ログイン中のセッションで直接行い、「本人の行だけ書ける」ことは RLS（auth.uid() = user_id）が保証する。
//
// Google の名前・メールは画面に出さず、本人が決めた表示名だけを扱う。
// 他人の表示名も読めるよう読み取りは全員可、書き込みは本人のみ。
// 初期行はサインアップ時に DB トリガーが既定名で作るので、通常はどのユーザーにも1行ある。
const TABLE = 'profiles'

function assertClient() {
  if (!supabase) throw new Error('Supabase が未設定です（.env を確認してください）。')
}

// DB エラーは内部情報を含みうるので、画面には汎用文言に丸めて出す。
function toClientError(error, where) {
  console.error(`[profile] ${where}:`, error)
  return new Error('処理に失敗しました。時間をおいて再度お試しください。')
}

// ログイン中のユーザーの表示名を読む。
// 行が無ければ空文字を返す。
export async function fetchDisplayName() {
  assertClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('ログインが必要です。')
  const { data, error } = await supabase
    .from(TABLE).select('display_name').eq('user_id', user.id).maybeSingle()
  if (error) throw toClientError(error, 'fetchDisplayName')
  return data?.display_name ?? ''
}

// ログイン中のユーザーの表示名を保存する。
// 初期行が無い既存ユーザーでも作れるよう、upsert（PK=user_id）を使う。
// 長さ・空のガードは呼び出し側と DB の CHECK が持つ。
export async function updateDisplayName(name) {
  assertClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('ログインが必要です。')
  const { data, error } = await supabase
    .from(TABLE).upsert({ user_id: user.id, display_name: name }).select('display_name').single()
  if (error) throw toClientError(error, 'updateDisplayName')
  return data.display_name
}
