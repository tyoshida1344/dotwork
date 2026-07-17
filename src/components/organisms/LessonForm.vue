<script setup>
import { reactive, ref, watch, computed, onBeforeUnmount } from 'vue'
import { uploadRefImage, deleteRefImage } from '~/core/lessonsApi.js'
import { extractPaletteFromImage } from '~/core/palette.js'
import BaseButton from '~/components/atoms/BaseButton.vue'
import BaseModal from '~/components/templates/BaseModal.vue'
import LessonCard from '~/components/molecules/LessonCard.vue'

const props = defineProps({
  // 編集対象のレッスン。新規作成時は空テンプレートを渡す。
  lesson: { type: Object, required: true },
  submitError: { type: String, default: '' },   // 親（保存処理）から渡されるエラー
  saving: { type: Boolean, default: false },     // 保存中（ボタンを無効化）
})
const emit = defineEmits(['save', 'cancel'])

const SIZES = [16, 24, 32, 48]   // ステータスバーの SIZE セレクトと一致させる
const HEX_RE = /^#[0-9a-fA-F]{6}$/
const ACCEPT = ['image/png', 'image/svg+xml']   // お題画像は PNG / SVG のみ
const MAX_BYTES = 2 * 1024 * 1024                // 2MB 上限
const EXTRACT_MAX = 8                            // お題画像から自動抽出する色数の上限
const EXTRACT_MIN_DIST = 90                      // 近似色をまとめる閾値（大きいほど近い色を強く排除）

// props.lesson のコピーを編集する（親の配列を直接触らない）。
// id は自動採番の PK。新規作成時は undefined（保存時に採番される）。
const form = reactive({ id: undefined, level: 1, title: '', desc: '', size: 16, palette: ['#000000'], ref: '' })
let originalRef = ''   // 編集開始時点の画像 URL（差し替え時の掃除判定に使う）

// 選択したお題画像は保存を押すまでアップロードしない。選択中のファイルはローカルに保持し、
// プレビューは objectURL で表示する（アップロードは onSubmit でまとめて行う）。
const pendingFile = ref(null)   // 選択済み・未アップロードのファイル | null
const localPreview = ref('')    // pendingFile の表示用 objectURL
function setPending(file) {
  if (localPreview.value) URL.revokeObjectURL(localPreview.value)   // 前の objectURL を解放
  pendingFile.value = file
  localPreview.value = file ? URL.createObjectURL(file) : ''
}

function reset(l) {
  form.id = l.id
  form.level = l.level ?? 1
  form.title = l.title || ''
  form.desc = l.desc || ''
  form.size = l.size || 16
  form.palette = (l.palette && l.palette.length) ? [...l.palette] : ['#000000']
  form.ref = l.ref || ''
  originalRef = l.ref || ''
  setPending(null)   // 別レッスンに切り替えたら選択中ファイルを破棄
}
watch(() => props.lesson, reset, { immediate: true })
onBeforeUnmount(() => { if (localPreview.value) URL.revokeObjectURL(localPreview.value) })

const uploading = ref(false)
const error = ref('')

// プレビューは選択中の新ファイルを優先、無ければ保存済みの ref を表示
const previewUrl = computed(() => localPreview.value || form.ref)

function addColor() { form.palette.push('#000000') }
function removeColor(i) {
  if (form.palette.length <= 1) return   // 最低 1 色は残す
  form.palette.splice(i, 1)
}
// 色の並び替え：隣と入れ替える（レッスンを始めた時の先頭色＝初期選択色になるので順番に意味がある）
function moveColor(i, dir) {
  const j = i + dir
  if (j < 0 || j >= form.palette.length) return
  ;[form.palette[i], form.palette[j]] = [form.palette[j], form.palette[i]]
}

// 抽出色をパレット末尾へ追加する（大文字小文字を無視した重複はスキップ）。
function appendExtracted(colors) {
  const have = new Set(form.palette.map(c => c.toLowerCase()))
  for (const c of colors) {
    const lc = c.toLowerCase()
    if (have.has(lc)) continue
    have.add(lc)
    form.palette.push(c)
  }
}

