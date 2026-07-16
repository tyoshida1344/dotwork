<script setup>
import { S } from '~/core/state.js'
import { ui, EXPORT_SCALES, setExportScale } from '~/core/ui.js'
import { exportPNG } from '~/core/export.js'
import SidePanel from '~/components/molecules/SidePanel.vue'
import BaseButton from '~/components/atoms/BaseButton.vue'

// 書き出し倍率は EXPORT パネルで選べる（ui.exportScale）。ファイル出力はヘッダーの「保存」（＝アカウントへ作品を保存）と紛らわしいため、このパネルに分けている。
</script>

<template>
  <SidePanel
    title="EXPORT"
    tooltip="キャンバスを PNG ファイルとしてダウンロードします。倍率を選べます。背景色・補助線・参照画像は含まれません（背景は常に透過）。アカウントへ保存する「保存」とは別の操作です。"
  >
    <label class="exp-scale">
      倍率
      <select :value="String(ui.exportScale)" @change="setExportScale(Number($event.target.value))">
        <option v-for="s in EXPORT_SCALES" :key="s" :value="String(s)">{{ s }}x</option>
      </select>
    </label>
    <BaseButton block variant="accent" @click="exportPNG">⤓ PNG を書き出す</BaseButton>
    <p class="exp-note">{{ S.cols * ui.exportScale }}×{{ S.rows * ui.exportScale }} px</p>
  </SidePanel>
</template>

<style scoped>
/* 倍率セレクトと出力サイズの注記 */
.exp-scale { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 13px; color: var(--muted); }
.exp-scale select { margin-left: auto; padding: 4px 6px; }
.exp-note { color: var(--muted); font-size: 12px; text-align: center; }
</style>
