<script setup>
import { reactive, ref, computed, watch, nextTick } from 'vue'
import { S } from '~/core/state.js'
import { ui } from '~/core/ui.js'
import { saveUndo } from '~/core/history.js'
import { drawPx } from '~/core/canvas.js'
import { imageToPixels } from '~/core/palette.js'
import BaseButton from '~/components/atoms/BaseButton.vue'
import BaseModal from '~/components/templates/BaseModal.vue'

const imgEl = ref(null)
const scale = ref(1)        // 表示スケール（display px ÷ image px）
const dispW = ref(0)
const dispH = ref(0)

// クロップ矩形（画像ピクセル座標）
const crop = reactive({ x: 0, y: 0, w: 0, h: 0 })

// 結果はキャンバスサイズに収めるため、クロップ枠の比はキャンバス比に固定
const aspect = computed(() => S.cols / S.rows)

function natSize() {
  const img = S.refImg
  return [img.naturalWidth || img.width, img.naturalHeight || img.height]
}

// オーバーレイを開いたら表示サイズと初期クロップを計算
watch(() => ui.cropOpen, open => {
  if (open) {
    window.addEventListener('keydown', onKey)
    if (S.refImg) nextTick(initStage)
  } else {
    window.removeEventListener('keydown', onKey)
  }
})

function initStage() {
  const [natW, natH] = natSize()
  const maxW = window.innerWidth * 0.6
  const maxH = window.innerHeight * 0.6
  scale.value = Math.min(maxW / natW, maxH / natH)
  dispW.value = natW * scale.value
  dispH.value = natH * scale.value
  // 初期クロップ：キャンバス比の最大内接矩形を中央に
  let w = natW
  let h = w / aspect.value
  if (h > natH) { h = natH; w = h * aspect.value }
  crop.w = w
  crop.h = h
  crop.x = (natW - w) / 2
  crop.y = (natH - h) / 2
}

const boxStyle = computed(() => ({
  left:   crop.x * scale.value + 'px',
  top:    crop.y * scale.value + 'px',
  width:  crop.w * scale.value + 'px',
  height: crop.h * scale.value + 'px',
}))

// ── ドラッグ処理 ──────────────────────────────
let drag = null

function startMove(e) {
  e.preventDefault()
  drag = { mode: 'move', sx: e.clientX, sy: e.clientY, ox: crop.x, oy: crop.y }
  addDragListeners()
}

function startResize(handle, e) {
  e.preventDefault()
  e.stopPropagation()
  // アンカー＝ドラッグする角の対角（画像座標）。リサイズ中は固定する
  const anchors = {
    nw: [crop.x + crop.w, crop.y + crop.h],
    ne: [crop.x,          crop.y + crop.h],
    sw: [crop.x + crop.w, crop.y],
    se: [crop.x,          crop.y],
  }
  drag = { mode: 'resize', ax: anchors[handle][0], ay: anchors[handle][1] }
  addDragListeners()
}