// お題画像（PNG）を選んだら色を自動抽出してパレット末尾に足す。SVG は描画制約で
// 抽出が不安定なため対象外。アップロードは不要でローカル画像から抽出する。
function autoExtract(file) {
  if (file.type !== 'image/png') return
  const url = URL.createObjectURL(file)
  const img = new Image()
  const done = () => URL.revokeObjectURL(url)
  img.onload = () => {
    // デコード中に別ファイルへ選び直していたら古い結果は破棄する。
    if (pendingFile.value === file) {
      try {
        appendExtracted(extractPaletteFromImage(img, { max: EXTRACT_MAX, pad: false, minDist: EXTRACT_MIN_DIST }))
      } catch (err) {
        console.warn('[LessonForm] お題画像からの色抽出に失敗しました。', err)
      }
    }
    done()
  }
  img.onerror = done
  img.src = url
}

// ファイル選択時はアップロードせず、検証してローカルに保持するだけ（アップロードは保存時）。
function onFile(e) {
  const file = e.target.files[0]
  if (!file) return
  error.value = ''
  if (!ACCEPT.includes(file.type)) {
    error.value = 'お題画像は PNG または SVG を指定してください。'
    e.target.value = ''; return
  }
  if (file.size > MAX_BYTES) {
    error.value = '画像サイズは 2MB 以下にしてください。'
    e.target.value = ''; return
  }
  setPending(file)
  autoExtract(file)   // PNG なら色を自動抽出してパレット末尾へ追加
  e.target.value = ''   // 同じファイルを選び直せるようにする
}

const paletteValid = computed(() => form.palette.every(c => HEX_RE.test(c)))

function validate() {
  if (!form.title.trim()) return 'タイトルを入力してください。'
  if (!Number.isInteger(form.level) || form.level < 1) return 'レベルは 1 以上の整数で入力してください。'
  if (!SIZES.includes(form.size)) return 'サイズが不正です。'
  if (!form.palette.length) return 'パレットの色を 1 つ以上指定してください。'
  if (!paletteValid.value) return 'パレットに不正な色（#rrggbb 形式でない）があります。'
  return ''   // お題画像（ref）は任意。後から追加できる
}

async function onSubmit() {
  const msg = validate()
  if (msg) { error.value = msg; return }
  error.value = ''
  // 新しく選んだファイルがあれば、ここで初めてアップロードする。成功したら form.ref に
  // 反映して pendingFile を空にするので、親の DB 保存が失敗して再度保存を押しても
  // 二重アップロードにはならない。
  if (pendingFile.value) {
    uploading.value = true
    try {
      form.ref = await uploadRefImage(pendingFile.value)
      setPending(null)
    } catch (err) {
      error.value = `画像のアップロードに失敗しました: ${err.message || err}`
      return
    } finally {
      uploading.value = false
    }
  }
  emit('save', {
    id: form.id,
    level: form.level,
    title: form.title.trim(),
    desc: form.desc.trim(),
    size: form.size,
    palette: [...form.palette],
    ref: form.ref,
    _prevRef: originalRef,   // 保存成功後に親が差し替え前の画像を掃除する
  })
}

// 保存せず閉じる場合の後片付け。選択しただけ（未アップロード）のファイルは objectURL を
// 解放するだけでよい。保存失敗後などでアップロード済みの未保存画像があれば掃除する。
function onCancel() {
  setPending(null)
  if (form.ref && form.ref !== originalRef) deleteRefImage(form.ref)
  emit('cancel')
}
</script>

