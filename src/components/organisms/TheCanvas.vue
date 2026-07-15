<script setup>
import { ref, onMounted, watch } from 'vue'
import { S } from '~/core/state.js'
import { ui, toggleLessonAsideSide } from '~/core/ui.js'
import { initContexts, resize, drawPx, drawGrid, drawHover, drawFillPreview, zoomCanvas, drawBg } from '~/core/canvas.js'
import { applyDraw, floodFill, getFillArea, bres, idx, inB, setPx } from '~/core/tools.js'
import { saveUndo } from '~/core/history.js'
import { lessonState, exitLesson, setLessonOverlay } from '~/core/lessons.js'

const bgcvEl   = ref(null)
const cvEl     = ref(null)
const gridcvEl = ref(null)
const cwrapEl  = ref(null)

// ドラッグ中の一時状態（アンドゥ履歴・reactive S には含めない）
let painting      = false
let strokeTool    = null   // このストロークで使うツール（押したボタンで決まる）
let lastCell      = null
let lineStart     = null
let lineSnap      = null   // 直線ドラッグ開始時のスナップショット
let activePointer = null   // 描画中のポインタID（マルチタッチの2本目以降を無視するため）

function cellAt(e) {
  const r = gridcvEl.value.getBoundingClientRect()
  return [
    Math.floor((e.clientX - r.left) / S.cell),
    Math.floor((e.clientY - r.top)  / S.cell),
  ]
}

function endStroke() {
  painting = false
  lastCell = null
  strokeTool = null
  activePointer = null
}

// Pointer Events に統一（マウス／タッチ／ペン共通）。
// マウスの button: 0=左→toolL、2=右→toolR。タッチ/ペンは button=0 なので toolL。
function onPointerdown(e) {
  if (e.button !== 0 && e.button !== 2) return
  if (painting) return   // すでに描画中の指/ボタンがあれば無視
  const tool = e.button === 2 ? S.toolR : S.toolL
  const [x, y] = cellAt(e)

  // 単発ツール：ストロークを開始せず即確定
  if (tool === 'picker') {
    const c = S.pixels[idx(x, y)]
    if (c) S.color = c
    return
  }
  if (tool === 'bucket') {
    saveUndo(); floodFill(x, y, S.color); drawPx()
    return
  }

  // 連続ツール（ペン/消し/ディザ/直線）：ポインタを捕捉して枠外まで追従させる
  gridcvEl.value.setPointerCapture?.(e.pointerId)
  activePointer = e.pointerId
  strokeTool = tool
  painting = true

  if (tool === 'line') {
    lineStart = [x, y]; lineSnap = [...S.pixels]
    return
  }

  saveUndo()
  applyDraw(x, y, tool)
  lastCell = [x, y]
  drawPx()
}

function onPointermove(e) {
  if (painting && e.pointerId !== activePointer) return   // 別の指の移動は無視
  const [x, y] = cellAt(e)
  const inside = inB(x, y)

  if (!painting) {
    ui.hoverPos   = inside ? [x, y] : null
    ui.hoverColor = inside ? (S.pixels[idx(x, y)] ?? null) : null
    // ホバー時のプレビューは左ボタン（主操作）のツールを基準にする
    if (S.toolL === 'bucket' && inside) {
      drawFillPreview(getFillArea(x, y), x, y)
    } else {
      drawHover(inside ? x : null, inside ? y : null)
    }
    return
  }

  if (strokeTool === 'line' && lineStart) {
    S.pixels = [...lineSnap]
    bres(lineStart[0], lineStart[1], x, y).forEach(([px, py]) => setPx(px, py, S.color))
    drawPx()
  } else {
    if (lastCell) {
      const [lx, ly] = lastCell
      if (lx !== x || ly !== y) {
        bres(lx, ly, x, y).slice(1).forEach(([px, py]) => applyDraw(px, py, strokeTool))
      }
    } else {
      applyDraw(x, y, strokeTool)
    }
    lastCell = [x, y]
    drawPx()
  }

  // 描画後に色を取得することで、塗った直後の色を正確に反映する
  ui.hoverPos   = inside ? [x, y] : null
  ui.hoverColor = inside ? (S.pixels[idx(x, y)] ?? null) : null
  drawHover(inside ? x : null, inside ? y : null)
}

function onPointerup(e) {
  if (!painting || e.pointerId !== activePointer) return

  if (strokeTool === 'line' && lineStart) {
    const [x, y] = cellAt(e)
    S.pixels = [...lineSnap]
    // 終点がキャンバス外なら線は確定せず、スナップショットに戻して破棄する
    if (inB(x, y)) {
      saveUndo()
      bres(lineStart[0], lineStart[1], x, y).forEach(([px, py]) => setPx(px, py, S.color))
    }
    lineStart = null; lineSnap = null
    drawPx()
  }

  endStroke()
}

// 中断（システム割り込み等）：直線プレビューを破棄して状態を戻す
function onPointercancel() {
  if (strokeTool === 'line' && lineSnap) {
    S.pixels = [...lineSnap]
    drawPx()
  }
  lineStart = null; lineSnap = null
  endStroke()
}

function onPointerleave() {
  if (painting) return   // 描画中（捕捉中）はホバー解除しない
  ui.hoverPos   = null
  ui.hoverColor = null
  drawHover(null, null)
}

