<script setup>
import { S } from '../../core/state.js'
import { exportPNG } from '../../core/export.js'
import SidePanel from '../SidePanel.vue'

// 書き出しは常に 16 倍スケール（export.js）。ヘッダーの「保存」（＝アカウントへ作品を保存）
// と紛らわしかったため、ファイル出力はこのパネルに分けている。
const SCALE = 16
</script>

<template>
  <SidePanel
    title="EXPORT"
    tooltip="キャンバスを PNG ファイルとしてダウンロードします。背景色・補助線・参照画像は含まれません（背景は常に透過）。アカウントへ保存する「保存」とは別の操作です。"
  >
    <button class="abtn btn-a" @click="exportPNG">⤓ PNG を書き出す</button>
    <p class="exp-note">{{ S.cols * SCALE }}×{{ S.rows * SCALE }} px ・ 背景透過</p>
  </SidePanel>
</template>
