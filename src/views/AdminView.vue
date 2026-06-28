<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { isSupabaseConfigured } from '../core/supabase.js'
import {
  fetchLessons, createLesson, updateLesson, deleteLesson, reorderLessons,
  deleteRefImage, signIn, signOut, getSession, onAuthChange,
} from '../core/lessonsApi.js'
import { invalidateLessons } from '../core/lessons.js'
import AdminLogin from '../components/admin/AdminLogin.vue'
import LessonForm from '../components/admin/LessonForm.vue'

const configured = isSupabaseConfigured

const session = ref(null)
const lessons = ref([])
const loading = ref(false)
const listError = ref('')

const loginLoading = ref(false)
const loginError = ref('')

const editing = ref(null)   // 編集中のレッスン（新規は空テンプレート）| null
const saveError = ref('')   // 編集フォームに表示する保存エラー
const saving = ref(false)

const BLANK = () => ({ rowId: undefined, id: '', level: 1, title: '', desc: '', size: 16, palette: ['#000000'], ref: '' })

let unsub = () => {}
onMounted(async () => {
  if (!configured) return
  // getSession() で初期表示を即決め（ログインフォームのちらつき防止）。
  // 一覧の取得は onAuthChange（購読時に INITIAL_SESSION が届く）に任せ、二重取得を避ける。
  session.value = await getSession()
  unsub = onAuthChange(s => {
    session.value = s
    if (s) refresh()
  })
})
onUnmounted(() => unsub())

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

async function handleLogin({ email, password }) {
  loginLoading.value = true
  loginError.value = ''
  try {
    await signIn(email, password)
    // セッションは onAuthChange 経由で反映され refresh される
  } catch (e) {
    loginError.value = `ログインに失敗しました: ${e.message || e}`
  } finally {
    loginLoading.value = false
  }
}

async function handleLogout() {
  await signOut()
  session.value = null
  lessons.value = []
}

function onNew()  { saveError.value = ''; editing.value = BLANK() }
function onEdit(l) { saveError.value = ''; editing.value = { ...l } }

async function onSave(data) {
  saving.value = true
  saveError.value = ''
  try {
    if (data.rowId) await updateLesson(data.rowId, data)
    else await createLesson(data)
    // 画像を差し替えていたら、差し替え前の画像を掃除する（保存成功後のみ）
    if (data._prevRef && data._prevRef !== data.ref) deleteRefImage(data._prevRef)
    editing.value = null   // 成功時のみ閉じる
    await refresh()
    invalidateLessons()    // エディタ側の一覧は次に開いたとき取り直す
  } catch (e) {
    // フォームは開いたまま、入力を保持してエラーを表示する
    saveError.value = e.code === '23505'
      ? 'その ID（スラッグ）は既に使われています。別の ID にしてください。'
      : `保存に失敗しました: ${e.message || e}`
  } finally {
    saving.value = false
  }
}

async function onDelete(l) {
  if (!confirm(`「${l.title}」を削除しますか？この操作は元に戻せません。`)) return
  try {
    await deleteLesson(l.rowId)
    if (l.ref) deleteRefImage(l.ref)   // 紐づくお題画像も掃除
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
    await reorderLessons(arr.map(l => l.rowId))
    invalidateLessons()
  } catch (e) {
    listError.value = `並び替えに失敗しました: ${e.message || e}`
    await refresh()   // 失敗時はサーバの状態へ戻す
  }
}
</script>

<template>
  <div id="admin">
    <!-- Supabase 未設定 -->
    <div v-if="!configured" class="admin-notice">
      <span class="admin-logo">LESSON ADMIN</span>
      <p>Supabase が未設定です。<code>.env</code> に <code>VITE_SUPABASE_URL</code> と <code>VITE_SUPABASE_ANON_KEY</code> を設定してください。</p>
      <p class="admin-login-note">セットアップ手順: <code>README.md</code> の「レッスン管理（Supabase）」</p>
      <router-link class="admin-btn" to="/">← エディタに戻る</router-link>
    </div>

    <!-- 未ログイン -->
    <AdminLogin
      v-else-if="!session"
      :loading="loginLoading"
      :error="loginError"
      @submit="handleLogin"
    />

    <!-- 管理画面本体 -->
    <div v-else class="admin-main">
      <header class="admin-head">
        <span class="admin-logo">LESSON ADMIN</span>
        <div class="admin-head-actions">
          <button class="btn-a" @click="onNew">＋ 新規レッスン</button>
          <router-link class="admin-btn" to="/">エディタへ</router-link>
          <button @click="handleLogout">ログアウト</button>
        </div>
      </header>

      <p v-if="listError" class="admin-error">{{ listError }}</p>
      <p v-if="loading" class="admin-login-note">読み込み中…</p>
      <p v-else-if="!lessons.length" class="admin-login-note">レッスンがまだありません。「＋ 新規レッスン」から追加してください。</p>

      <ul class="admin-list">
        <li v-for="(l, i) in lessons" :key="l.rowId" class="admin-item">
          <div class="admin-item-thumb">
            <img v-if="l.ref" :src="l.ref" :alt="l.title">
          </div>
          <div class="admin-item-body">
            <div class="lesson-meta">
              <span class="lesson-lv">Lv.{{ l.level }}</span>
              <span class="lesson-spec">{{ l.size }}×{{ l.size }} ・ {{ l.palette.length }}色 ・ {{ l.id }}</span>
            </div>
            <div class="admin-item-title">{{ l.title }}</div>
          </div>
          <div class="admin-item-actions">
            <button class="admin-move" :disabled="i === 0" title="上へ" @click="move(i, -1)">▲</button>
            <button class="admin-move" :disabled="i === lessons.length - 1" title="下へ" @click="move(i, 1)">▼</button>
            <button @click="onEdit(l)">編集</button>
            <button class="btn-r" @click="onDelete(l)">削除</button>
          </div>
        </li>
      </ul>
    </div>

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