// ホイールで拡大倍率を変更（上＝拡大 / 下＝縮小）。デスクトップ向け。
function onWheel(e) {
  zoomCanvas(e.deltaY < 0 ? 4 : -4)
  // ズーム後もカーソル位置のホバー表示を更新（セルサイズが変わるため再計算）
  const [x, y] = cellAt(e)
  const inside = inB(x, y)
  ui.hoverPos   = inside ? [x, y] : null
  ui.hoverColor = inside ? (S.pixels[idx(x, y)] ?? null) : null
  drawHover(inside ? x : null, inside ? y : null)
}

// canvas の見た目に影響する状態を watch
// 補助線系は drawHover 経由（内部で drawGrid を呼ぶ）でホバー枠を維持する
watch(() => S.overlay,   drawPx)
watch(() => S.refImg,    drawPx)
watch(() => S.bg,        drawBg)
watch(() => S.headUnits, () => drawHover(ui.hoverPos?.[0] ?? null, ui.hoverPos?.[1] ?? null))
watch(() => S.vDivUnits, () => drawHover(ui.hoverPos?.[0] ?? null, ui.hoverPos?.[1] ?? null))

// ── お題パネルの拡大縮小（ホイール/ピンチでパネルごと拡大、ダブルクリックで戻す） ──
// laScale を CSS 変数 --la-scale に流し、パネル幅（スマホは画像の最大幅）を style.css 側で
// 拡大する。お題画像は width:100% なのでパネルに追従して大きくなる。
const laThumbEl = ref(null)   // 操作を受けるお題画像の枠
const laScale = ref(1)        // パネルの拡大率（1=既定サイズ）
const LA_SCALE_MIN = 1, LA_SCALE_MAX = 3
const laPointers = new Map()  // ピンチ用に追跡中のポインタ

// レッスンを切り替える／終了したら既定サイズに戻す（拡大率は保存しない）
watch(() => lessonState.active, () => { laScale.value = 1 })

function setLaScale(s) {
  laScale.value = Math.max(LA_SCALE_MIN, Math.min(LA_SCALE_MAX, s))
}

function onLaWheel(e) {
  setLaScale(laScale.value * (e.deltaY < 0 ? 1.12 : 1 / 1.12))
}

function onLaPointerdown(e) {
  laThumbEl.value.setPointerCapture?.(e.pointerId)
  laPointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
}

function onLaPointermove(e) {
  const p = laPointers.get(e.pointerId)
  if (!p) return
  // 1本指では拡大縮小しない。ただし記憶座標は更新して、2本目が触れた瞬間の
  // ピンチ距離が正しく計算されるようにする（初回フレームのズーム飛びを防ぐ）。
  if (laPointers.size < 2) { p.x = e.clientX; p.y = e.clientY; return }
  const other = [...laPointers].find(([id]) => id !== e.pointerId)?.[1]
  if (!other) return
  const prev = Math.hypot(p.x - other.x, p.y - other.y)
  p.x = e.clientX; p.y = e.clientY
  const now = Math.hypot(p.x - other.x, p.y - other.y)
  if (prev > 0) setLaScale(laScale.value * (now / prev))
}

function onLaPointerup(e) { laPointers.delete(e.pointerId) }

function onToggleLessonOverlay() { setLessonOverlay(!ui.lessonOverlayOn) }

onMounted(() => {
  initContexts(bgcvEl.value, cvEl.value, gridcvEl.value, cwrapEl.value)
  resize()
})
</script>

<template>
  <div id="carea" :class="{ 'lesson-on': lessonState.active, 'aside-right': ui.lessonAsideSide === 'right' }">
    <aside v-if="lessonState.active" class="lesson-aside" :style="{ '--la-scale': laScale }">
      <div class="la-head">
        <span class="la-lv">Lv.{{ lessonState.active.level }}</span>
        <span class="la-tag">お題</span>
        <button
          class="la-swap"
          @click="toggleLessonAsideSide"
          :title="ui.lessonAsideSide === 'right' ? 'お題を左側に移動' : 'お題を右側に移動'"
        >⇄</button>
      </div>
      <div
        ref="laThumbEl"
        class="la-thumb"
        title="ホイール/ピンチでお題パネルを拡大・ダブルクリックで戻す"
        @wheel.prevent="onLaWheel"
        @pointerdown="onLaPointerdown"
        @pointermove="onLaPointermove"
        @pointerup="onLaPointerup"
        @pointercancel="onLaPointerup"
        @dblclick="setLaScale(1)"
      >
        <img :src="lessonState.active.ref" :alt="lessonState.active.title">
      </div>
      <h3 class="la-title">{{ lessonState.active.title }}</h3>
      <p class="la-desc">{{ lessonState.active.desc }}</p>
      <button
        class="abtn la-overlay"
        :class="{ on: ui.lessonOverlayOn }"
        :title="ui.lessonOverlayOn ? '不透明度は REFERENCE パネルで調整できます' : ''"
        @click="onToggleLessonOverlay"
      >{{ ui.lessonOverlayOn ? '☑ 背景に重ねる' : '☐ 背景に重ねる' }}</button>
      <button class="abtn" @click="exitLesson">✕ レッスンを終了</button>
    </aside>
    <div ref="cwrapEl" id="cwrap">
      <canvas ref="bgcvEl"   id="bgcv"></canvas>
      <canvas ref="cvEl"     id="cv"></canvas>
      <canvas ref="gridcvEl" id="gridcv"
        @pointerdown="onPointerdown"
        @pointermove="onPointermove"
        @pointerup="onPointerup"
        @pointercancel="onPointercancel"
        @pointerleave="onPointerleave"
        @wheel.prevent="onWheel"
        @contextmenu.prevent
      ></canvas>
    </div>
  </div>
</template>
