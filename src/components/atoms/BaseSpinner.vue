<script setup>
// 汎用のローディングスピナー。ネットワーク取得中の画像枠・一覧に出す。
defineProps({
  size: { type: [Number, String], default: 24 }, // 直径(px)
})
</script>

<template>
  <span
    class="spinner"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="status"
    aria-label="読み込み中"
  ></span>
</template>

<style scoped>
.spinner {
  display: inline-block;
  border: 2px solid var(--border);
  border-top-color: var(--amber);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
