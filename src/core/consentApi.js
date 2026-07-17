import { supabase } from '~/core/supabase.js'

// ユーザーの同意記録（user_consents テーブル）の読み書き。
// anon クライアント＋ログイン中のセッションで直接行い、本人の行だけを RLS（auth.uid() = user_id）で絞る。
const TABLE = 'user_consents'

// 同意対象の文書種別。DB の CHECK（user_consents_document）と一致させること。
export const CONSENT_DOCS = { TERMS: 'terms' }

function assertClient() {
  if (!supabase) throw new Error('Supabase が未設定です（.env を確認してください）。')
}

// DB エラーは内部情報を含みうるので、画面には汎用文言に丸めて出す。
function toClientError(error, where) {
  console.error(`[consent] ${where}:`, error)
  return new Error('処理に失敗しました。時間をおいて再度お試しください。')
}

// 本人がこの文書のこの版にすでに同意しているかを返す。
export async function hasAgreed(document, version) {
  assertClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('ログインが必要です。')
  const { data, error } = await supabase
    .from(TABLE).select('id')
    .eq('user_id', user.id).eq('document', document).eq('version', version)
    .maybeSingle()
  if (error) throw toClientError(error, 'hasAgreed')
  return !!data
}

// 本人の同意を記録する。すでに同じ版へ同意済みなら何もしない（重複は無視する）。
export async function recordConsent(document, version) {
  assertClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('ログインが必要です。')
  const { error } = await supabase
    .from(TABLE).upsert(
      { user_id: user.id, document, version },
      { onConflict: 'user_id,document,version', ignoreDuplicates: true },
    )
  if (error) throw toClientError(error, 'recordConsent')
}
