<script setup>
import { watch } from 'vue'
import { ui } from '~/core/ui.js'
import { LESSONS, lessonState, startLesson, ensureLessons } from '~/core/lessons.js'
import { showConfirm } from '~/core/dialog.js'
import BaseButton from '~/components/atoms/BaseButton.vue'
import LessonCard from '~/components/molecules/LessonCard.vue'

// レッスン画面を初めて開いたときに一覧を読み込む（初期ロードを軽くするため遅延）。
watch(() => ui.lessonPageOpen, open => { if (open) ensureLessons() })

async function onStart(lesson) {
  // 開始すると現在の描画は消えるため確認する（ヘッダーのリサイズと同様の作法）
  if (!await showConfirm(`「${lesson.title}」を始めますか？現在の描画は消去されます。`)) return
  startLesson(lesson)
}
</script>

<template>
  <div id="lpage" :class="{ open: ui.lessonPageOpen }">
    <div id="lpage-inner">
      <header id="lpage-head">
        <span id="lpage-logo">LESSONS</span>
        <p>お題を見ながらドット絵を描いて練習しましょう。レベルごとにキャンバスサイズと使える色が固定されます。</p>
      </header>

      <div class="lesson-grid">
        <LessonCard
          v-for="l in LESSONS"
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
    </div>

    <button id="lpage-close" @click="ui.lessonPageOpen = false">✕ 閉じる</button>
  </div>
</template>

<style scoped>
#lpage {
  display: none;
  position: fixed;
  inset: 0;
  background: var(--bg);
  z-index: var(--z-overlay);
  overflow-y: auto;
}
#lpage.open { display: block; }
#lpage-inner { max-width: 920px; margin: 0 auto; padding: 36px 28px 60px; }
#lpage-head { margin-bottom: 26px; }
#lpage-logo {
  display: block;
  font-family: 'Silkscreen', monospace;
  color: var(--amber);
  font-size: 22px;
  letter-spacing: 1px;
  margin-bottom: 10px;
}
#lpage-head p { color: var(--muted); font-size: 14px; line-height: 1.7; max-width: 640px; }
.lesson-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
#lpage-close { position: fixed; top: 12px; right: 16px; padding: 5px 14px; z-index: 1; }

@media (max-width: 820px) {
  #lpage-inner { padding: 20px 16px 48px; }
  #lpage-logo { font-size: 18px; }
  #lpage-close { top: 8px; right: 10px; }
}
</style>
