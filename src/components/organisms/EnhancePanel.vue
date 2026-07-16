<script setup>
import { S } from '~/core/state.js'
import { drawPx } from '~/core/canvas.js'
import { autoOutline, removeOutline } from '~/core/tools.js'
import SidePanel from '~/components/molecules/SidePanel.vue'
import BaseButton from '~/components/atoms/BaseButton.vue'

function onAutoOutline() { autoOutline(); drawPx() }
function onRemoveOutline() { removeOutline(); drawPx() }
</script>

<template>
  <SidePanel title="ENHANCE" tooltip="自動縁取りはドット絵のシルエット外側を1ドットで囲む。ドット絵を背景に映えさせる定番テクニック。">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
      <span style="color:var(--muted);font-size:10px">縁取り色</span>
      <input type="color" class="out-col" v-model="S.outlineColor">
    </div>
    <BaseButton block @click="onAutoOutline">⬛ 自動縁取り</BaseButton>
    <BaseButton block style="color:var(--muted)" @click="onRemoveOutline">✕ 縁取りを消す</BaseButton>
  </SidePanel>
</template>

<style scoped>
/* 縁取り色ピッカー */
.out-col { width: 32px; height: 26px; padding: 0; border: 1px solid var(--border); border-radius: 2px; cursor: pointer; }
</style>
