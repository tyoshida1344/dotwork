<script setup>
import { S } from '~/core/state.js'
import { ui } from '~/core/ui.js'
import { drawPx } from '~/core/canvas.js'
import { extractPaletteFromImage } from '~/core/palette.js'
import { lessonState } from '~/core/lessons.js'
import { showAlert } from '~/core/dialog.js'
import SidePanel from '~/components/molecules/SidePanel.vue'
import SliderRow from '~/components/molecules/SliderRow.vue'
import BaseButton from '~/components/atoms/BaseButton.vue'
import { ref } from 'vue'

const fileInput = ref(null)
const isDragOver = ref(false)
const previewSrc = ref('')

function loadFile(file) {
  if (!file) return
  const fr = new FileReader()
  fr.onload = e => {
    const img = new Image()
    img.onload = () => {
      S.refImg = img
      previewSrc.value = e.target.result
      ui.lessonOverlayOn = false   // 手動の参照画像に差し替わったのでお題オーバーレイ表示は解除
      drawPx()
    }
    img.src = e.target.result
  }
  fr.readAsDataURL(file)
}

function onFileChange(e) { loadFile(e.target.files[0]) }
function onDragOver(e)   { e.preventDefault(); isDragOver.value = true }
function onDragLeave()   { isDragOver.value = false }
function onDrop(e)       { e.preventDefault(); isDragOver.value = false; loadFile(e.dataTransfer.files[0]) }
function onOverlayInput(e) {
  S.overlay = parseInt(e.target.value) / 100
  drawPx()
}
function onExtract() {
  if (lessonState.active) return  // レッスン中は色セットを固定（ボタンも disabled）
  if (!S.refImg) { showAlert('先に参照画像を読み込んでください。'); return }
  S.palette = extractPaletteFromImage(S.refImg)
  ui.palKey = 'ref'
}
function onConvert() {
  // お題オーバーレイ中はお題（クロスオリジン画像）が S.refImg。canvas を汚染して
  // getImageData が失敗するため変換させない（ボタンも disabled）。
  if (ui.lessonOverlayOn) { showAlert('お題はドットに変換できません。「背景に重ねる」を解除してください。'); return }
  if (!S.refImg) { showAlert('先に参照画像を読み込んでください。'); return }
  ui.cropOpen = true
}
function clearRef() {
  S.refImg = null
  previewSrc.value = ''
  ui.lessonOverlayOn = false   // 参照画像を消したらお題オーバーレイのトグル表示も戻す
  drawPx()
}
</script>

<template>
  <SidePanel title="REFERENCE" tooltip="参照画像を読み込んでトレースやパレット抽出、ドットへの直接変換に使用。オーバーレイ不透明度を調整して下絵として表示できます。">
    <img
      v-if="previewSrc"
      class="ref-prev"
      :src="previewSrc"
      alt="reference"
    >
    <div
      class="ref-drop"
      :class="{ over: isDragOver }"
      @click="fileInput.click()"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      ここにドロップ<br>またはクリックして開く
    </div>
    <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onFileChange">

    <SliderRow label="オーバーレイ" :value="`${Math.round(S.overlay * 100)}%`" style="margin-top:7px">
      <input
        type="range" min="0" max="80" step="5"
        :value="Math.round(S.overlay * 100)"
        @input="onOverlayInput"
      >
    </SliderRow>
    <BaseButton
      block
      variant="accent"
      style="margin-top:5px"
      :disabled="ui.lessonOverlayOn"
      :title="ui.lessonOverlayOn ? 'お題はドットに変換できません。「背景に重ねる」を解除してください。' : ''"
      @click="onConvert"
    >▦ ドットに変換</BaseButton>
    <BaseButton
      block
      :disabled="!!lessonState.active"
      :title="lessonState.active ? 'レッスン中はパレットが固定されます' : ''"
      @click="onExtract"
    >⬦ パレット抽出</BaseButton>
    <BaseButton block style="color:var(--muted)" @click="clearRef">✕ 参照画像を消去</BaseButton>
  </SidePanel>
</template>

<style scoped>
.ref-prev {
  width: 100%; max-height: 120px;
  object-fit: contain;
  border: 1px solid var(--border);
  border-radius: 3px;
  margin-bottom: 7px;
  background: var(--bg);
  display: block;
}
.ref-drop {
  border: 2px dashed var(--border);
  border-radius: 4px;
  padding: 11px;
  text-align: center;
  color: var(--muted);
  cursor: pointer;
  font-size: 13px;
  line-height: 1.6;
  transition: border-color .2s;
}
.ref-drop:hover, .ref-drop.over { border-color: var(--amber); color: var(--amber); }
</style>
