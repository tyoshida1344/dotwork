<script setup>
import { S } from '../core/state.js'
import { ui } from '../core/ui.js'
import { resetCanvas, drawPx } from '../core/canvas.js'
import { clearAll } from '../core/history.js'
import { exportPNG } from '../core/export.js'
import { lessonState } from '../core/lessons.js'
import { isAuthAvailable, authState, signInWithGoogle, signOut } from '../core/auth.js'
import { worksState, saveWork, stashEditor, clearStash } from '../core/works.js'

const emit = defineEmits(['undo', 'redo'])

function onSizeChange(e) {
  const n = parseInt(e.target.value)
  if (!confirm(`${n}×${n} にリサイズしますか？現在の描画は消去されます。`)) {
    e.target.value = String(S.cols); return
  }
  resetCanvas(n)
}

function onClear() {
  if (!confirm('キャンバスを消去しますか？')) return
  clearAll()
  drawPx()
}

// Google の認可画面へ出る前に、編集中のキャンバスを退避しておく
// （リダイレクトでページごと捨てられるため）。戻り先で EditorView が復元する。
async function onLogin() {
  stashEditor()
  try {
    await signInWithGoogle()
  } catch (e) {
    clearStash()   // 遷移しなかったので、退避したスナップショットは捨てる
    alert(`ログインを開始できませんでした: ${e.message || e}`)
  }
}

async function onLogout() {
  await signOut()
  // ログアウト後はその作品を触れないので、上書き先の紐づけを外す（描いた絵はそのまま残す）
  worksState.currentId = null
  worksState.currentTitle = ''
}

async function onSave(asNew = false) {
  try {
    const w = await saveWork({ asNew })
    alert(`「${w.title}」を保存しました。`)
  } catch (e) {
    alert(e.message || e)
  }
}
</script>

<template>
  <header id="hdr">
    <span id="logo">DOTWORK</span>
    <div class="vsep"></div>

    <div class="hgrp">
      <span class="hlbl">SIZE</span>
      <select
        :value="String(S.cols)"
        :disabled="!!lessonState.active"
        :title="lessonState.active ? 'レッスン中はサイズが固定されます' : ''"
        @change="onSizeChange"
      >
        <option value="16">16×16</option>
        <option value="24">24×24</option>
        <option value="32">32×32</option>
        <option value="48">48×48</option>
      </select>
    </div>

    <div class="vsep"></div>
    <div class="spc"></div>

    <div class="hgrp hgrp-actions">
      <button class="btn-t mobile-only" title="パネルを開く" @click="ui.panelOpen = true">☰ パネル</button>
      <button class="btn-t" @click="ui.lessonPageOpen = true">▦ レッスン</button>
      <button class="btn-t" @click="ui.guidePageOpen = true">? ガイド</button>
      <button title="Ctrl+Z" @click="emit('undo')">↩ Undo</button>
      <button title="Ctrl+Y" @click="emit('redo')">↪ Redo</button>
      <button class="btn-r" @click="onClear">✕ Clear</button>
      <button class="btn-a" @click="exportPNG">↓ Export PNG</button>

      <!-- ログイン導線は Supabase 設定済みかつセッション確認後にだけ出す（表示のちらつき防止） -->
      <template v-if="isAuthAvailable && authState.ready">
        <template v-if="authState.user">
          <button
            class="btn-a"
            :disabled="worksState.saving"
            :title="worksState.currentId != null ? `「${worksState.currentTitle}」に上書き保存します` : '新しい作品として保存します'"
            @click="onSave(false)"
          >{{ worksState.saving ? '保存中…' : '⤓ 保存' }}</button>
          <button
            v-if="worksState.currentId != null"
            :disabled="worksState.saving"
            title="今の絵を別の作品として保存します"
            @click="onSave(true)"
          >＋ 新規保存</button>
          <router-link class="hbtn" to="/mypage">◱ マイページ</router-link>
          <button @click="onLogout">ログアウト</button>
        </template>
        <button v-else class="btn-t" @click="onLogin">Google でログイン</button>
      </template>
    </div>
  </header>
</template>
