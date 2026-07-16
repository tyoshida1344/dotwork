<script setup>
// ラベル＋スライダー＋数値表示の1行（旧 .srow）。スライダー本体は default スロットに置く。
defineProps({
  label: { type: String, default: '' },
  value: { type: [String, Number], default: '' },
})
</script>

<template>
  <div class="srow">
    <span class="slbl">{{ label }}</span>
    <slot />
    <span class="sval">{{ value }}</span>
  </div>
</template>

<style scoped>
.srow { display: flex; align-items: center; gap: 6px; margin: 5px 0; }
/* 幅は固定せず、内容に応じて自動調整 */
.slbl { color: var(--muted); font-size: 13px; flex-shrink: 0; white-space: nowrap; }
.sval { width: 36px; text-align: right; color: var(--amber); font-size: 13px; flex-shrink: 0; }
.srow :deep(input[type=range]) { flex: 1; height: 4px; accent-color: var(--amber); cursor: pointer; }
</style>
