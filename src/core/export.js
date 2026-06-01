import { S } from './state.js'

export function exportPNG() {
  const scale = 16
  const ec = document.createElement('canvas')
  ec.width = S.cols * scale; ec.height = S.rows * scale
  const ex = ec.getContext('2d')
  for (let i = 0; i < S.pixels.length; i++) {
    if (!S.pixels[i]) continue
    ex.fillStyle = S.pixels[i]
    ex.fillRect((i % S.cols) * scale, Math.floor(i / S.cols) * scale, scale, scale)
  }
  const a = document.createElement('a')
  a.download = 'sprite.png'
  a.href = ec.toDataURL('image/png')
  a.click()
}
