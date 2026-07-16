import { reactive } from 'vue'

// お題パネルの表示位置（キャンバスの左右）。前回の選択を localStorage から復元する。
const ASIDE_SIDE_KEY = 'dotwork.lessonAsideSide'
const savedAsideSide = localStorage.getItem(ASIDE_SIDE_KEY) === 'right' ? 'right' : 'left'

// PNG 書き出しの倍率。EXPORT パネルの選択肢と一致させること。
export const EXPORT_SCALES = [1, 2, 4, 8, 16]
const EXPORT_SCALE_KEY = 'dotwork.exportScale'

// 前回選択した書き出し倍率を localStorage から復元（未保存・無効値なら 1）
function loadExportScale() {
  try {
    const n = parseInt(localStorage.getItem(EXPORT_SCALE_KEY), 10)
    if (EXPORT_SCALES.includes(n)) return n
  } catch { /* localStorage 不可（プライベートモード等）は既定値へ */ }
  return 1
}

// キャンバス描画やアンドゥ履歴に含める必要がない UI 固有の状態
export const ui = reactive({
  hoverPos:   null,    // [x, y] | null
  hoverColor: null,    // hex | null（ホバー中のマスの色。透明なら null）
  guidePageOpen: false,
  cropOpen: false,     // 画像→ドット変換のクロップオーバーレイ表示
  panelOpen: false,    // スマホ：サイドバー（パネル）ドロワーの開閉
  palKey: 'pico8',     // パレットドロップダウンの選択値
  lessonPageOpen: false, // レッスン選択の全画面オーバーレイ表示
  lessonAsideSide: savedAsideSide, // 'left' | 'right'：お題パネルをキャンバスのどちら側に出すか
  lessonOverlayOn: false, // お題をキャンバス背景に透過表示中か（参照画像オーバーレイの枠を流用）
  lessonOverlayLoading: false, // お題「背景に重ねる」の画像を読み込み中か
  exportScale: loadExportScale(), // PNG 書き出しの倍率（EXPORT パネル）
})

// お題パネルの左右を切り替えて保存する。
export function toggleLessonAsideSide() {
  ui.lessonAsideSide = ui.lessonAsideSide === 'right' ? 'left' : 'right'
  localStorage.setItem(ASIDE_SIDE_KEY, ui.lessonAsideSide)
}

// 書き出し倍率を選んで保存する（次回起動時も復元する）。
export function setExportScale(n) {
  ui.exportScale = n
  try { localStorage.setItem(EXPORT_SCALE_KEY, String(n)) } catch { /* 保存不可は無視 */ }
}
