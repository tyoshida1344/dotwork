<script setup>
import { onMounted, onUnmounted } from 'vue'
import { undo, redo } from '~/core/history.js'
import { drawPx, resize } from '~/core/canvas.js'
import { S } from '~/core/state.js'
import { ensureAuth } from '~/core/auth.js'
import { restoreStashedEditor } from '~/core/works.js'

import TheHeader    from '~/components/organisms/TheHeader.vue'
import TheToolbar   from '~/components/organisms/TheToolbar.vue'
import TheCanvas    from '~/components/organisms/TheCanvas.vue'
import TheSidebar   from '~/components/organisms/TheSidebar.vue'
import TheStatusBar from '~/components/organisms/TheStatusBar.vue'
import GuidePage    from '~/components/organisms/GuidePage.vue'
import ImageImportModal from '~/components/organisms/ImageImportModal.vue'
import LessonPage    from '~/components/organisms/LessonPage.vue'

const TOOL_KEYS = { B:'pencil', E:'eraser', L:'line', G:'bucket', I:'picker', D:'dither' }

function onKeydown(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); if (undo()) drawPx() }
    if (e.key === 'y' || e.key === 'Y') { e.preventDefault(); if (redo()) drawPx() }
    return
  }
  const k = e.key.toUpperCase()
  if (TOOL_KEYS[k]) S.toolL = TOOL_KEYS[k]   // キーは左ボタンのツールを切替
  if (k === 'S') S.sym = !S.sym
}

function handleUndo() { if (undo()) drawPx() }
function handleRedo() { if (redo()) drawPx() }

onMounted(async () => {
  document.addEventListener('keydown', onKeydown)
  // ログイン状態の確認と、OAuth から戻ってきた場合のキャンバス復元。
  // 子（TheCanvas）のマウントは済んでいるのでコンテキストは初期化済み。
  ensureAuth()
  if (await restoreStashedEditor()) resize()
})
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div id="layout">
    <TheHeader />
    <TheToolbar />
    <TheCanvas />
    <TheSidebar />
    <TheStatusBar
      @undo="handleUndo"
      @redo="handleRedo"
    />
    <GuidePage />
    <ImageImportModal />
    <LessonPage />
  </div>
</template>

<style scoped>
/* アプリの土台グリッド（各エリアの中身は organisms の scoped に集約） */
#layout {
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  display: grid;
  grid-template:
    "hdr  hdr   hdr"  var(--hdr)
    "tbar carea side" 1fr
    "stat stat  stat" var(--status)
    / var(--toolbar) 1fr var(--sidebar);
}

@media (max-width: 820px) {
  /* 固定グリッドをやめて縦並びに */
  #layout { display: flex; flex-direction: column; }
}
</style>
