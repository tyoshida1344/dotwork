<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { fetchPublicWorks, GALLERY_LIMIT } from '~/core/galleryApi.js'
import { applyReferenceFromPixels } from '~/core/works.js'
import { ensureLessons } from '~/core/lessons.js'
import { showAlert } from '~/core/dialog.js'
import WorkThumb from '~/components/atoms/WorkThumb.vue'
import BaseButton from '~/components/atoms/BaseButton.vue'
import BaseModal from '~/components/templates/BaseModal.vue'

// 全ユーザーの公開作品を横断表示する。閲覧はログイン不要（RLS が公開行だけ見せる）。
const router = useRouter()

const works = ref([])
const lessonTitles = ref(new Map()) // lesson id → タイトル
const loading = ref(true)
const error = ref('')
const selected = ref(null) // 詳細モーダルで開いている作品 | null

// 絞り込み条件（すべて取得済みの一覧に対して画面側で効かせる）
const keyword = ref('')      // タイトル・投稿者名の部分一致
const lessonFilter = ref('') // レッスン id（'' = すべて）
const sizeFilter = ref('')   // キャンバス一辺（'' = すべて）

// 上限まで取れたら、それより古い公開作品は一覧に出ていない旨を知らせる
const capped = computed(() => works.value.length >= GALLERY_LIMIT)

// レッスン絞り込みの選択肢はレッスンテーブル（公開レッスン）から作る。
// 公開作品が増えても一覧を走査しないよう、取得済みの作品からは作らない。
const lessonOptions = computed(() =>
  [...lessonTitles.value].map(([id, title]) => ({ id, title })))

// サイズ絞り込みは固定候補（TheStatusBar / LessonForm の SIZE セレクトと一致させる）。
const SIZES = [16, 24, 32, 48]

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  const lid = lessonFilter.value === '' ? null : Number(lessonFilter.value)
  const size = sizeFilter.value === '' ? null : Number(sizeFilter.value)
  return works.value.filter(w => {
    if (kw && !w.title.toLowerCase().includes(kw) && !w.displayName.toLowerCase().includes(kw)) return false
    if (lid != null && w.lessonId !== lid) return false
    if (size != null && w.cols !== size) return false
    return true
  })
})

