<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { S } from '../core/state.js'
import { ui } from '../core/ui.js'
import { initContexts, resize, drawPx, drawGrid, drawHover, drawFillPreview } from '../core/canvas.js'
import { applyDraw, floodFill, getFillArea, bres, idx, inB, setPx } from '../core/tools.js'
import { saveUndo } from '../core/history.js'

const bgcvEl   = ref(null)
const cvEl     = ref(null)
const gridcvEl = ref(null)
const cwrapEl  = ref(null)

// ドラッグ中の一時状態（アンドゥ履歴・reactive S には含めない）
let painting  = false
let lastCell  = null
let lineStart = null
let lineSnap  = null   // 直線ドラッグ開始時のスナップショット

function cellAt(e) {
  const r = gridcvEl.value.getBoundingClientRect()
  return [
    Math.floor((e.clientX - r.left) / S.cell),
    Math.floor((e.clientY - r.top)  / S.cell),
  ]
}

function onMousedown(e) {
  if (e.button !== 0) return
  painting = true
  const [x, y] = cellAt(e)

  if (S.tool === 'picker') {
    const c = S.pixels[idx(x, y)]
    if (c) S.color = c
    painting = false; return
  }
  if (S.tool === 'bucket') {
    saveUndo(); floodFill(x, y, S.color); drawPx()
    painting = false; return
  }
  if (S.tool === 'line') {
    lineStart = [x, y]; lineSnap = [...S.pixels]; return
  }

  saveUndo()
  applyDraw(x, y)
  lastCell = [x, y]
  drawPx()
}

function onMousemove(e) {
  const [x, y] = cellAt(e)
  const inside = inB(x, y)

  if (!painting) {
    ui.hoverPos   = inside ? [x, y] : null
    ui.hoverColor = inside ? (S.pixels[idx(x, y)] ?? null) : null
    if (S.tool === 'bucket' && inside) {
      drawFillPreview(getFillArea(x, y), x, y)
    } else {
      drawHover(inside ? x : null, inside ? y : null)
    }
    return
  }

  if (S.tool === 'line' && lineStart) {
    S.pixels = [...lineSnap]
    bres(lineStart[0], lineStart[1], x, y).forEach(([px, py]) => setPx(px, py, S.color))
    drawPx()
  } else {
    if (lastCell) {
      const [lx, ly] = lastCell
      if (lx !== x || ly !== y) {
        bres(lx, ly, x, y).slice(1).forEach(([px, py]) => applyDraw(px, py))
      }
    } else {
      applyDraw(x, y)
    }
    lastCell = [x, y]
    drawPx()
  }

  // 描画後に色を取得することで、塗った直後の色を正確に反映する
  ui.hoverPos   = inside ? [x, y] : null
  ui.hoverColor = inside ? (S.pixels[idx(x, y)] ?? null) : null
  drawHover(inside ? x : null, inside ? y : null)
}

function onMouseleave() {
  ui.hoverPos   = null
  ui.hoverColor = null
  drawHover(null, null)
}

function onWindowMouseup(e) {
  if (!painting) return

  if (S.tool === 'line' && lineStart) {
    const [x, y] = cellAt(e)
    S.pixels = [...lineSnap]
    if (inB(x, y)) {
      saveUndo()
      bres(lineStart[0], lineStart[1], x, y).forEach(([px, py]) => setPx(px, py, S.color))
    }
    lineStart = null; lineSnap = null
    drawPx()
  }

  painting = false; lastCell = null
}

// canvas の見た目に影響する状態を watch
// 補助線系は drawHover 経由（内部で drawGrid を呼ぶ）でホバー枠を維持する
watch(() => S.overlay,   drawPx)
watch(() => S.refImg,    drawPx)
watch(() => S.headUnits, () => drawHover(ui.hoverPos?.[0] ?? null, ui.hoverPos?.[1] ?? null))
watch(() => S.vDivUnits, () => drawHover(ui.hoverPos?.[0] ?? null, ui.hoverPos?.[1] ?? null))

onMounted(() => {
  initContexts(bgcvEl.value, cvEl.value, gridcvEl.value, cwrapEl.value)
  resize()
  window.addEventListener('mouseup', onWindowMouseup)
})
onUnmounted(() => {
  window.removeEventListener('mouseup', onWindowMouseup)
})
</script>

<template>
  <div id="carea">
    <div ref="cwrapEl" id="cwrap">
      <canvas ref="bgcvEl"   id="bgcv"></canvas>
      <canvas ref="cvEl"     id="cv"></canvas>
      <canvas ref="gridcvEl" id="gridcv"
        @mousedown="onMousedown"
        @mousemove="onMousemove"
        @mouseleave="onMouseleave"
      ></canvas>
    </div>
  </div>
</template>
