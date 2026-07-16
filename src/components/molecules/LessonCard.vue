<script setup>
// レッスンのカード（お題サムネイル＋メタ＋タイトル＋説明）。レッスン選択画面と
// レッスン編集フォームのプレビューで共用する。画像が無いときは #empty スロットを出す。
defineProps({
  level: { type: [Number, String], default: '' },
  size: { type: [Number, String], default: '' },
  colors: { type: Number, default: 0 },
  title: { type: String, default: '' },
  desc: { type: String, default: '' },
  src: { type: String, default: '' },
  current: { type: Boolean, default: false },
})
</script>

<template>
  <article class="lesson-card" :class="{ current }">
    <div class="lesson-thumb">
      <img v-if="src" :src="src" :alt="title">
      <slot v-else name="empty" />
    </div>
    <div class="lesson-body">
      <div class="lesson-meta">
        <span class="lesson-lv">Lv.{{ level }}</span>
        <span class="lesson-spec">{{ size }}×{{ size }} ・ {{ colors }}色</span>
      </div>
      <h3 class="lesson-title">{{ title }}</h3>
      <p class="lesson-desc">{{ desc }}</p>
      <slot />
    </div>
  </article>
</template>

<style scoped>
.lesson-card {
  display: flex;
  flex-direction: column;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}
.lesson-card.current { border-color: var(--amber); box-shadow: 0 0 0 1px var(--amber); }
.lesson-thumb {
  background: var(--checker) 0 / 16px 16px;
  padding: 16px;
  display: flex;
  justify-content: center;
}
.lesson-thumb img {
  width: 128px; height: 128px;
  object-fit: contain;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
.lesson-body { padding: 13px; display: flex; flex-direction: column; flex: 1; }
.lesson-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }
.lesson-lv {
  font-family: 'Silkscreen', monospace;
  font-size: 12px;
  color: var(--on-accent);
  background: var(--amber);
  padding: 2px 8px;
  border-radius: 3px;
}
.lesson-spec { color: var(--muted); font-size: 12px; }
.lesson-title { font-size: 15px; color: var(--text); margin-bottom: 6px; }
.lesson-desc { font-size: 13px; color: var(--muted); line-height: 1.65; margin-bottom: 12px; flex: 1; }
</style>
