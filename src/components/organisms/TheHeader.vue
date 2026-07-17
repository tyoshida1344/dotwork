<script setup>
import { ui } from '~/core/ui.js'
import { isAuthAvailable, authState, signInWithGoogle } from '~/core/auth.js'
import { worksState, saveWork, stashEditor, clearStash } from '~/core/works.js'
import { showAlert } from '~/core/dialog.js'
import BaseButton from '~/components/atoms/BaseButton.vue'

// Google の認可画面へ出る前に、編集中のキャンバスを退避しておく
// （リダイレクトでページごと捨てられるため）。戻り先で EditorView が復元する。
async function onLogin() {
  stashEditor()
  try {
    await signInWithGoogle()
  } catch (e) {
    clearStash()   // 遷移しなかったので、退避したスナップショットは捨てる
    showAlert(`ログインを開始できませんでした: ${e.message || e}`)
  }
}

async function onSave(asNew = false) {
  try {
    const w = await saveWork({ asNew })
    showAlert(`「${w.title}」を保存しました。`)
  } catch (e) {
    showAlert(e.message || e)
  }
}
</script>

<template>
  <header id="hdr">
    <span id="logo">DOTWORK</span>
    <div class="vsep"></div>
    <div class="spc"></div>

    <div class="hgrp hgrp-actions">
      <BaseButton variant="teal" class="mobile-only" title="パネルを開く" @click="ui.panelOpen = true">☰ パネル</BaseButton>
      <!-- ギャラリーは公開閲覧（ログイン不要）なので認証テンプレートの外に出す。Supabase 未設定時は開けないので隠す -->
      <BaseButton v-if="isAuthAvailable" variant="teal" tag="router-link" to="/gallery">▤ ギャラリー</BaseButton>
      <BaseButton variant="teal" @click="ui.lessonPageOpen = true">▦ レッスン</BaseButton>
      <BaseButton variant="teal" @click="ui.guidePageOpen = true">? ガイド</BaseButton>

      <!-- SIZE・元に戻す/やり直す・クリアはステータスバー（キャンバス下）に置く -->
      <!-- PNG 書き出しはサイドバーの EXPORT パネルに置く（「保存」との混同を避けるため） -->
      <!-- ログイン導線は Supabase 設定済みかつセッション確認後にだけ出す（表示のちらつき防止） -->
      <template v-if="isAuthAvailable && authState.ready">
        <template v-if="authState.user">
          <BaseButton
            variant="accent"
            :loading="worksState.saving"
            loading-text="保存中…"
            :title="worksState.currentId != null ? `「${worksState.currentTitle}」に上書き保存します` : '新しい作品として保存します'"
            @click="onSave(false)"
          >✓ 保存</BaseButton>
          <BaseButton
            v-if="worksState.currentId != null"
            :disabled="worksState.saving"
            title="今の絵を別の作品として保存します"
            @click="onSave(true)"
          >＋ 新規保存</BaseButton>
          <!-- ログアウトはマイページに置く（ヘッダーには出さない） -->
          <BaseButton tag="router-link" to="/mypage">◱ マイページ</BaseButton>
        </template>
        <BaseButton v-else variant="teal" @click="onLogin">ログイン</BaseButton>
      </template>
    </div>
  </header>
</template>

<style scoped>
#hdr {
  grid-area: hdr;
  background: var(--bg2);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 10px;
  overflow: hidden;
}
#logo {
  font-family: 'Silkscreen', monospace;
  font-size: 22px;
  color: var(--amber);
  letter-spacing: 2px;
  white-space: nowrap;
  flex-shrink: 0;
}
.vsep { width: 1px; height: 28px; background: var(--border); flex-shrink: 0; }
.hgrp { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.spc { flex: 1; }

@media (max-width: 820px) {
  /* ヘッダー：折り返し可・スペーサー無効で左詰め */
  #hdr { flex-wrap: wrap; height: auto; min-height: var(--hdr); padding: 6px 10px; gap: 8px; }
  #logo { font-size: 18px; }
  .spc { display: none; }
  /* アクション群：1行に収まらないので全幅・折り返しで配置（Clear / Export の見切れ防止） */
  .hgrp-actions { flex-basis: 100%; flex-wrap: wrap; gap: 6px; }
  .hgrp-actions button { flex: 1 1 auto; justify-content: center; }
}
</style>
