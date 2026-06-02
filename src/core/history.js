import { S } from './state.js'

// アンドゥ履歴は reactive(S) の外（素の配列）で保持する。
// 大量のピクセルスナップショットを Proxy 化する無駄を避けるため。
// 描画の呼び出しは呼び出し元（TheCanvas.vue / App.vue）が担う。
let undoStack = []   // pixels[][] — 最大60手
let redoStack = []

export function clearHistory() {
  undoStack = []
  redoStack = []
}

export function saveUndo() {
  undoStack.push([...S.pixels])
  if (undoStack.length > 60) undoStack.shift()
  redoStack = []
}

// pixels を復元して true を返す。呼び出し元が drawPx() を呼ぶこと
export function undo() {
  if (!undoStack.length) return false
  redoStack.push([...S.pixels])
  S.pixels = undoStack.pop()
  return true
}

export function redo() {
  if (!redoStack.length) return false
  undoStack.push([...S.pixels])
  S.pixels = redoStack.pop()
  return true
}

export function clearAll() {
  saveUndo()
  S.pixels = new Array(S.cols * S.rows).fill(null)
  // 呼び出し元が drawPx() を呼ぶこと
}
