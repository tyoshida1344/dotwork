<script setup>
import { S } from '~/core/state.js'
import { ui } from '~/core/ui.js'
import { zoomCanvas } from '~/core/canvas.js'
import BaseButton from '~/components/atoms/BaseButton.vue'

const TOOL_NAMES = {
  pencil: 'ペン', eraser: '消しゴム', line: '直線',
  bucket: '塗りつぶし', picker: 'スポイト', dither: 'ディザ',
}
</script>

<template>
  <div id="status">
    <span style="min-width:60px">
      {{ ui.hoverPos ? `${ui.hoverPos[0]}, ${ui.hoverPos[1]}` : '–, –' }}
    </span>
    <span style="display:flex;align-items:center;gap:5px;min-width:110px">
      <span
        style="width:14px;height:14px;border-radius:2px;border:1px solid var(--border);flex-shrink:0"
        :style="ui.hoverColor
          ? { background: ui.hoverColor }
          : { background: 'repeating-linear-gradient(45deg,#c8ccd2 0,#c8ccd2 3px,#eceef1 3px,#eceef1 6px)' }"
      ></span>
      <span :style="{ color: ui.hoverColor ? 'var(--text)' : 'var(--muted)' }">
        {{ ui.hoverColor ?? '透明' }}
      </span>
    </span>
    <span style="min-width:170px">
      <span style="color:var(--amber)">L</span> {{ TOOL_NAMES[S.toolL] ?? S.toolL }}
      <span class="rtool"><span style="color:var(--teal);margin-left:8px">R</span> {{ TOOL_NAMES[S.toolR] ?? S.toolR }}</span>
    </span>
    <div class="zctrl">
      <BaseButton @click="zoomCanvas(-4)">−</BaseButton>
      <span style="min-width:30px;text-align:center">{{ S.cell }}px</span>
      <BaseButton @click="zoomCanvas(+4)">+</BaseButton>
    </div>
  </div>
</template>

<style scoped>
#status {
  grid-area: stat;
  background: var(--bg2);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 12px;
  gap: 18px;
  color: var(--muted);
  font-size: 13px;
}
.zctrl { display: flex; align-items: center; gap: 3px; }
/* ズームの ± は固定サイズの小ボタン。BaseButton の既定サイズより優先させるため
   :deep() で内側の button を直接指定する（特異度で勝たせる）。 */
.zctrl :deep(button) { width: 22px; height: 20px; padding: 0; font-size: 17px; line-height: 1; }

@media (max-width: 820px) {
  /* 情報は省略表示・ズームは右に固定で大きく */
  #status { gap: 10px; font-size: 12px; padding: 0 10px; }
  #status > span { min-width: 0 !important; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .zctrl { margin-left: auto; flex-shrink: 0; }
  .zctrl :deep(button) { width: 36px; height: 28px; font-size: 20px; }
  .rtool { display: none; }
}
</style>
