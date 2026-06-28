import { reactive } from 'vue'
import { S } from './state.js'
import { ui } from './ui.js'
import { resize } from './canvas.js'
import { clearHistory } from './history.js'

import lessonDefs from '../assets/lessons/lessons.json'

// SVG をビルド時に再帰収集し「lessons/ 以下の相対パス → バンドル後 URL」のマップを作る
const assets = import.meta.glob('../assets/lessons/**/*.svg', { eager: true, query: '?url', import: 'default' })
const assetUrl = {}
for (const [path, url] of Object.entries(assets)) {
  assetUrl[path.split('/lessons/')[1]] = url   // 例: "lv1/diamond-ref.svg"
}

// 同一レベルに複数レッスンを置ける。レベル順に安定ソートし（同レベル内は JSON の並び順を維持）、
// ref（お題画像）のファイル名をバンドル URL に解決する。
export const LESSONS = [...lessonDefs]
  .sort((a, b) => a.level - b.level)
  .map(def => {
    const ref = assetUrl[def.ref]
    // JSON の ref と実ファイルがズレていると <img> が無言で欠ける。開発時に気づけるよう警告する
    if (!ref) console.warn(`[lessons] お題画像が見つかりません: "${def.ref}"（id: ${def.id}）`)
    return { ...def, ref }
  })

// レッスンモードの状態。アンドゥ履歴・PNG 書き出しには含めない揮発性状態。
export const lessonState = reactive({
  active: null,        // 進行中のレッスン定義 | null
})

// レッスンを開始する。現在の描画をクリアし、サイズ・パレットをレッスンに固定する。
// 注意: ヘッダーの SIZE 変更（resetCanvas）と違い、レッスンのサイズは既定値として保存しない。
export function startLesson(lesson) {
  S.cols = S.rows = lesson.size
  S.pixels = new Array(lesson.size * lesson.size).fill(null)
  clearHistory()
  S.palette = [...lesson.palette]
  // レッスンを始めた直後にすぐ塗り始められるよう、色セットの先頭の色を選択状態にする
  S.color = lesson.palette[0]
  ui.palKey = 'lesson'
  ui.lessonPageOpen = false

  lessonState.active = lesson
  resize()
}

// レッスンを終了して通常モードへ戻る。描いた絵・サイズ・パレットはそのまま残す。
export function exitLesson() {
  lessonState.active = null
}
