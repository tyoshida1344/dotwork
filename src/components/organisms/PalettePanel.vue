<script setup>
import { S } from '~/core/state.js'
import { ui } from '~/core/ui.js'
import { PAL, extractPaletteFromImage } from '~/core/palette.js'
import { lessonState } from '~/core/lessons.js'
import { showAlert } from '~/core/dialog.js'
import SidePanel from '~/components/molecules/SidePanel.vue'

function onPalChange(e) {
  const v = e.target.value
  if (v === 'ref') {
    if (!S.refImg) { showAlert('先に参照画像を読み込んでください。'); e.target.value = ui.palKey; return }
    S.palette = extractPaletteFromImage(S.refImg)
  } else {
    S.palette = [...PAL[v]]
  }
  ui.palKey = v
}
</script>

<template>
  <SidePanel title="PALETTE" tooltip="アクティブなパレット。ヘッダーのドロップダウンで変更。クリックで選択。">
    <div style="margin-bottom:6px">
      <select
        style="width:100%"
        :value="ui.palKey"
        :disabled="!!lessonState.active"
        :title="lessonState.active ? 'レッスン中はパレットが固定されます' : ''"
        @change="onPalChange"
      >
        <option v-if="ui.palKey === 'lesson'" value="lesson">レッスンの色</option>
        <option v-if="ui.palKey === 'work'" value="work">作品の色</option>
        <option value="pico8">PICO-8</option>
        <option value="sweetie">Sweetie16</option>
        <option value="gray">グレースケール</option>
        <option value="ref">画像から抽出</option>
      </select>
    </div>
    <div class="pal-grid">
      <div
        v-for="(c, i) in S.palette"
        :key="i"
        class="psw"
        :class="{ sel: c === S.color }"
        :style="{ background: c }"
        :title="c"
        @click="S.color = c"
      ></div>
    </div>
  </SidePanel>
</template>

<style scoped>
.pal-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 3px; }
.psw {
  aspect-ratio: 1;
  border: 1px solid transparent;
  border-radius: 2px;
  cursor: pointer;
}
.psw:hover { border-color: var(--amber); }
.psw.sel { border-color: var(--bg2); box-shadow: 0 0 0 2px var(--amber); }
</style>
