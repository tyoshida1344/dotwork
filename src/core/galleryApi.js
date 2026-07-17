import { supabase } from '~/core/supabase.js'

// 公開ギャラリー（イシュー #5）の読み取り。worksApi.js は本人の作品 CRUD、こちらは
// 全ユーザー横断の「公開中の作品」の読み取り専用。anon でも引ける（未ログイン閲覧のため）。
// 投稿者名は profiles から付ける（works→profiles の外部キーは無いので別引きして結合する）。

// 一度に取る公開作品の上限。サムネイル描画にピクセルを載せるので、payload を抑えるため絞る。
// 検索・絞り込みはこの最新 N 件に対して画面側で行う。
export const GALLERY_LIMIT = 120

function assertClient() {
  if (!supabase) throw new Error('Supabase が未設定です（.env を確認してください）。')
}

// DB エラーは内部情報を含みうるので、画面には汎用文言に丸めて出す。
function toClientError(error, where) {
  console.error(`[gallery] ${where}:`, error)
  return new Error('処理に失敗しました。時間をおいて再度お試しください。')
}

// 公開中の作品を更新日時の新しい順に取得し、投稿者の表示名を付けて返す。
// 絞り込み（タイトル・投稿者名・レッスン・サイズ）は取得後に画面側で行う。
export async function fetchPublicWorks() {
  assertClient()
  const { data, error } = await supabase
    .from('works')
    .select('id, user_id, title, cols, rows, pixels, palette, head_units, v_div_units, lesson_id, updated_at')
    .eq('is_public', true)
    .order('updated_at', { ascending: false })
    .limit(GALLERY_LIMIT)
  if (error) throw toClientError(error, 'fetchPublicWorks')

  const names = await fetchDisplayNames([...new Set(data.map(r => r.user_id))])
  return data.map(r => ({
    id: r.id,
    userId: r.user_id,
    displayName: names.get(r.user_id) ?? '',
    title: r.title,
    cols: r.cols,
    rows: r.rows,
    pixels: r.pixels,
    palette: Array.isArray(r.palette) ? r.palette : [],
    headUnits: r.head_units,
    vDivUnits: r.v_div_units,
    lessonId: r.lesson_id,
    updatedAt: r.updated_at,
  }))
}

// user_id → 表示名の Map。表示名が引けなくても作品一覧は出したいので、失敗しても投げず空で返す。
async function fetchDisplayNames(userIds) {
  if (!userIds.length) return new Map()
  const { data, error } = await supabase
    .from('profiles').select('user_id, display_name').in('user_id', userIds)
  if (error) {
    console.warn('[gallery] 投稿者名の取得に失敗しました（無視して継続）。', error)
    return new Map()
  }
  return new Map(data.map(p => [p.user_id, p.display_name]))
}