function addDragListeners() {
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

function onMove(e) {
  if (!drag) return
  const [natW, natH] = natSize()
  if (drag.mode === 'move') {
    const dx = (e.clientX - drag.sx) / scale.value
    const dy = (e.clientY - drag.sy) / scale.value
    crop.x = Math.max(0, Math.min(natW - crop.w, drag.ox + dx))
    crop.y = Math.max(0, Math.min(natH - crop.h, drag.oy + dy))
    return
  }
  // resize：ポインタを画像座標に変換
  const rect = imgEl.value.getBoundingClientRect()
  const px = Math.max(0, Math.min(natW, (e.clientX - rect.left) / scale.value))
  const py = Math.max(0, Math.min(natH, (e.clientY - rect.top) / scale.value))
  const dirX = px >= drag.ax ? 1 : -1
  const dirY = py >= drag.ay ? 1 : -1
  // ポインタを内包する向きへ拡張してから比を固定
  let w = Math.abs(px - drag.ax)
  let h = Math.abs(py - drag.ay)
  if (w / aspect.value >= h) h = w / aspect.value
  else w = h * aspect.value
  // 画像内に収める（アンカーから端までの余地で制限）
  const maxW = dirX > 0 ? natW - drag.ax : drag.ax
  const maxH = dirY > 0 ? natH - drag.ay : drag.ay
  const limit = Math.min(maxW, maxH * aspect.value)
  w = Math.min(w, limit)
  w = Math.max(w, Math.min(limit, 6))   // 最小6px（余地が無ければ余地まで）
  h = w / aspect.value
  crop.w = w
  crop.h = h
  crop.x = dirX > 0 ? drag.ax : drag.ax - w
  crop.y = dirY > 0 ? drag.ay : drag.ay - h
}

function onUp() {
  drag = null
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
}

function onKey(e) {
  if (e.key === 'Escape') cancel()
}

// ── 確定 / キャンセル ─────────────────────────
function apply() {
  if (!S.refImg) return
  saveUndo()
  S.pixels = imageToPixels(S.refImg, { x: crop.x, y: crop.y, w: crop.w, h: crop.h }, S.cols, S.rows)
  drawPx()
  ui.cropOpen = false
}

function cancel() {
  ui.cropOpen = false
}
</script>

<template>
  <BaseModal :open="ui.cropOpen" @close="cancel">
    <div v-if="S.refImg" class="crop-card">
      <div class="crop-title">画像をドットに変換</div>
      <div class="crop-hint">
        枠を動かして取り込む範囲を選びます（枠の比率は {{ S.cols }}×{{ S.rows }} に固定）。
        確定すると現在のキャンバスを上書きします。
      </div>

      <div class="cropstage" :style="{ width: dispW + 'px', height: dispH + 'px' }">
        <img
          ref="imgEl"
          :src="S.refImg.src"
          :style="{ width: dispW + 'px', height: dispH + 'px' }"
          alt="source"
          draggable="false"
        >
        <div class="cropbox" :style="boxStyle" @pointerdown="startMove">
          <div class="crop-handle nw" @pointerdown="startResize('nw', $event)"></div>
          <div class="crop-handle ne" @pointerdown="startResize('ne', $event)"></div>
          <div class="crop-handle sw" @pointerdown="startResize('sw', $event)"></div>
          <div class="crop-handle se" @pointerdown="startResize('se', $event)"></div>
        </div>
      </div>

      <div class="crop-actions">
        <BaseButton @click="cancel">キャンセル</BaseButton>
        <BaseButton variant="accent" @click="apply">▦ この範囲を反映</BaseButton>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.crop-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 13px;
  max-width: 92vw;
  max-height: 92vh;
}
.crop-title {
  font-family: 'Silkscreen', monospace;
  color: var(--amber);
  font-size: 15px;
  letter-spacing: 1px;
}
.crop-hint { color: var(--muted); font-size: 13px; line-height: 1.55; max-width: 60vw; }
.cropstage {
  position: relative;
  overflow: hidden;
  align-self: center;
  line-height: 0;
  background: var(--bg);
  touch-action: none;
}
.cropstage img {
  display: block;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  -webkit-user-drag: none;
}
.cropbox {
  position: absolute;
  border: 1px solid var(--amber);
  box-shadow: 0 0 0 4000px rgba(0, 0, 0, 0.55);
  cursor: move;
  box-sizing: border-box;
}
.crop-handle {
  position: absolute;
  width: 12px; height: 12px;
  background: var(--amber);
  border: 1px solid var(--bg);
  border-radius: 2px;
}
.crop-handle.nw { top: -6px;    left: -6px;   cursor: nwse-resize; }
.crop-handle.ne { top: -6px;    right: -6px;  cursor: nesw-resize; }
.crop-handle.sw { bottom: -6px; left: -6px;   cursor: nesw-resize; }
.crop-handle.se { bottom: -6px; right: -6px;  cursor: nwse-resize; }
.crop-actions { display: flex; gap: 8px; justify-content: flex-end; }
</style>
