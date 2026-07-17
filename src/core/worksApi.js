import { supabase } from '~/core/supabase.js'

// 作品（works）の CRUD。読み書きとも anon クライアント＋ログイン中のセッションで直接行い、
// 「本人の行だけ」は RLS（auth.uid() = user_id）が保証する。レッスンと違い Edge Function は挟まない。
const TABLE = 'works'

// 1ユーザーが保持できる作品数の上限。
// 強制するのは DB のトリガー（works_enforce_limit）。ここは保存前に弾いて理由を伝えるためのもので、
// 値は必ずマイグレーション側と一致させること。
export const WORK_LIMIT = 20

// DB 行 → フロントの作品形
function rowToWork(r) {
  return {
    id: r.id,
    title: r.title,
    cols: r.cols,
    rows: r.rows,
    pixels: r.pixels,
    palette: Array.isArray(r.palette) ? r.palette : [],
    headUnits: r.head_units,
    vDivUnits: r.v_div_units,
    lessonId: r.lesson_id,
    isPublic: r.is_public,
    updatedAt: r.updated_at,
  }
}

// フロントの作品形 → DB 行（id / user_id / 日時は含めない）
function workToRow(w) {
  return {
    title: w.title,
    cols: w.cols,
    rows: w.rows,
    pixels: w.pixels,
    palette: w.palette,
    head_units: w.headUnits,
    v_div_units: w.vDivUnits,
    lesson_id: w.lessonId ?? null,
  }
}

function assertClient() {
  if (!supabase) throw new Error('Supabase が未設定です（.env を確認してください）。')
}

// 上限トリガーの例外（P0001）は、DB が組み立てた日本語メッセージをそのまま見せる。
// それ以外の DB エラーは内部情報を含みうるので汎用文言に丸める。
function toClientError(error, where) {
  if (error.code === 'P0001') return new Error(error.message)
  console.error(`[works] ${where}:`, error)
  return new Error('処理に失敗しました。時間をおいて再度お試しください。')
}

export async function fetchWorks() {
  assertClient()
  const { data, error } = await supabase
    .from(TABLE).select('*').order('updated_at', { ascending: false })
  if (error) throw toClientError(error, 'fetchWorks')
  return data.map(rowToWork)
}

// 新規保存の前に、件数の確認と自動命名（「無題 N」）のためだけに引く。
// ピクセルを載せると 20 件で数百 KB になるので、列を絞る。
export async function fetchWorkTitles() {
  assertClient()
  const { data, error } = await supabase.from(TABLE).select('id, title')
  if (error) throw toClientError(error, 'fetchWorkTitles')
  return data
}

export async function createWork(work) {
  assertClient()
  // user_id は RLS の with check と突き合わせるため明示的に載せる
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('ログインが必要です。')
  const { data, error } = await supabase
    .from(TABLE).insert({ ...workToRow(work), user_id: user.id }).select().single()
  if (error) throw toClientError(error, 'createWork')
  return rowToWork(data)
}

// 上書き保存。タイトルは触らない（変更は renameWork の役目）ので、列ごと送らない。
export async function updateWork(id, work) {
  assertClient()
  const { title: _title, ...row } = workToRow(work)
  const { data, error } = await supabase
    .from(TABLE).update(row).eq('id', id).select().single()
  if (error) throw toClientError(error, 'updateWork')
  return rowToWork(data)
}

export async function renameWork(id, title) {
  assertClient()
  const { data, error } = await supabase
    .from(TABLE).update({ title }).eq('id', id).select().single()
  if (error) throw toClientError(error, 'renameWork')
  return rowToWork(data)
}

// 公開状態を切り替える。is_public だけを更新するので、エディタの上書き保存（updateWork）が
// 公開状態を巻き戻すことはない（workToRow に is_public を含めないのはこのため）。
export async function setWorkPublic(id, isPublic) {
  assertClient()
  const { data, error } = await supabase
    .from(TABLE).update({ is_public: isPublic }).eq('id', id).select().single()
  if (error) throw toClientError(error, 'setWorkPublic')
  return rowToWork(data)
}

// 物理削除。上限のカウントがその場で戻るよう、論理削除にはしない
// （レッスンは共有データなので論理削除だが、作品は本人だけのもの）。
export async function deleteWork(id) {
  assertClient()
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw toClientError(error, 'deleteWork')
}
