<script setup>
import { S } from '../core/state.js'
import { ui } from '../core/ui.js'
import { resize } from '../core/canvas.js'

const TOOL_NAMES = {
  pencil: 'ペン', eraser: '消しゴム', line: '直線',
  bucket: '塗りつぶし', picker: 'スポイト', dither: 'ディザ',
}

function zoom(delta) {
  S.cell = Math.max(8, Math.min(32, S.cell + delta))
  resize()
}
</script>

<template>
  <div id="status">
    <span style="min-width:60px">
      {{ ui.hoverPos ? `${ui.hoverPos[0]}, ${ui.hoverPos[1]}` : '–, –' }}
    </span>
    <span style="display:flex;align-items:center;gap:5px;min-width:110px">
      <span
        style="width:14px;height:14px;border-radius:2px;border:1px solid var(--border);flex-shrink:0"
        :style="ui.hoverColor
          ? { background: ui.hoverColor }
          : { background: 'repeating-linear-gradient(45deg,#444 0,#444 3px,#222 3px,#222 6px)' }"
      ></span>
      <span :style="{ color: ui.hoverColor ? 'var(--text)' : 'var(--muted)' }">
        {{ ui.hoverColor ?? '透明' }}
      </span>
    </span>
    <span>{{ TOOL_NAMES[S.tool] ?? S.tool }}</span>
    <div class="zctrl">
      <button @click="zoom(-4)">−</button>
      <span style="min-width:30px;text-align:center">{{ S.cell }}px</span>
      <button @click="zoom(+4)">+</button>
    </div>
  </div>
</template>
