<script setup>
import { ui } from '~/core/ui.js'
import ColorPanel      from '~/components/organisms/ColorPanel.vue'
import PalettePanel    from '~/components/organisms/PalettePanel.vue'
import EnhancePanel    from '~/components/organisms/EnhancePanel.vue'
import GuidesPanel     from '~/components/organisms/GuidesPanel.vue'
import BackgroundPanel from '~/components/organisms/BackgroundPanel.vue'
import RefImagePanel   from '~/components/organisms/RefImagePanel.vue'
import ExportPanel     from '~/components/organisms/ExportPanel.vue'
</script>

<template>
  <!-- スマホ：ドロワー表示時の背景。タップで閉じる（デスクトップでは CSS で非表示） -->
  <div v-if="ui.panelOpen" id="side-backdrop" @click="ui.panelOpen = false"></div>
  <div id="side" :class="{ 'side-open': ui.panelOpen }">
    <button id="side-close" class="mobile-only" @click="ui.panelOpen = false">✕ 閉じる</button>
    <ColorPanel />
    <PalettePanel />
    <EnhancePanel />
    <GuidesPanel />
    <BackgroundPanel />
    <RefImagePanel />
    <ExportPanel />
  </div>
</template>
