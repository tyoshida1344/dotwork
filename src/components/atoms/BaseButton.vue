<script setup>
import { computed } from 'vue'

// 全画面共通のボタン。素の <button> と router-link 版を統合する。
// バリアントの使い分けは README「UI／デザイン方針」を参照。
const props = defineProps({
  // default（副次）/ accent（主操作・アンバー）/ teal / danger（破壊的・赤）/ subtle（補助の小ボタン）
  variant: { type: String, default: 'default' },
  block: { type: Boolean, default: false }, // 幅いっぱい
  compact: { type: Boolean, default: false }, // 詰めた小ボタン
  active: { type: Boolean, default: false }, // トグルのオン表示（アンバーの淡い塗り）
  tag: { type: String, default: 'button' }, // button | router-link
  to: { type: [String, Object], default: undefined },
  type: { type: String, default: 'button' },
  loading: { type: Boolean, default: false }, // 処理中：disabled ＋ loadingText に差し替え
  loadingText: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})

const isLink = computed(() => props.tag === 'router-link')
const isDisabled = computed(() => props.disabled || props.loading)

const classes = computed(() => [
  'btn',
  props.variant !== 'default' && `btn--${props.variant}`,
  { 'btn--block': props.block, 'btn--compact': props.compact, 'is-active': props.active },
])
</script>

<template>
  <component
    :is="isLink ? 'router-link' : 'button'"
    :class="classes"
    :to="isLink ? to : undefined"
    :type="isLink ? undefined : type"
    :disabled="isLink ? undefined : isDisabled"
  >
    <template v-if="loading && loadingText">{{ loadingText }}</template>
    <slot v-else />
  </component>
</template>

<style scoped>
.btn {
  background: var(--bg3);
  border: 1px solid var(--border);
  color: var(--text);
  font-family: 'DM Mono', monospace;
  font-size: 14px;
  padding: 4px 9px;
  cursor: pointer;
  border-radius: 3px;
  white-space: nowrap;
  text-decoration: none;
  touch-action: manipulation;
}
.btn:focus { outline: 1px solid var(--amber); outline-offset: 1px; }
.btn:hover { border-color: var(--amber); color: var(--amber); }

/* router-link 版はインライン要素なので中身を揃える */
a.btn { display: inline-flex; align-items: center; }

/* ── バリアント ── */
.btn--accent { border-color: var(--amber2); color: var(--amber); }
.btn--accent:hover { background: var(--amber); color: var(--on-accent); }
.btn--teal { border-color: var(--teal2); color: var(--teal); }
.btn--teal:hover { background: var(--teal); color: var(--on-accent); }
.btn--danger { border-color: #fca5a5; color: #dc2626; }
.btn--danger:hover { background: #dc2626; color: #fff; border-color: #dc2626; }

/* 控えめな小ボタン */
.btn--subtle { font-size: 13px; line-height: 1; padding: 3px 7px; color: var(--muted); border-radius: 4px; }
.btn--subtle:hover { color: var(--text); border-color: var(--muted); background: var(--bg3); }

/* ── 修飾 ── */
.btn--block { width: 100%; padding: 7px 0; margin-bottom: 4px; }
.btn--compact { line-height: 1; padding: 4px 8px; }
.is-active { border-color: var(--amber); background: var(--amber-soft); color: var(--amber); }

.btn:disabled { opacity: .5; cursor: not-allowed; }
.btn:disabled:hover { border-color: var(--border); color: var(--text); background: var(--bg3); }
</style>
