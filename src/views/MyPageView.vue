<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { signOut, fetchDisplayName, updateDisplayName } from '~/core/auth.js'
import { fetchWorks, createWork, deleteWork, renameWork, WORK_LIMIT } from '~/core/worksApi.js'
import { worksState, openWork } from '~/core/works.js'
import { exportPixelsPNG } from '~/core/export.js'
import { EXPORT_SCALES } from '~/core/ui.js'
import { ensureLessons } from '~/core/lessons.js'
import { showAlert, showConfirm, showPrompt } from '~/core/dialog.js'
import WorkThumb from '~/components/atoms/WorkThumb.vue'
import BaseButton from '~/components/atoms/BaseButton.vue'

// 保存した作品の一覧・再開・整理。未ログインではルートガードが弾くので、ここは常にログイン済み。
const router = useRouter()

const works = ref([])
const lessonTitles = ref(new Map()) // lesson id → タイトル（作品に紐づくレッスン名の表示用）
const loading = ref(true)
const error = ref('')
const busyId = ref(null) // 操作中の作品 id（そのカードのボタンだけ止める）
const openMenuId = ref(null) // ⋯ メニューを開いている作品 id（同時に開くのは1つ）
const exportScale = ref(1) // 書き出し倍率（マイページ内で共有・エディタとは別・保持しない）

// 表示名（ニックネーム）。ヘッダーでクリックするとインライン編集になる。
const NAME_MAX = 20
const displayName = ref('') // 保存済みの表示名（空なら未取得＝名前を出さない）
const editingName = ref(false) // 入力欄を出しているか
const nameInput = ref('') // 編集中の入力値
const nameError = ref('') // 空欄などのガード文言
const savingName = ref(false) // 保存中（二重確定を防ぐ）
const nameInputEl = ref(null) // 入力欄への参照（開いたらフォーカスする）

const full = computed(() => works.value.length >= WORK_LIMIT)

function closeMenu() { openMenuId.value = null }
function toggleMenu(id) { openMenuId.value = openMenuId.value === id ? null : id }

// メニュー内のクリックは伝播を止めてあるので、外側のクリックだけがここに届く
function onDocClick() { closeMenu() }
function onDocKeydown(e) { if (e.key === 'Escape') closeMenu() }

// メニューを閉じてからメニューで選んだ操作（action = onRename / onDuplicate / onExport / onDelete）を実行する。
function pick(action, w) {
  closeMenu()
  action(w)
}

// 表示名は取れなくても作品一覧は出す（ヘッダーの名前が出ないだけ）ので、works とは独立に読む
async function loadDisplayName() {
  try {
    displayName.value = await fetchDisplayName()
  } catch (e) {
    console.warn(e)
  }
}

// クリックで編集開始。現在の名前を入力欄に入れ、フォーカスして全選択する。
function startEditName() {
  nameInput.value = displayName.value
  nameError.value = ''
  editingName.value = true
  nextTick(() => nameInputEl.value?.select())
}

// フォーカスが外れたら破棄（保存しない）。保存処理中の blur は無視する。
function onNameBlur() {
  if (savingName.value) return
  editingName.value = false
  nameError.value = ''
}

function cancelEditName() {
  editingName.value = false
  nameError.value = ''
}

// Enter で確定。空欄なら文言を出して編集を続けさせる。変更が無ければ黙って閉じる。
async function confirmEditName() {
  if (savingName.value) return
  const name = nameInput.value.trim()
  if (!name) { nameError.value = '表示名を入力してください。'; return }
  if (name === displayName.value) { cancelEditName(); return }

  savingName.value = true
  try {
    displayName.value = await updateDisplayName(name)
    editingName.value = false
    nameError.value = ''
  } catch (e) {
    showAlert(e.message || e)
  } finally {
    savingName.value = false
  }
}

onMounted(async () => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onDocKeydown)
  loadDisplayName()
  try {
    works.value = await fetchWorks()
    // レッスン名は表示のためだけなので、取得に失敗しても一覧は出す
    try {
      const lessons = await ensureLessons()
      lessonTitles.value = new Map(lessons.map(l => [l.id, l.title]))
    } catch { /* レッスン名は出さないだけ */ }
  } catch (e) {
    error.value = e.message || String(e)
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onDocKeydown)
})

