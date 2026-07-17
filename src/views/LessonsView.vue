<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { LESSONS, lessonState, startLesson, ensureLessons } from '~/core/lessons.js'
import { showConfirm } from '~/core/dialog.js'
import BaseButton from '~/components/atoms/BaseButton.vue'
import BaseSpinner from '~/components/atoms/BaseSpinner.vue'
import LessonCard from '~/components/molecules/LessonCard.vue'

// お題を選んでドット絵を練習する画面。閲覧はログイン不要（レッスンは全員向け）。
const router = useRouter()

const loading = ref(true)

// 絞り込み条件（取得済みの一覧に対して画面側で効かせる）。
const levelFilter = ref('') // Lv（'' = すべて）
const sizeFilter = ref('') // キャンバス一辺（'' = すべて）

// 絞り込みの選択肢は取得済みレッスンの実値から作る（該当0件の候補を出さないため）。
const levelOptions = computed(() => [...new Set(LESSONS.map(l => l.level))].sort((a, b) => a - b))
const sizeOptions = computed(() => [...new Set(LESSONS.map(l => l.size))].sort((a, b) => a - b))

const filtered = computed(() => {
  const lv = levelFilter.value === '' ? null : Number(levelFilter.value)
  const size = sizeFilter.value === '' ? null : Number(sizeFilter.value)
  return LESSONS.filter(l => {
    if (lv != null && l.level !== lv) return false
    if (size != null && l.size !== size) return false
    return true
  })
})

// 初めて開いたときに一覧を読み込む（初期ロードを軽くするため遅延）。
// 取得が終わるまでスピナーを出す（loadLessons は失敗しても throw せず空で返す）。
onMounted(async () => {
  try {
    await ensureLessons()
  } finally {
    loading.value = false
  }
})

// レッスンを開始してエディタへ移動する。開始すると現在の描画は消えるため確認する。
async function onStart(lesson) {
  if (!await showConfirm(`「${lesson.title}」を始めますか？現在の描画は消去されます。`)) return
  startLesson(lesson)
  router.push('/')
}
</script>

<template>
  <div id="lessons">
    <div class="ls-inner">
      <header class="ls-head">
        <span class="ls-logo">LESSONS</span>
        <BaseButton tag="router-link" to="/">← エディタへ戻る</BaseButton>
      </header>
      <p class="ls-lead">お題を見ながらドット絵を描いて練習しましょう。レベルごとにキャンバスサイズと使える色が固定されます。</p>

      <div v-if="loading" class="ls-loading">
        <BaseSpinner :size="30" />
      </div>

      <template v-else>
        <div v-if="LESSONS.length" class="ls-filters">
          <select v-model="levelFilter" aria-label="レベルで絞り込み">
            <option value="">すべてのレベル</option>
            <option v-for="lv in levelOptions" :key="lv" :value="lv">Lv.{{ lv }}</option>
          </select>
          <select v-model="sizeFilter" aria-label="サイズで絞り込み">
            <option value="">すべてのサイズ</option>
            <option v-for="s in sizeOptions" :key="s" :value="s">{{ s }}×{{ s }}</option>
          </select>
        </div>

        <p v-if="!LESSONS.length" class="ls-note">まだレッスンがありません。</p>
        <p v-else-if="!filtered.length" class="ls-note">条件に合うレッスンがありません。</p>

        <div v-else class="ls-grid">
          <LessonCard
            v-for="l in filtered"
            :key="l.id"
            :level="l.level"
            :size="l.size"
            :colors="l.palette.length"
            :title="l.title"
            :desc="l.desc"
            :src="l.ref"
            :current="lessonState.active && lessonState.active.id === l.id"
          >
            <BaseButton block variant="accent" @click="onStart(l)">▦ このレッスンを始める</BaseButton>
          </LessonCard>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
#lessons { position: fixed; inset: 0; background: var(--bg); overflow-y: auto; color: var(--text); }
.ls-inner { max-width: 920px; margin: 0 auto; padding: 28px 22px 60px; }
.ls-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; }
.ls-logo { font-family: 'Silkscreen', monospace; color: var(--amber); font-size: 20px; letter-spacing: 1px; }
.ls-lead { color: var(--muted); font-size: 13px; line-height: 1.7; max-width: 640px; margin-bottom: 18px; }
.ls-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.ls-filters select { padding: 6px 8px; }
.ls-note { color: var(--muted); font-size: 13px; line-height: 1.7; }
.ls-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.ls-loading { display: flex; justify-content: center; padding: 60px 0; }

@media (max-width: 820px) {
  .ls-inner { padding: 20px 14px 48px; }
  .ls-logo { font-size: 18px; }
}
</style>
