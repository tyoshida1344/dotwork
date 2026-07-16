<script setup>
// ラベル＋入力欄の1組（旧 .admin-field）。入力（input/select/textarea）は default スロットに置く。
// 複数の入力をまとめる時は tag="div"（label だとクリックが最初の入力に吸われるため）。
defineProps({
  label: { type: String, default: '' },
  tag: { type: String, default: 'label' }, // label | div
})
</script>

<template>
  <component :is="tag" class="field">
    <span v-if="label" class="field-label">{{ label }}</span>
    <slot />
  </component>
</template>

<style scoped>
.field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 11px; }
.field-label { font-size: 12px; color: var(--muted); }
.field :deep(input[type="text"]),
.field :deep(input[type="email"]),
.field :deep(input[type="password"]),
.field :deep(input[type="number"]),
.field :deep(textarea),
.field :deep(select) {
  background: var(--bg3);
  border: 1px solid var(--border);
  color: var(--text);
  font-family: 'DM Mono', monospace;
  font-size: 14px;
  padding: 6px 9px;
  border-radius: 3px;
  width: 100%;
}
.field :deep(textarea) { resize: vertical; }
.field :deep(input:focus),
.field :deep(textarea:focus),
.field :deep(select:focus) { outline: 1px solid var(--amber); outline-offset: 1px; }
</style>
