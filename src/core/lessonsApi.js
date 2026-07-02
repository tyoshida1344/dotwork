import { supabase } from './supabase.js'

// Supabase の lessons テーブルとフロントのレッスンオブジェクトを相互変換する。
// DB 側は id(自動採番 PK) / description(=desc, desc は SQL 予約語) / deleted_at(論理削除) を持つ。
const TABLE = 'lessons'
const BUCKET = 'lesson-refs'

function rowToLesson(r) {
  return {
    id: r.id,
    level: r.level,
    title: r.title,
    desc: r.description,
    size: r.size,
    palette: Array.isArray(r.palette) ? r.palette : [],
    ref: r.ref,
    sortOrder: r.sort_order,
  }
}

// フロント → DB 行。id（PK）・sort_order・deleted_at は書き込み対象に含めない
// （id は自動採番、sort_order は並び替え、deleted_at は削除処理でのみ触る）。
function lessonToRow(l) {
  return {
    level: l.level,
    title: l.title,
    description: l.desc,
    size: l.size,
    palette: l.palette,
    ref: l.ref,
  }
}

function assertClient() {
  if (!supabase) throw new Error('Supabase が未設定です（.env を確認してください）。')
}

// ── レッスン CRUD ─────────────────────────────
// 並び順は sort_order 昇順（管理画面の並び替えで決まる）。論理削除済み（deleted_at）は除外。
export async function fetchLessons() {
  assertClient()
  const { data, error } = await supabase
    .from(TABLE).select('*').is('deleted_at', null).order('sort_order', { ascending: true })
  if (error) throw error
  return data.map(rowToLesson)
}

export async function createLesson(lesson) {
  assertClient()
  // 末尾に追加する。現在（未削除）の最大 sort_order + 1（0 件なら 1）。sort_order は 1 始まり。
  const { data: maxRows, error: maxErr } = await supabase
    .from(TABLE).select('sort_order').is('deleted_at', null)
    .order('sort_order', { ascending: false }).limit(1)
  if (maxErr) throw maxErr
  const nextOrder = maxRows.length ? maxRows[0].sort_order + 1 : 1

  const { data, error } = await supabase
    .from(TABLE).insert({ ...lessonToRow(lesson), sort_order: nextOrder }).select().single()
  if (error) throw error
  return rowToLesson(data)
}

export async function updateLesson(id, lesson) {
  assertClient()
  const { data, error } = await supabase
    .from(TABLE).update({ ...lessonToRow(lesson), updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) throw error
  return rowToLesson(data)
}

// 論理削除：物理削除せず deleted_at に時刻を入れる。お題画像はそのまま残す。
export async function deleteLesson(id) {
  assertClient()
  const { error } = await supabase
    .from(TABLE).update({ deleted_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

// 並び替え結果を反映する。id の配列を受け取り、その順に sort_order を 1..n で振り直す。
// 1 トランザクションで完結する RPC（reorder_lessons）を使い、途中失敗で順序が壊れないようにする。
export async function reorderLessons(orderedIds) {
  assertClient()
  const { error } = await supabase.rpc('reorder_lessons', { ids: orderedIds })
  if (error) throw error
}

// ── お題画像アップロード（公開バケット） ───────
// CDN キャッシュ汚染と URL 列挙を避けるため、毎回ユニークなファイル名で保存する。
export async function uploadRefImage(file) {
  assertClient()
  const ext = (file.name.split('.').pop() || 'png').toLowerCase()
  const uid = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`)
  const path = `${uid}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

// 公開 URL からバケット内のパスを割り出して画像を削除する（不要になった画像の掃除）。
// クリーンアップ用途なので失敗しても例外は投げず警告に留める。自バケット以外の URL は無視。
export async function deleteRefImage(refUrl) {
  if (!supabase || !refUrl) return
  const marker = `/object/public/${BUCKET}/`
  const i = refUrl.indexOf(marker)
  if (i === -1) return
  const path = refUrl.slice(i + marker.length)
  if (!path) return
  try {
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) throw error
  } catch (e) {
    console.warn('[lessons] 旧お題画像の削除に失敗しました（無視して継続）。', e)
  }
}

// ── 認証（Supabase Auth） ─────────────────────
export async function signIn(email, password) {
  assertClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

export async function signOut() {
  assertClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export function onAuthChange(cb) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session))
  return () => data.subscription.unsubscribe()
}
