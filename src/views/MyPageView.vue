<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { signOut } from '../core/auth.js'
import { fetchWorks, createWork, deleteWork, renameWork, WORK_LIMIT } from '../core/worksApi.js'
import { worksState, openWork } from '../core/works.js'
import { exportPixelsPNG } from '../core/export.js'
import { EXPORT_SCALES } from '../core/ui.js'
import { ensureLessons } from '../core/lessons.js'
import WorkThumb from '../components/mypage/WorkThumb.vue'

// 保存した作品の一覧・再開・整理。未ログインではルートガードが弾くので、ここは常にログイン済み。
const router = useRouter()

const works = ref([])
const lessonTitles = ref(new Map())   // lesson id → タイトル（作品に紐づくレッスン名の表示用）
const loading = ref(true)
const error = ref('')
const busyId = ref(null)              // 操作中の作品 id（そのカードのボタンだけ止める）
const openMenuId = ref(null)          // ⋯ メニューを開いている作品 id（同時に開くのは1つ）
const exportScale = ref(1)            // 書き出し倍率（マイページ内で共有・エディタとは別・保持しない）

const full = computed(() => works.value.length >= WORK_LIMIT)

function closeMenu() { openMenuId.value = null }
function toggleMenu(id) { openMenuId.value = openMenuId.value === id ? null : id }

// メニュー内のクリックは伝播を止めてあるので、外側のクリックだけがここに届く
function onDocClick() { closeMenu() }
function onDocKeydown(e) { if (e.key === 'Escape') closeMenu() }

// メニュー項目を選んだら、閉じる描画を済ませてから実行する。
// confirm/prompt は同期的にブロックするため、nextTick を挟まないと
// ネイティブダイアログの背後にメニューが開いたまま残る。
async function pick(action, w) {
  closeMenu()
  await nextTick()
  action(w)
}

onMounted(async () => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onDocKeydown)
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
  if (!confirm(`「${w.title}」を編集しますか？エディタの現在の描画は置き換わります。`)) return
  try {
    await openWork(w)
    router.push('/')
  } catch (e) {
    alert(e.message || e)
  }
}

async function onRename(w) {
  const title = prompt('新しいタイトル', w.title)
  if (title == null) return
  const t = title.trim()
  if (!t) { alert('タイトルを入力してください。'); return }
  if (t.length > 60) { alert('タイトルは60文字までです。短くしてください。'); return }
  if (t === w.title) return

  busyId.value = w.id
  try {
    const saved = await renameWork(w.id, t)
    w.title = saved.title
    w.updatedAt = saved.updatedAt
    if (worksState.currentId === w.id) worksState.currentTitle = saved.title
  } catch (e) {
    alert(e.message || e)
  } finally {
    busyId.value = null
  }
}

async function onDuplicate(w) {
  if (full.value) {
    alert(`保存できる作品は ${WORK_LIMIT} 件までです。不要な作品を削除してください。`)
    return
  }
  busyId.value = w.id
  try {
    const copy = await createWork({ ...w, title: `${w.title} のコピー`.slice(0, 60) })
    works.value.unshift(copy)
  } catch (e) {
    alert(e.message || e)
  } finally {
    busyId.value = null
  }
}

function onExport(w) {
  exportPixelsPNG(w.pixels, w.cols, w.rows, toFilename(w.title), exportScale.value)
}

async function onDelete(w) {
  if (!confirm(`「${w.title}」を削除しますか？この操作は取り消せません。`)) return
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
    alert(e.message || e)
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
        </div>
        <div class="mp-head-actions">
          <router-link class="hbtn" to="/">← エディタへ戻る</router-link>
          <button @click="onLogout">ログアウト</button>
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
                <button class="btn-a work-edit" :disabled="busyId === w.id" @click="onEdit(w)">▸ 編集</button>

                <!-- 主操作以外は ⋯ にまとめる。開閉は openMenuId で1つだけに絞る -->
                <div class="work-menu">
                  <button
                    class="work-menu-btn"
                    :disabled="busyId === w.id"
                    :aria-expanded="openMenuId === w.id"
                    aria-haspopup="menu"
                    title="その他の操作"
                    @click.stop="toggleMenu(w.id)"
                  >⋯</button>

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
