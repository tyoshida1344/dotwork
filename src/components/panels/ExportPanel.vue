<script setup>
import { S } from '../../core/state.js'
import { ui, EXPORT_SCALES, setExportScale } from '../../core/ui.js'
import { exportPNG } from '../../core/export.js'
import SidePanel from '../SidePanel.vue'

// 書き出し倍率は EXPORT パネルで選べる（ui.exportScale）。ヘッダーの「保存」（＝アカウントへ
// 作品を保存）と紛らわしかったため、ファイル出力はこのパネルに分けている。
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
    <button class="abtn btn-a" @click="exportPNG">⤓ PNG を書き出す</button>
    <p class="exp-note">{{ S.cols * ui.exportScale }}×{{ S.rows * ui.exportScale }} px</p>
  </SidePanel>
</template>
