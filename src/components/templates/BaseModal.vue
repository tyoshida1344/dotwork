<script setup>
// 中央（または上寄せ）に載せるモーダルの共通枠（バックドロップ＋スロット）。
// 中身のカードは呼び出し側が default スロットに置く。背景クリックで close を emit。
defineProps({
  open: { type: Boolean, default: false },
  align: { type: String, default: 'center' }, // center | start（縦に長いフォームは start）
})
const emit = defineEmits(['close'])
</script>

<template>
  <div
    v-if="open"
    class="modal-backdrop"
    :class="{ 'is-start': align === 'start' }"
    @click.self="emit('close')"
  >
    <slot />
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow-y: auto;
}
.modal-backdrop.is-start { align-items: flex-start; }
</style>
