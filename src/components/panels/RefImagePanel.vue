<script setup>
import { S } from '../../core/state.js'
import { ui } from '../../core/ui.js'
import { drawPx } from '../../core/canvas.js'
import { extractPaletteFromImage } from '../../core/palette.js'
import { lessonState } from '../../core/lessons.js'
import SidePanel from '../SidePanel.vue'
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
  if (!S.refImg) { alert('先に参照画像を読み込んでください。'); return }
  S.palette = extractPaletteFromImage(S.refImg)
  ui.palKey = 'ref'
}
function onConvert() {
  // お題オーバーレイ中はお題（クロスオリジン画像）が S.refImg。canvas を汚染して
  // getImageData が失敗するため変換させない（ボタンも disabled）。
  if (ui.lessonOverlayOn) { alert('お題は「ドットに変換」できません。'); return }
  if (!S.refImg) { alert('先に参照画像を読み込んでください。'); return }
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

    <div class="srow" style="margin-top:7px">
      <span class="slbl">オーバーレイ</span>
      <input
        type="range" min="0" max="80" step="5"
        :value="Math.round(S.overlay * 100)"
        @input="onOverlayInput"
      >
      <span class="sval">{{ Math.round(S.overlay * 100) }}%</span>
    </div>
    <button
      class="abtn btn-a"
      style="margin-top:5px"
      :disabled="ui.lessonOverlayOn"
      :title="ui.lessonOverlayOn ? 'お題は変換できません（「背景に重ねる」を解除してください）' : ''"
      @click="onConvert"
    >▦ ドットに変換</button>
    <button
      class="abtn"
      :disabled="!!lessonState.active"
      :title="lessonState.active ? 'レッスン中は色セットが固定されます' : ''"
      @click="onExtract"
    >⬦ パレット抽出</button>
    <button class="abtn" style="color:var(--muted)" @click="clearRef">✕ 参照画像を消去</button>
  </SidePanel>
</template>
