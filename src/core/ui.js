import { reactive } from 'vue'

// お題パネルの表示位置（キャンバスの左右）。前回の選択を localStorage から復元する。
const ASIDE_SIDE_KEY = 'dotwork.lessonAsideSide'
const savedAsideSide = localStorage.getItem(ASIDE_SIDE_KEY) === 'right' ? 'right' : 'left'

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
})

// お題パネルの左右を切り替えて保存する。
export function toggleLessonAsideSide() {
  ui.lessonAsideSide = ui.lessonAsideSide === 'right' ? 'left' : 'right'
  localStorage.setItem(ASIDE_SIDE_KEY, ui.lessonAsideSide)
}
