<script setup>
import { ref, onMounted } from 'vue'
import {
  fetchLessons, createLesson, updateLesson, deleteLesson, reorderLessons, deleteRefImage,
} from '~/core/lessonsApi.js'
import { invalidateLessons } from '~/core/lessons.js'
import { showConfirm } from '~/core/dialog.js'
import LessonForm from '~/components/organisms/LessonForm.vue'
import BaseButton from '~/components/atoms/BaseButton.vue'

// レッスン管理（/admin/lessons）。認証は親シェル（AdminView）が担うため、
// ここはログイン済み前提で一覧取得・CRUD・並び替えだけを行う。

const lessons = ref([])
const loading = ref(false)
const listError = ref('')

const editing = ref(null)   // 編集中のレッスン（新規は空テンプレート）| null
const saveError = ref('')   // 編集フォームに表示する保存エラー
const saving = ref(false)

const BLANK = () => ({ id: undefined, level: 1, title: '', desc: '', size: 16, palette: ['#000000'], ref: '' })

onMounted(refresh)

async function refresh() {
  loading.value = true
  listError.value = ''
  try {
    lessons.value = await fetchLessons()
  } catch (e) {
    listError.value = `レッスンの取得に失敗しました: ${e.message || e}`
  } finally {
    loading.value = false
  }
}

function onNew()  { saveError.value = ''; editing.value = BLANK() }
function onEdit(l) { saveError.value = ''; editing.value = { ...l } }

async function onSave(data) {
  saving.value = true
  saveError.value = ''
  try {
    if (data.id) await updateLesson(data.id, data)
    else await createLesson(data)
    // 画像を差し替えていたら、差し替え前の画像を掃除する（保存成功後のみ）
    if (data._prevRef && data._prevRef !== data.ref) deleteRefImage(data._prevRef)
    editing.value = null   // 成功時のみ閉じる
    await refresh()
    invalidateLessons()    // エディタ側の一覧は次に開いたとき取り直す
  } catch (e) {
    // フォームは開いたまま、入力を保持してエラーを表示する
    saveError.value = `保存に失敗しました: ${e.message || e}`
  } finally {
    saving.value = false
  }
}

async function onDelete(l) {
  if (!await showConfirm(`「${l.title}」を削除しますか？一覧から見えなくなります。`)) return
  try {
    await deleteLesson(l.id)   // 論理削除（お題画像は残す）
    await refresh()
    invalidateLessons()
  } catch (e) {
    listError.value = `削除に失敗しました: ${e.message || e}`
  }
}

// 並び替え：表示配列内で入れ替え → sort_order を振り直して永続化
async function move(index, dir) {
  const j = index + dir
  if (j < 0 || j >= lessons.value.length) return
  const arr = [...lessons.value]
  ;[arr[index], arr[j]] = [arr[j], arr[index]]
  lessons.value = arr   // 楽観的に反映
  try {
    await reorderLessons(arr.map(l => l.id))
    invalidateLessons()
  } catch (e) {
    listError.value = `並び替えに失敗しました: ${e.message || e}`
    await refresh()   // 失敗時はサーバの状態へ戻す
  }
}
</script>

<template>
  <div>
    <div class="admin-head">
      <div class="admin-subhead">
        <BaseButton tag="router-link" to="/admin">← 管理トップ</BaseButton>
        <span class="admin-subtitle">レッスン管理</span>
      </div>
      <div class="admin-head-actions">
        <BaseButton variant="accent" @click="onNew">＋ 新規レッスン</BaseButton>
      </div>
    </div>

    <p v-if="listError" class="admin-error">{{ listError }}</p>
    <p v-if="loading" class="admin-login-note">読み込み中…</p>
    <p v-else-if="!lessons.length" class="admin-login-note">レッスンがまだありません。「＋ 新規レッスン」から追加してください。</p>

    <ul class="admin-list">
      <li v-for="(l, i) in lessons" :key="l.id" class="admin-item">
        <div class="admin-item-thumb">
          <img v-if="l.ref" :src="l.ref" :alt="l.title">
        </div>
        <div class="admin-item-body">
          <div class="lesson-meta">
            <span class="lesson-lv">Lv.{{ l.level }}</span>
            <span class="lesson-spec">{{ l.size }}×{{ l.size }} ・ {{ l.palette.length }}色</span>
            <span v-if="!l.ref" class="admin-unpublished" title="お題画像を登録すると公開されます">未公開（画像なし）</span>
          </div>
          <div class="admin-item-title">{{ l.title }}</div>
        </div>
        <div class="admin-item-actions">
          <BaseButton compact :disabled="i === 0" title="上へ" @click="move(i, -1)">▲</BaseButton>
          <BaseButton compact :disabled="i === lessons.length - 1" title="下へ" @click="move(i, 1)">▼</BaseButton>
          <BaseButton @click="onEdit(l)">編集</BaseButton>
          <BaseButton variant="danger" @click="onDelete(l)">削除</BaseButton>
        </div>
      </li>
    </ul>

    <LessonForm
      v-if="editing"
      :lesson="editing"
      :submit-error="saveError"
      :saving="saving"
      @save="onSave"
      @cancel="editing = null"
    />
  </div>
</template>

<style scoped>
.admin-subhead { display: flex; gap: 12px; align-items: center; }
.admin-subtitle { font-family: 'Silkscreen', monospace; font-size: 15px; color: var(--text); letter-spacing: .5px; }
.admin-list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.admin-item {
  display: flex; align-items: center; gap: 14px;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
}
.admin-item-thumb {
  width: 56px; height: 56px; flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--checker) 0 / 12px 12px;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden;
}
.admin-item-thumb img { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; }
.admin-item-body { flex: 1; min-width: 0; }
.admin-item-title { font-size: 15px; color: var(--text); margin-top: 4px; }
.admin-unpublished {
  font-size: 11px;
  color: var(--amber);
  border: 1px solid var(--amber);
  border-radius: 3px;
  padding: 0 5px;
}
.admin-item-actions { display: flex; gap: 6px; align-items: center; }

/* 一覧アイテムのレベル／スペック表示（レッスンカードと同じ意匠） */
.lesson-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }
.lesson-lv { font-family: 'Silkscreen', monospace; font-size: 12px; color: var(--on-accent); background: var(--amber); padding: 2px 8px; border-radius: 3px; }
.lesson-spec { color: var(--muted); font-size: 12px; }

@media (max-width: 820px) {
  .admin-item { flex-wrap: wrap; }
  .admin-item-actions { width: 100%; justify-content: flex-end; }
}
</style>
