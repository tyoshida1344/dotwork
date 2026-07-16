import { reactive } from 'vue'

// テーマ対応の共通ダイアログのための状態。BaseDialog.vue がこの状態を描画し、
// showAlert / showConfirm / showPrompt が Promise を返す
// （ネイティブの alert / confirm / prompt を置き換える）。
export const dialogState = reactive({
  open: false,
  kind: 'alert', // 'alert' | 'confirm' | 'prompt'
  message: '',
  defaultValue: '',
})

let resolver = null

function open(kind, message, defaultValue = '') {
  // 直前のダイアログが未応答なら、開き直す前にキャンセル扱いで解決しておく
  if (resolver) { const prev = resolver; resolver = null; prev(null) }
  dialogState.kind = kind
  dialogState.message = message
  dialogState.defaultValue = defaultValue
  dialogState.open = true
  return new Promise(resolve => { resolver = resolve })
}

// alert 相当（OK のみ）。await しなくてよい（表示しっぱなしで先へ進める）。
export function showAlert(message) { return open('alert', message) }
// confirm 相当（OK=true / キャンセル=false）
export function showConfirm(message) { return open('confirm', message) }
// prompt 相当（OK=入力文字列 / キャンセル=null）
export function showPrompt(message, defaultValue = '') { return open('prompt', message, defaultValue) }

// BaseDialog からの応答（OK / キャンセル）を Promise に橋渡しする
export function resolveDialog(value) {
  dialogState.open = false
  const r = resolver
  resolver = null
  if (r) r(value)
}
