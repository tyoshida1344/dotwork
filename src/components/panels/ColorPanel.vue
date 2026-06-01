<script setup>
import { S } from '../../core/state.js'
import { generateLamp } from '../../core/palette.js'
import SidePanel from '../SidePanel.vue'
import { computed } from 'vue'

const lamp = computed(() => generateLamp(S.color))
const LAMP_LABELS = ['Shadow 2', 'Shadow 1', 'Base', 'Light 1', 'Light 2']

function onPickerInput(e) { S.color = e.target.value }
function onHexChange(e) {
  const v = e.target.value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(v)) S.color = v
  else e.target.value = S.color
}
</script>

<template>
  <SidePanel title="COLOR" tooltip="現在の描画色。スウォッチをクリックしてピッカーを開くか、16進コードを直接入力。">
    <div class="col-row">
      <div
        class="col-swatch"
        :style="{ background: S.color }"
        @click="$refs.picker.click()"
      ></div>
      <input ref="picker" type="color" :value="S.color" style="display:none" @input="onPickerInput">
      <input
        type="text"
        class="col-hex"
        :value="S.color"
        maxlength="7"
        spellcheck="false"
        @change="onHexChange"
      >
    </div>
  </SidePanel>

  <SidePanel title="SHADOW LAMP" tooltip="ベース色から5段階を自動生成。影は寒色寄り・光は暖色寄りにシフト。クリックで選択。">
    <div class="lamp">
      <div
        v-for="(c, i) in lamp"
        :key="i"
        class="lamp-sw"
        :style="{ background: c }"
        :title="LAMP_LABELS[i] + ': ' + c"
        @click="S.color = c"
      ></div>
    </div>
  </SidePanel>
</template>
