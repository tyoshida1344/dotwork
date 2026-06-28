import { reactive } from 'vue'
import { S } from './state.js'
import { ui } from './ui.js'
import { resize } from './canvas.js'
import { clearHistory } from './history.js'

// レッスン定義は src/assets/lessons/lessons.json に「配列」で一元管理する。
// 1ファイルで全レッスンの一覧になり、丸ごと fetch / localStorage への保存など永続化しやすい。
// お題の画像はレベル別フォルダ（lv1/ lv2/ …）に置き、JSON の ref からは
// lessons/ 以下の相対パス（例: "lv1/diamond-ref.svg"）で参照する。
import lessonDefs from '../assets/lessons/lessons.json'

// SVG をビルド時に再帰収集し「lessons/ 以下の相対パス → バンドル後 URL」のマップを作る
const assets = import.meta.glob('../assets/lessons/**/*.svg', { eager: true, query: '?url', import: 'default' })
const assetUrl = {}
for (const [path, url] of Object.entries(assets)) {
  assetUrl[path.split('/lessons/')[1]] = url   // 例: "lv1/diamond-ref.svg"
}

// palette[0] が開始時の選択色になる（縁取り色は末尾に置く）。
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
