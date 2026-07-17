import { reactive } from 'vue'
import { S } from '~/core/state.js'
import { ui } from '~/core/ui.js'
import { PAL } from '~/core/palette.js'
import { clearHistory } from '~/core/history.js'
import { lessonState, ensureLessons } from '~/core/lessons.js'

// 保存した作品とエディタの橋渡し。ここでは supabase.js / worksApi.js を静的 import しない
// （@supabase/supabase-js を初期バンドルから外すため。lessons.js と同じ作法）。

// エディタの状態。アンドゥ履歴・PNG 書き出しには含めない揮発性状態。
export const worksState = reactive({
  currentId: null, // 編集中の作品 id（マイページから開いた／保存済み）| null。null なら未保存の新規
  currentTitle: '',
  saving: false,
})

// エディタの状態 → 保存形。作品の保存にも、OAuth リダイレクト前の一時退避にも使う。
// 背景色・選択中の色・参照画像・ズーム倍率・アンドゥ履歴は保存しない。
export function snapshotEditor() {
  return {
    cols: S.cols,
    rows: S.rows,
    pixels: [...S.pixels],
    palette: [...S.palette],
    headUnits: S.headUnits,
    vDivUnits: S.vDivUnits,
    lessonId: lessonState.active?.id ?? null,
  }
}

function isValidSnapshot(w) {
  return !!w
    && Number.isInteger(w.cols) && Number.isInteger(w.rows) && w.cols > 0 && w.rows > 0
    && Array.isArray(w.pixels) && w.pixels.length === w.cols * w.rows
    && Array.isArray(w.palette)
}

// 復元した色セットが既定パレットのどれかなら、その選択肢を PALETTE のドロップダウンに出す。
// 一致しなければ作品固有の色セット（'work'）として扱う。レッスン中は 'lesson'。
function palKeyFor(palette, lesson) {
  if (lesson) return 'lesson'
  const key = Object.keys(PAL).find(k =>
    PAL[k].length === palette.length && PAL[k].every((c, i) => c === palette[i]))
  return key ?? 'work'
}

// 保存形 → エディタの状態。描画（resize / drawPx）は呼び出し元が行う
// （マイページから開いたときはキャンバスがまだマウントされていないため）。
export async function applySnapshot(w) {
  if (!isValidSnapshot(w)) throw new Error('作品のデータが壊れています。')

  // レッスンの復元は先に済ませる（お題パネルの表示・色セットの固定に効く）。
  // 紐づいたレッスンが非公開になっていたら通常モードで開く。
  let lesson = null
  if (w.lessonId != null) {
    const list = await ensureLessons()
    lesson = list.find(l => l.id === w.lessonId) ?? null
  }
  lessonState.active = lesson

  // 前のレッスンのお題オーバーレイは持ち越さない
  if (ui.lessonOverlayOn) { S.refImg = null; ui.lessonOverlayOn = false }

  S.cols = w.cols
  S.rows = w.rows
  S.pixels = [...w.pixels]
  S.palette = [...w.palette]
  S.headUnits = w.headUnits ?? 0
  S.vDivUnits = w.vDivUnits ?? 0
  S.color = w.palette[0] ?? S.color
  ui.palKey = palKeyFor(S.palette, lesson)
  clearHistory()
}

// 作品を開いて編集を再開する（マイページから呼ぶ）。
export async function openWork(work) {
  await applySnapshot(work)
  worksState.currentId = work.id
  worksState.currentTitle = work.title
}

// 公開ギャラリーの作品を「お手本」として今のキャンバスに参照画像で重ねる。
// ピクセルから画像を作って S.refImg に載せるだけで、REFERENCE パネルで手動読み込みしたのと同じ状態にする。
// 描画は呼ばない（ギャラリー画面から呼ばれ、エディタのキャンバスはまだマウントされていないため）。
// 呼び出し側はこの後エディタ（/）へ遷移し、TheCanvas の onMounted が overlay ごと描画する。
export function applyReferenceFromPixels(pixels, cols, rows) {
  return new Promise(resolve => {
    const cv = document.createElement('canvas')
    cv.width = cols
    cv.height = rows
    const x = cv.getContext('2d')
    for (let i = 0; i < pixels.length; i++) {
      const c = pixels[i]
      if (!c) continue
      x.fillStyle = c
      x.fillRect(i % cols, Math.floor(i / cols), 1, 1)
    }
    const img = new Image()
    img.onload = () => {
      S.refImg = img
      if (S.overlay <= 0) S.overlay = 0.5 // 全く見えない設定だったら見える濃さに戻す
      ui.lessonOverlayOn = false // 手動の参照画像扱い（お題オーバーレイではない）
      resolve()
    }
    img.onerror = () => resolve()
    img.src = cv.toDataURL()
  })
}

// 「無題 1」「無題 2」… と重ならない名前を作る
export function nextUntitledTitle(titles) {
  let max = 0
  for (const t of titles) {
    const m = /^無題 (\d+)$/.exec(t)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `無題 ${max + 1}`
}

// 現在のキャンバスを保存する。
// asNew=false かつ編集中の作品があればそこへ上書き、それ以外は新規作成（自動命名・上限チェック）。
export async function saveWork({ asNew = false } = {}) {
  const api = await import('./worksApi.js')
  const snap = snapshotEditor()
  worksState.saving = true
  try {
    if (!asNew && worksState.currentId != null) {
      const w = await api.updateWork(worksState.currentId, snap)
      worksState.currentTitle = w.title
      return w
    }
    // 新規保存。上限は DB のトリガーが強制するが、先に見て理由を伝える
    const titles = await api.fetchWorkTitles()
    if (titles.length >= api.WORK_LIMIT) {
      throw new Error(`保存できる作品は ${api.WORK_LIMIT} 件までです。マイページで不要な作品を削除してください。`)
    }
    const w = await api.createWork({ ...snap, title: nextUntitledTitle(titles.map(t => t.title)) })
    worksState.currentId = w.id
    worksState.currentTitle = w.title
    return w
  } finally {
    worksState.saving = false
  }
}

// ── OAuth リダイレクトをまたぐ一時退避 ─────────
// Google の認可画面へ遷移するとページごと捨てられ、メモリ上のキャンバスは失われる。
// 出る前に sessionStorage へ退避し、戻ってきたエディタの初期化時に復元する。
const STASH_KEY = 'dotwork.editorStash'

export function stashEditor() {
  try {
    sessionStorage.setItem(STASH_KEY, JSON.stringify({
      ...snapshotEditor(),
      currentId: worksState.currentId,
      currentTitle: worksState.currentTitle,
    }))
  } catch (e) {
    console.warn('[works] 編集中のキャンバスを退避できませんでした。', e)
  }
}

// 退避したが結局リダイレクトしなかったとき用（古いスナップショットを残さない）
export function clearStash() {
  try { sessionStorage.removeItem(STASH_KEY) } catch { /* 消せなくても実害はない */ }
}

// 退避したキャンバスがあれば復元して true を返す（描画は呼び出し元が行う）。
export async function restoreStashedEditor() {
  let raw = null
  try {
    raw = sessionStorage.getItem(STASH_KEY)
    if (raw) sessionStorage.removeItem(STASH_KEY)
  } catch { return false } // sessionStorage 不可（プライベートモード等）
  if (!raw) return false

  try {
    const snap = JSON.parse(raw)
    await applySnapshot(snap)
    worksState.currentId = snap.currentId ?? null
    worksState.currentTitle = snap.currentTitle ?? ''
    return true
  } catch (e) {
    console.warn('[works] 退避したキャンバスを復元できませんでした。', e)
    return false
  }
}
