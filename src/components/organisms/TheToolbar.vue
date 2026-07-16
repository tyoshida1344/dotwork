<script setup>
import { S } from '~/core/state.js'
import ToolButton from '~/components/atoms/ToolButton.vue'

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
    <ToolButton
      v-for="t in TOOLS"
      :key="t.id"
      :hotkey="t.key"
      :active-left="S.toolL === t.id"
      :active-right="S.toolR === t.id"
      :title="`${t.label}\n${hint}`"
      @click="S.toolL = t.id"
      @contextmenu.prevent="S.toolR = t.id"
    >{{ t.icon }}</ToolButton>

    <div class="tsep"></div>

    <ToolButton
      :active-sym="S.sym"
      hotkey="S"
      title="左右対称 (S)"
      @click="S.sym = !S.sym"
    >⟺</ToolButton>
  </div>
</template>

<style scoped>
#tbar {
  grid-area: tbar;
  background: var(--bg2);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  gap: 3px;
  overflow-y: auto;
  overflow-x: hidden;
}
.tsep { width: 30px; height: 1px; background: var(--border); margin: 4px 0; flex-shrink: 0; }

@media (max-width: 820px) {
  /* 縦→横スクロールの帯に */
  #tbar {
    flex-direction: row;
    width: 100%;
    align-items: center;
    border-right: none;
    border-bottom: 1px solid var(--border);
    padding: 6px 8px;
    gap: 6px;
    overflow-x: auto;
    overflow-y: hidden;
  }
  .tsep { width: 1px; height: 30px; margin: 0 4px; }
}
</style>
