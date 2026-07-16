<script setup>
import { S } from '~/core/state.js'

const TOOLS = [
  { id: 'pencil', icon: '✏',  key: 'B', label: 'ペン (B)' },
  { id: 'eraser', icon: '▭',  key: 'E', label: '消しゴム (E)' },
  { id: 'line',   icon: '╱',  key: 'L', label: '直線 (L)' },
  { id: 'bucket', icon: '◈',  key: 'G', label: '塗りつぶし (G)' },
  { id: 'picker', icon: '◎',  key: 'I', label: 'スポイト (I)' },
  { id: 'dither', icon: '▪',  key: 'D', label: 'ディザ (D)' },
]

// 左クリックで左ボタンに、右クリックで右ボタンにツールを割り当てる
const hint = '左クリック＝左ボタン / 右クリック＝右ボタンに割り当て'
</script>

<template>
  <div id="tbar">
    <div
      v-for="t in TOOLS"
      :key="t.id"
      class="tbtn"
      :class="{ 'on-l': S.toolL === t.id, 'on-r': S.toolR === t.id }"
      :title="`${t.label}\n${hint}`"
      @click="S.toolL = t.id"
      @contextmenu.prevent="S.toolR = t.id"
    >
      {{ t.icon }}<span class="tkey">{{ t.key }}</span>
      <span v-if="S.toolL === t.id" class="tbadge tb-l">L</span>
      <span v-if="S.toolR === t.id" class="tbadge tb-r">R</span>
    </div>

    <div class="tsep"></div>

    <div
      class="tbtn"
      :class="{ 'sym-on': S.sym }"
      title="左右対称 (S)"
      @click="S.sym = !S.sym"
    >
      ⟺<span class="tkey">S</span>
    </div>
  </div>
</template>