<template>
  <BaseModal open align="start" @close="onCancel">
    <div class="lf-modal">
      <div class="lf-edit">
        <h2 class="lf-head">{{ form.id ? 'レッスンを編集' : '新しいレッスン' }}</h2>

        <div class="lf-row">
          <BaseField label="レベル" class="lf-narrow">
            <input v-model.number="form.level" type="number" min="1">
          </BaseField>
          <BaseField label="サイズ" class="lf-narrow">
            <select v-model.number="form.size">
              <option v-for="s in SIZES" :key="s" :value="s">{{ s }}×{{ s }}</option>
            </select>
          </BaseField>
        </div>

        <BaseField label="タイトル">
          <input v-model="form.title" type="text" placeholder="例: 描き写しに慣れる">
        </BaseField>

        <BaseField label="説明">
          <textarea v-model="form.desc" rows="3" placeholder="レッスンの説明文"></textarea>
        </BaseField>

        <BaseField tag="div" label="パレット（使用する色）">
          <div class="lf-palette">
            <div v-for="(c, i) in form.palette" :key="i" class="lf-color">
              <input type="color" :value="HEX_RE.test(c) ? c : '#000000'" @input="form.palette[i] = $event.target.value">
              <input class="lf-hex" type="text" v-model="form.palette[i]" maxlength="7">
              <BaseButton compact :disabled="i === 0" title="上へ" @click="moveColor(i, -1)">▲</BaseButton>
              <BaseButton compact :disabled="i === form.palette.length - 1" title="下へ" @click="moveColor(i, 1)">▼</BaseButton>
              <BaseButton compact :disabled="form.palette.length <= 1" @click="removeColor(i)">✕</BaseButton>
            </div>
          </div>
          <BaseButton style="margin-top:6px" @click="addColor">＋ 色を追加</BaseButton>
        </BaseField>

        <BaseField tag="div" label="お題画像（PNG / SVG・2MBまで・任意／PNG は色を自動抽出）">
          <input type="file" accept="image/png,image/svg+xml" @change="onFile">
          <span v-if="pendingFile" class="lf-hint">選択済み：保存時にアップロードされます</span>
        </BaseField>

        <p v-if="error || submitError" class="admin-error">{{ error || submitError }}</p>

        <div class="lf-actions">
          <BaseButton :disabled="uploading || saving" @click="onCancel">キャンセル</BaseButton>
          <BaseButton variant="accent" :disabled="uploading || saving" @click="onSubmit">
            {{ uploading ? 'アップロード中…' : saving ? '保存中…' : '保存' }}
          </BaseButton>
        </div>
      </div>

      <!-- ライブプレビュー：レッスン選択カードの見た目 -->
      <div class="lf-preview">
        <span class="lf-preview-label">プレビュー</span>
        <LessonCard
          :level="form.level"
          :size="form.size"
          :colors="form.palette.length"
          :title="form.title || '（タイトル未入力）'"
          :desc="form.desc || '（説明未入力）'"
          :src="previewUrl"
        >
          <template #empty><div class="lf-noimg">画像なし（任意）</div></template>
        </LessonCard>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.lf-modal {
  width: 100%; max-width: 760px;
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 10px;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  overflow: hidden;
}
.lf-edit { padding: 20px; }
.lf-head { font-size: 16px; color: var(--text); margin-bottom: 16px; }
.lf-row { display: flex; gap: 10px; }
.lf-row .field { flex: 1; }
.lf-narrow { max-width: 96px; }
.lf-palette { display: flex; flex-direction: column; gap: 6px; }
.lf-color { display: flex; align-items: center; gap: 6px; }
.lf-color input[type="color"] { width: 34px; height: 30px; padding: 0; border: 1px solid var(--border); border-radius: 3px; background: none; cursor: pointer; }
.lf-hex { flex: 1; }
.lf-hint { font-size: 12px; color: var(--muted); }
.lf-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.lf-preview { background: var(--bg); border-left: 1px solid var(--border); padding: 20px; }
.lf-preview-label { font-size: 12px; color: var(--muted); display: block; margin-bottom: 10px; }
.lf-noimg { color: var(--muted); font-size: 13px; padding: 40px 0; }

@media (max-width: 820px) {
  .lf-modal { grid-template-columns: 1fr; }
  .lf-preview { border-left: none; border-top: 1px solid var(--border); }
}
</style>
