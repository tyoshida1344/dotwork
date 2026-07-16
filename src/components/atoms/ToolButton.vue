<script setup>
// ツールバーのツールボタン。L/R バッジ・アクティブ枠・キーヒントを props で受け取る。
// 左右クリックの割り当ては親が行う。
defineProps({
  hotkey: { type: String, default: '' }, // 右下に出すキーヒント（.tkey）
  activeLeft: { type: Boolean, default: false }, // 左ボタン割当（アンバー枠＋L バッジ）
  activeRight: { type: Boolean, default: false }, // 右ボタン割当（ティール枠＋R バッジ）
  activeSym: { type: Boolean, default: false }, // 左右対称トグルのオン表示
})
</script>

<template>
  <button
    class="tbtn"
    :class="{ 'on-l': activeLeft, 'on-r': activeRight, 'sym-on': activeSym }"
  >
    <slot /><span v-if="hotkey" class="tkey">{{ hotkey }}</span>
    <span v-if="activeLeft" class="tbadge tb-l">L</span>
    <span v-if="activeRight" class="tbadge tb-r">R</span>
  </button>
</template>

<style scoped>
.tbtn {
  width: 42px; height: 42px;
  padding: 0;
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'DM Mono', monospace;
  font-size: 19px;
  color: var(--text);
  position: relative;
  flex-shrink: 0;
  transition: border-color .1s;
}
.tbtn:hover { border-color: var(--amber); }
.tbtn.on-l { border-color: var(--amber); background: var(--amber-soft); } /* 左ボタン割当 */
.tbtn.on-r { border-color: var(--teal); } /* 右ボタン割当 */
.tbtn.on-l.on-r { border-color: var(--amber); } /* 両方なら左枠優先（右はバッジで表示）*/
.tbtn.sym-on { border-color: var(--teal); background: var(--teal-soft); }
.tkey {
  position: absolute;
  bottom: 2px; right: 4px;
  font-size: 10px;
  color: var(--muted);
  line-height: 1;
}
.tbadge {
  position: absolute;
  top: 2px;
  font-size: 9px;
  line-height: 1;
  padding: 1px 3px;
  border-radius: 2px;
  color: var(--on-accent);
  font-weight: bold;
}
.tb-l { left: 3px; background: var(--amber); }
.tb-r { right: 3px; background: var(--teal); }

@media (max-width: 820px) {
  .tbtn { width: 44px; height: 44px; }
  /* タッチでは左右クリックを区別できないため L/R バッジを隠す（枠線＝アクティブ表示は残し、右割り当ての枠線だけ無効化） */
  .tb-l, .tb-r { display: none; }
  .tbtn.on-r { border-color: var(--border); }
}
</style>