function formatDate(iso) {
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

// ファイル名に使えない文字を落とす（空になったら dotwork）
function toFilename(title) {
  const s = title.replace(/[\\/:*?"<>|]/g, '').trim()
  return `${s || 'dotwork'}.png`
}

async function onEdit(w) {
  if (!await showConfirm(`「${w.title}」を編集しますか？エディタの現在の描画は置き換わります。`)) return
  try {
    await openWork(w)
    router.push('/')
  } catch (e) {
    showAlert(e.message || e)
  }
}

async function onRename(w) {
  const title = await showPrompt('新しいタイトル', w.title)
  if (title == null) return
  const t = title.trim()
  if (!t) { showAlert('タイトルを入力してください。'); return }
  if (t.length > 60) { showAlert('タイトルは60文字までです。短くしてください。'); return }
  if (t === w.title) return

  busyId.value = w.id
  try {
    const saved = await renameWork(w.id, t)
    w.title = saved.title
    w.updatedAt = saved.updatedAt
    if (worksState.currentId === w.id) worksState.currentTitle = saved.title
  } catch (e) {
    showAlert(e.message || e)
  } finally {
    busyId.value = null
  }
}

async function onDuplicate(w) {
  if (full.value) {
    showAlert(`保存できる作品は ${WORK_LIMIT} 件までです。不要な作品を削除してください。`)
    return
  }
  busyId.value = w.id
  try {
    const copy = await createWork({ ...w, title: `${w.title} のコピー`.slice(0, 60) })
    works.value.unshift(copy)
  } catch (e) {
    showAlert(e.message || e)
  } finally {
    busyId.value = null
  }
}

function onExport(w) {
  exportPixelsPNG(w.pixels, w.cols, w.rows, toFilename(w.title), exportScale.value)
}

async function onDelete(w) {
  if (!await showConfirm(`「${w.title}」を削除しますか？この操作は取り消せません。`)) return
  busyId.value = w.id
  try {
    await deleteWork(w.id)
    works.value = works.value.filter(x => x.id !== w.id)
    // 削除した作品をエディタで開いていたら、上書き先の紐づけを外す（描いた絵はそのまま残る）
    if (worksState.currentId === w.id) {
      worksState.currentId = null
      worksState.currentTitle = ''
    }
  } catch (e) {
    showAlert(e.message || e)
  } finally {
    busyId.value = null
  }
}

async function onLogout() {
  await signOut()
  worksState.currentId = null
  worksState.currentTitle = ''
  router.push('/')
}
</script>

<template>
  <div id="mypage">
    <div class="mp-inner">
      <header class="mp-head">
        <div class="mp-head-main">
          <span class="mp-logo">MY PAGE</span>

          <button
            v-if="displayName && !editingName"
            class="mp-name"
            title="表示名を変更"
            @click="startEditName"
          >{{ displayName }}<span class="mp-name-pen" aria-hidden="true">✎</span></button>

          <span v-else-if="editingName" class="mp-name-edit">
            <input
              ref="nameInputEl"
              v-model="nameInput"
              class="mp-name-input"
              type="text"
              :maxlength="NAME_MAX"
              aria-label="表示名"
              @keydown.enter.prevent="confirmEditName"
              @keydown.esc.prevent="cancelEditName"
              @blur="onNameBlur"
            >
            <span v-if="nameError" class="mp-name-error">{{ nameError }}</span>
            <span v-else class="mp-name-hint">Enter=確定 / Esc=取消</span>
          </span>
        </div>
        <div class="mp-head-actions">
          <BaseButton tag="router-link" to="/">← エディタへ戻る</BaseButton>
          <BaseButton @click="onLogout">ログアウト</BaseButton>
        </div>
      </header>

      <p v-if="loading" class="mp-note">読み込み中…</p>
      <p v-else-if="error" class="mp-error">{{ error }}</p>

      <template v-else>
        <div class="mp-bar">
          <span class="mp-count" :class="{ full }">{{ works.length }} / {{ WORK_LIMIT }} 件</span>
          <span v-if="full" class="mp-note">上限に達しています。新しく保存するには、どれか削除してください。</span>
        </div>

        <p v-if="!works.length" class="mp-note">
          まだ作品がありません。エディタで絵を描いて「保存」を押すと、ここに並びます。
        </p>

        <div v-else class="mp-grid">
          <article v-for="w in works" :key="w.id" class="work-card">
            <div class="work-thumb">
              <WorkThumb :pixels="w.pixels" :cols="w.cols" :rows="w.rows" />
            </div>
            <div class="work-body">
              <h3 class="work-title">{{ w.title }}</h3>
              <p class="work-meta">
                {{ w.cols }}×{{ w.rows }}
                <template v-if="lessonTitles.get(w.lessonId)">・{{ lessonTitles.get(w.lessonId) }}</template>
              </p>
              <p class="work-date">{{ formatDate(w.updatedAt) }}</p>

              <div class="work-actions">
                <BaseButton variant="accent" class="work-edit" :disabled="busyId === w.id" @click="onEdit(w)">▸ 編集</BaseButton>

                <!-- 主操作以外は ⋯ にまとめる。開閉は openMenuId で1つだけに絞る -->
                <div class="work-menu">
                  <BaseButton
                    compact
                    :disabled="busyId === w.id"
                    :aria-expanded="openMenuId === w.id"
                    aria-haspopup="menu"
                    title="その他の操作"
                    @click.stop="toggleMenu(w.id)"
                  >⋯</BaseButton>

                  <div v-if="openMenuId === w.id" class="work-menu-list" role="menu" @click.stop>
                    <button role="menuitem" @click="pick(onRename, w)">名前を変更</button>
                    <button
                      role="menuitem"
                      :disabled="full"
                      :title="full ? '上限に達しています' : ''"
                      @click="pick(onDuplicate, w)"
                    >複製</button>
                    <div class="work-menu-export">
                      <button role="menuitem" @click="pick(onExport, w)">⤓ PNG を書き出す</button>
                      <select
                        title="書き出し倍率"
                        :value="String(exportScale)"
                        @change="exportScale = Number($event.target.value)"
                      >
                        <option v-for="s in EXPORT_SCALES" :key="s" :value="String(s)">{{ s }}x</option>
                      </select>
                    </div>
                    <div class="work-menu-sep"></div>
                    <button role="menuitem" class="work-menu-danger" @click="pick(onDelete, w)">削除</button>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
#mypage { position: fixed; inset: 0; background: var(--bg); overflow-y: auto; color: var(--text); }
.mp-inner { max-width: 920px; margin: 0 auto; padding: 28px 22px 60px; }
.mp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
.mp-head-main { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.mp-logo { font-family: 'Silkscreen', monospace; color: var(--amber); font-size: 20px; letter-spacing: 1px; }
.mp-head-actions { display: flex; gap: 8px; align-items: center; }

/* 表示名（クリックでインライン編集） */
.mp-name { background: none; border: none; padding: 2px 4px; font-size: 15px; color: var(--text); cursor: pointer; display: inline-flex; align-items: center; gap: 5px; border-radius: 5px; }
.mp-name:hover { color: var(--amber); text-decoration: underline; }
.mp-name-pen { font-size: 12px; color: var(--muted); }
.mp-name:hover .mp-name-pen { color: var(--amber); }
.mp-name-edit { display: inline-flex; align-items: center; gap: 8px; }
.mp-name-input { font-size: 15px; padding: 3px 7px; width: 12em; max-width: 60vw; border: 1px solid var(--border); border-radius: 5px; background: var(--bg); color: var(--text); }
.mp-name-hint { font-size: 12px; color: var(--muted); }
.mp-name-error { font-size: 12px; color: #dc2626; }

.mp-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.mp-count { font-size: 13px; color: var(--muted); }
.mp-count.full { color: var(--amber); }
.mp-note { color: var(--muted); font-size: 13px; line-height: 1.7; }

.mp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
/* ⋯ メニューをカード外へはみ出させるため overflow は切らない。角丸はサムネイル側で受け持つ。 */
.work-card { display: flex; flex-direction: column; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; }
.work-thumb { background: var(--checker) 0 / 16px 16px; padding: 16px; border-radius: 7px 7px 0 0; }
.work-body { padding: 12px 13px 13px; display: flex; flex-direction: column; flex: 1; }
.work-title { font-size: 15px; color: var(--text); word-break: break-word; }
.work-meta { font-size: 12px; color: var(--muted); margin-top: 5px; }
.work-date { font-size: 12px; color: var(--muted); margin-top: 2px; margin-bottom: 11px; }
.work-actions { display: flex; align-items: center; gap: 6px; margin-top: auto; }
.work-actions button { font-size: 13px; padding: 4px 8px; }
/* 作品カードの操作ボタン（編集・⋯）は一覧で少し小さめ。BaseButton の既定サイズより優先させる。 */
.work-actions :deep(.btn) { font-size: 13px; padding: 4px 8px; }
.work-edit { flex: 1; }

/* ⋯ ドロップダウン（トリガーは BaseButton compact、項目は素の button のメニュー） */
.work-menu { position: relative; flex-shrink: 0; }
.work-menu-list {
  position: absolute;
  right: 0;
  top: calc(100% + 4px);
  min-width: 172px;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
  z-index: var(--z-dropdown);
}
.work-menu-list button { width: 100%; text-align: left; background: none; border: none; border-radius: 4px; padding: 7px 9px; }
.work-menu-list button:hover:not(:disabled) { background: var(--bg3); color: var(--amber); }
.work-menu-export { display: flex; align-items: center; gap: 4px; }
.work-menu-export button { flex: 1; width: auto; }
.work-menu-export select { flex-shrink: 0; padding: 4px 6px; }
.work-menu-sep { height: 1px; background: var(--border); margin: 4px 2px; }
.work-menu-danger { color: #dc2626; }
.work-menu-danger:hover:not(:disabled) { background: #fef2f2; color: #dc2626; }
</style>