onMounted(async () => {
  try {
    works.value = await fetchPublicWorks()
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

// 選んだ公開作品を参照画像として重ね、エディタへ移動する（現在の描画は消さない）。
async function useAsReference(w) {
  try {
    await applyReferenceFromPixels(w.pixels, w.cols, w.rows)
    selected.value = null
    router.push('/')
  } catch (e) {
    showAlert(e.message || e)
  }
}
</script>

<template>
  <div id="gallery">
    <div class="gl-inner">
      <header class="gl-head">
        <span class="gl-logo">GALLERY</span>
        <BaseButton tag="router-link" to="/">← エディタへ戻る</BaseButton>
      </header>
      <p class="gl-lead">みんなが公開したドット絵です。気に入った作品は「お手本にする」で自分のキャンバスに薄く重ねて、なぞりながら練習できます。</p>

      <p v-if="loading" class="gl-note">読み込み中…</p>
      <p v-else-if="error" class="gl-error">{{ error }}</p>

      <template v-else>
        <div class="gl-filters">
          <input
            v-model="keyword"
            class="gl-search"
            type="search"
            placeholder="タイトル・投稿者名で検索"
            aria-label="タイトル・投稿者名で検索"
          >
          <select v-model="lessonFilter" aria-label="レッスンで絞り込み">
            <option value="">すべてのレッスン</option>
            <option v-for="l in lessonOptions" :key="l.id" :value="l.id">{{ l.title }}</option>
          </select>
          <select v-model="sizeFilter" aria-label="サイズで絞り込み">
            <option value="">すべてのサイズ</option>
            <option v-for="s in SIZES" :key="s" :value="s">{{ s }}×{{ s }}</option>
          </select>
        </div>

        <p v-if="!works.length" class="gl-note">まだ公開作品がありません。マイページで作品を「公開」にすると、ここに並びます。</p>
        <p v-else-if="!filtered.length" class="gl-note">条件に合う作品がありません。</p>

        <div v-else class="gl-grid">
          <article
            v-for="w in filtered"
            :key="w.id"
            class="gl-card"
            role="button"
            tabindex="0"
            @click="selected = w"
            @keydown.enter="selected = w"
          >
            <div class="gl-thumb">
              <WorkThumb :pixels="w.pixels" :cols="w.cols" :rows="w.rows" />
            </div>
            <div class="gl-body">
              <h3 class="gl-title">{{ w.title }}</h3>
              <p class="gl-by">{{ w.displayName || '—' }}</p>
              <p class="gl-meta">
                {{ w.cols }}×{{ w.rows }}
                <template v-if="lessonTitles.get(w.lessonId)">・{{ lessonTitles.get(w.lessonId) }}</template>
              </p>
            </div>
          </article>
        </div>

        <p v-if="capped" class="gl-note gl-cap">新しい {{ GALLERY_LIMIT }} 件を表示しています。</p>
      </template>
    </div>

    <!-- 詳細（拡大表示＋お手本にする） -->
    <BaseModal :open="!!selected" @close="selected = null">
      <div v-if="selected" class="gl-detail" @click.stop>
        <div class="gl-detail-thumb">
          <WorkThumb :pixels="selected.pixels" :cols="selected.cols" :rows="selected.rows" />
        </div>
        <h3 class="gl-detail-title">{{ selected.title }}</h3>
        <p class="gl-detail-by">{{ selected.displayName || '—' }}</p>
        <p class="gl-detail-meta">
          {{ selected.cols }}×{{ selected.rows }}
          <template v-if="lessonTitles.get(selected.lessonId)">・{{ lessonTitles.get(selected.lessonId) }}</template>
        </p>
        <div class="gl-detail-actions">
          <BaseButton block variant="accent" @click="useAsReference(selected)">▦ お手本にする</BaseButton>
          <BaseButton block @click="selected = null">閉じる</BaseButton>
        </div>
        <p class="gl-detail-hint">「お手本にする」を押すと、この絵を参照画像としてエディタのキャンバスに薄く重ねます。今の描画は消えません。</p>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
#gallery { position: fixed; inset: 0; background: var(--bg); overflow-y: auto; color: var(--text); }
.gl-inner { max-width: 920px; margin: 0 auto; padding: 28px 22px 60px; }
.gl-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
.gl-logo { font-family: 'Silkscreen', monospace; color: var(--amber); font-size: 20px; letter-spacing: 1px; }
.gl-lead { color: var(--muted); font-size: 13px; line-height: 1.7; margin-bottom: 18px; }
.gl-note { color: var(--muted); font-size: 13px; line-height: 1.7; }
.gl-cap { margin-top: 18px; text-align: center; }

/* 絞り込みバー */
.gl-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.gl-search { flex: 1 1 220px; min-width: 0; padding: 6px 10px; border: 1px solid var(--border); border-radius: 5px; background: var(--bg3); color: var(--text); font-size: 13px; }
.gl-filters select { padding: 6px 8px; }

.gl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 14px; }
.gl-card { display: flex; flex-direction: column; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; cursor: pointer; overflow: hidden; transition: border-color .15s; }
.gl-card:hover, .gl-card:focus-visible { border-color: var(--amber); outline: none; }
.gl-thumb { background: var(--checker) 0 / 16px 16px; padding: 14px; }
.gl-body { padding: 10px 11px 12px; }
.gl-title { font-size: 14px; color: var(--text); word-break: break-word; }
.gl-by { font-size: 12px; color: var(--muted); margin-top: 4px; }
.gl-meta { font-size: 12px; color: var(--muted); margin-top: 2px; }

/* 詳細モーダル */
.gl-detail { background: var(--bg2); border: 1px solid var(--border); border-radius: 10px; padding: 18px; width: 320px; max-width: 92vw; }
.gl-detail-thumb { background: var(--checker) 0 / 18px 18px; padding: 20px; border-radius: 6px; }
.gl-detail-thumb :deep(.work-thumb-cv) { max-width: 240px; margin: 0 auto; }
.gl-detail-title { font-size: 16px; color: var(--text); margin-top: 14px; word-break: break-word; }
.gl-detail-by { font-size: 13px; color: var(--muted); margin-top: 5px; }
.gl-detail-meta { font-size: 12px; color: var(--muted); margin-top: 3px; }
.gl-detail-actions { display: flex; flex-direction: column; gap: 7px; margin-top: 14px; }
.gl-detail-hint { font-size: 12px; color: var(--muted); line-height: 1.6; margin-top: 10px; }

@media (max-width: 820px) {
  .gl-inner { padding: 20px 14px 48px; }
}
</style>
