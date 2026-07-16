<script setup>
defineProps({
  title: { type: String, required: true },
  tooltip: { type: String, default: '' },
})
</script>

<template>
  <div class="sec">
    <div class="sec-hdr">
      {{ title }}
      <span v-if="tooltip" class="tip-wrap">
        <span class="tip-ico">?</span>
        <div class="tip-box">{{ tooltip }}</div>
      </span>
    </div>
    <slot />
  </div>
</template>

<style scoped>
.sec { border-bottom: 1px solid var(--border); padding: 11px 12px; }
.sec-hdr {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 9px;
  font-family: 'Silkscreen', monospace;
  font-size: 13px;
  color: var(--amber);
  letter-spacing: 1px;
}
/* ツールチップ */
.tip-wrap { position: relative; line-height: 1; margin-left: auto; }
.tip-ico { color: var(--muted); cursor: default; font-size: 13px; }
.tip-ico:hover { color: var(--amber); }
.tip-box {
  display: none;
  position: absolute;
  right: 0; top: 20px;
  width: 210px;
  background: var(--bg3);
  border: 1px solid var(--amber2);
  border-radius: 4px;
  padding: 9px 11px;
  color: var(--text);
  font-size: 13px;
  line-height: 1.55;
  z-index: var(--z-tooltip);
  white-space: normal;
}
.tip-wrap:hover .tip-box { display: block; }
</style>
