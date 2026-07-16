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

<style scoped>
#side {
  grid-area: side;
  background: var(--bg2);
  border-left: 1px solid var(--border);
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 16px;
}
/* スマホ用ドロワーの背景と閉じるボタン（デスクトップでは .mobile-only で隠す） */
#side-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: var(--z-drawer-backdrop); }
#side-close {
  width: 100%;
  padding: 11px 0;
  border: none;
  border-bottom: 1px solid var(--border);
  border-radius: 0;
  color: var(--muted);
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--bg2);
}

@media (max-width: 820px) {
  /* サイドバーは右からスライドインするドロワー */
  #side {
    position: fixed;
    top: 0; right: 0; bottom: 0;
    width: min(330px, 88vw);
    transform: translateX(100%);
    transition: transform .2s ease;
    z-index: var(--z-drawer);
    box-shadow: -8px 0 24px rgba(0, 0, 0, 0.15);
  }
  #side.side-open { transform: translateX(0); }
  #side-close { display: block; }
}
</style>
