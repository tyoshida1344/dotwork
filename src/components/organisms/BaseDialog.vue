<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue'
import { dialogState, resolveDialog } from '~/core/dialog.js'
import BaseButton from '~/components/atoms/BaseButton.vue'

// core/dialog.js の状態を描画する。文言は呼び出し側がそのまま渡す。
const inputEl = ref(null)
const inputVal = ref('')

function onOk() { resolveDialog(dialogState.kind === 'prompt' ? inputVal.value : true) }
function onCancel() { resolveDialog(dialogState.kind === 'prompt' ? null : false) }

// alert/confirm は Enter で OK、全種で Escape はキャンセル
function onKey(e) {
  if (!dialogState.open) return
  if (e.key === 'Escape') { e.preventDefault(); onCancel() }
  else if (e.key === 'Enter' && dialogState.kind !== 'prompt') { e.preventDefault(); onOk() }
}

watch(() => dialogState.open, async open => {
  if (open) {
    inputVal.value = dialogState.defaultValue
    window.addEventListener('keydown', onKey)
    await nextTick()
    inputEl.value?.focus()
    inputEl.value?.select?.()
  } else {
    window.removeEventListener('keydown', onKey)
  }
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div v-if="dialogState.open" class="dlg-backdrop" @click.self="onCancel">
    <div class="dlg-card" role="dialog" aria-modal="true">
      <p class="dlg-msg">{{ dialogState.message }}</p>
      <input
        v-if="dialogState.kind === 'prompt'"
        ref="inputEl"
        class="dlg-input"
        type="text"
        v-model="inputVal"
        @keydown.enter.prevent="onOk"
      >
      <div class="dlg-actions">
        <BaseButton v-if="dialogState.kind !== 'alert'" @click="onCancel">キャンセル</BaseButton>
        <BaseButton variant="accent" @click="onOk">OK</BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dlg-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: var(--z-dialog);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.dlg-card {
  width: 100%;
  max-width: 380px;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.dlg-msg { font-size: 14px; line-height: 1.7; color: var(--text); white-space: pre-wrap; }
.dlg-input {
  background: var(--bg3);
  border: 1px solid var(--border);
  color: var(--text);
  font-family: 'DM Mono', monospace;
  font-size: 14px;
  padding: 6px 9px;
  border-radius: 3px;
  width: 100%;
}
.dlg-input:focus { outline: 1px solid var(--amber); outline-offset: 1px; }
.dlg-actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
