<script setup>
import { S } from '~/core/state.js'
import SidePanel from '~/components/molecules/SidePanel.vue'
import SliderRow from '~/components/molecules/SliderRow.vue'

function onHDivInput(e) { S.headUnits = parseInt(e.target.value) }
function onVDivInput(e) { S.vDivUnits = parseInt(e.target.value) }
</script>

<template>
  <SidePanel title="GUIDES" tooltip="補助線は表示専用です。書き出し PNG には含まれません。">
    <SliderRow label="横分割" :value="S.headUnits === 0 ? 'off' : S.headUnits">
      <input type="range" min="0" max="8" step="1" :value="S.headUnits" @input="onHDivInput">
    </SliderRow>
    <SliderRow label="縦分割" :value="S.vDivUnits === 0 ? 'off' : S.vDivUnits">
      <input type="range" min="0" max="8" step="1" :value="S.vDivUnits" @input="onVDivInput">
    </SliderRow>
  </SidePanel>
</template>
