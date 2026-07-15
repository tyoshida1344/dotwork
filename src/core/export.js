import { S } from './state.js'
import { ui } from './ui.js'

// ピクセル配列を PNG にしてダウンロードする。エディタ（現在のキャンバス）と
// マイページ（保存済みの作品）で共用する。scale はドット1マスの出力ピクセル数。
// 背景色・補助線は含めない。
export function exportPixelsPNG(pixels, cols, rows, filename = 'dotwork.png', scale = 1) {
  const ec = document.createElement('canvas')
  ec.width = cols * scale; ec.height = rows * scale
  const ex = ec.getContext('2d')
  for (let i = 0; i < pixels.length; i++) {
    if (!pixels[i]) continue
    ex.fillStyle = pixels[i]
    ex.fillRect((i % cols) * scale, Math.floor(i / cols) * scale, scale, scale)
  }
  const a = document.createElement('a')
  a.download = filename
  a.href = ec.toDataURL('image/png')
  a.click()
}

export function exportPNG() {
  exportPixelsPNG(S.pixels, S.cols, S.rows, 'dotwork.png', ui.exportScale)
}
