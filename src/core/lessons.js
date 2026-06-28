import { reactive } from 'vue'
import { S } from './state.js'
import { ui } from './ui.js'
import { resize } from './canvas.js'
import { clearHistory } from './history.js'

import lessonDefs from '../assets/lessons/lessons.json'

// Supabase が設定されているか（env のみで判定）。
// ここでは supabase.js を静的 import しない。@supabase/supabase-js を
// エディタの初期バンドルから切り離し、必要になった時だけ動的 import するため。
const configured = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

// SVG をビルド時に再帰収集し「lessons/ 以下の相対パス → バンドル後 URL」のマップを作る
const assets = import.meta.glob('../assets/lessons/**/*.svg', { eager: true, query: '?url', import: 'default' })
const assetUrl = {}
for (const [path, url] of Object.entries(assets)) {
  assetUrl[path.split('/lessons/')[1]] = url   // 例: "lv1/diamond-ref.svg"
}

// Supabase 未設定（.env なし）時のフォールバック。バンドルの lessons.json から組み立てる。
// レベル順に安定ソートし（同レベル内は JSON の並び順を維持）、ref をバンドル URL に解決する。
function bundledLessons() {
  return [...lessonDefs]
    .sort((a, b) => a.level - b.level)
    .map(def => {
      const ref = assetUrl[def.ref]
      // JSON の ref と実ファイルがズレていると <img> が無言で欠ける。開発時に気づけるよう警告する
      if (!ref) console.warn(`[lessons] お題画像が見つかりません: "${def.ref}"（id: ${def.id}）`)
      return { ...def, ref }
    })
}

// 表示用のレッスン一覧。ensureLessons() / loadLessons() で読み込む。
// リアクティブ配列なので、読み込み完了時に LessonPage の v-for が自動更新される。
export const LESSONS = reactive([])

let loaded = false   // 読み込み済みか（ensureLessons の重複取得を防ぐ）

// レッスン一覧を強制的に読み込む（Supabase 設定時は API、未設定/失敗時はバンドル定義）。
export async function loadLessons() {
  let list
  if (configured) {
    try {
      const { fetchLessons } = await import('./lessonsApi.js')
      list = await fetchLessons()
    } catch (e) {
      console.warn('[lessons] Supabase からの取得に失敗。バンドル定義にフォールバックします。', e)
      list = bundledLessons()
    }
  } else {
    list = bundledLessons()
  }
  LESSONS.splice(0, LESSONS.length, ...list)
  loaded = true
  return LESSONS
}

// まだ読み込んでいなければ読み込む（レッスン画面を開いたときに呼ぶ）。
export function ensureLessons() {
  return loaded ? Promise.resolve(LESSONS) : loadLessons()
}

// 一覧を「未読込」に戻す。管理画面で更新した後に呼ぶと、次に開いたとき最新を取り直す。
export function invalidateLessons() {
  loaded = false
}

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
