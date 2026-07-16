<script setup>
import { ref, onMounted, watch } from 'vue'

// 作品のサムネイル。画像は保存しておらず、DB のピクセル配列から等倍で描いて
// CSS（image-rendering: pixelated）で引き伸ばす。
const props = defineProps({
  pixels: { type: Array, required: true },
  cols: { type: Number, required: true },
  rows: { type: Number, required: true },
})

const cvEl = ref(null)

function draw() {
  const cv = cvEl.value
  if (!cv) return
  cv.width = props.cols
  cv.height = props.rows
  const x = cv.getContext('2d')
  x.clearRect(0, 0, props.cols, props.rows)
  for (let i = 0; i < props.pixels.length; i++) {
    const c = props.pixels[i]
    if (!c) continue
    x.fillStyle = c
    x.fillRect(i % props.cols, Math.floor(i / props.cols), 1, 1)
  }
}

onMounted(draw)
watch(() => props.pixels, draw)
</script>

<template>
  <canvas ref="cvEl" class="work-thumb-cv"></canvas>
</template>
