<script setup>
import { ref, onMounted, watch } from 'vue'

// 作品のサムネイル。DB のピクセル配列から等倍で描いてCSS（image-rendering: pixelated）で引き伸ばす。（画像は保存しない。）
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

<style scoped>
/* サムネイルは作品のピクセル数と同じサイズの canvas。拡大してもドットを保つ */
.work-thumb-cv { display: block; width: 100%; height: auto; image-rendering: pixelated; }
</style>
