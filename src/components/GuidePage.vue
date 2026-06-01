<script setup>
import { ref, onMounted } from 'vue'
import { ui } from '../core/ui.js'

const contentEl = ref(null)
const navEl     = ref(null)

const SECTIONS = [
  {
    id: 'intro', nav: 'はじめに', html: `
    <h2>Welcome to DOTWORKS</h2>
    <p>DOTWORKS は初心者でも完成度の高いドット絵が作れるようにするツールです。秘訣は<strong>選択肢を絞ること</strong>。小さいキャンバス、限定パレット、そしてこれらのツールが残りをやってくれます。</p>
    <p>プロらしいドット絵は4つの要素で決まります：<strong>陰影と光</strong>、<strong>きれいな縁取り</strong>、<strong>線のキレ</strong>、<strong>色数の節度</strong>。DOTWORKSはこれらすべてに対応しています。</p>
    `,
  },
  {
    id: 'small', nav: '① 小さく始める', html: `
    <h2>① 小さく始める</h2>
    <p>ゲームスプライトには <strong>16×16</strong> で十分です。このサイズでは1ドット1ドットが意味を持つため、悪い選択をしにくくなります。</p>
    <p>ヘッダーの <strong>SIZE</strong> ドロップダウンでキャンバスサイズを選べます。書き出しは常に16倍スケール（16×16 → 256×256 PNG）になります。</p>
    <p>まず16×16で始め、描くものが明確になったら32×32に移行しましょう。</p>
    `,
  },
  {
    id: 'palette', nav: '② 色を絞る', html: `
    <h2>② 色を絞る</h2>
    <p>プロのドット絵師はスプライト1枚に <strong>4〜8色</strong> 程度しか使いません。色が多すぎると濁った印象になります。サイドバーの <strong>PALETTE</strong> から3つのカラーセットを選べます：</p>
    <ul>
      <li><strong>PICO-8</strong> — 小さいスプライトとゲーム向けの16色</li>
      <li><strong>Sweetie16</strong> — 温かみのある自然な16色</li>
      <li><strong>グレースケール</strong> — 16段階のグレー。形を決めてから色をつける際に便利</li>
      <li><strong>画像から抽出</strong> — 参照画像の上位16色を自動抽出</li>
    </ul>
    <p>1枚のスプライトにはパレットを統一しましょう。パレットにない色は使わないのが原則です。</p>
    `,
  },
  {
    id: 'lamp', nav: '③ 影と光', html: `
    <h2>③ 影と光</h2>
    <p><strong>シャドウランプ</strong>は選択色から5段階を自動生成します：</p>
    <table>
      <tr><th>段階</th><th>説明</th></tr>
      <tr><td>Shadow 2</td><td>深い影 — 色相を寒色（青）方向にシフト</td></tr>
      <tr><td>Shadow 1</td><td>中影</td></tr>
      <tr><td>Base</td><td>選択色</td></tr>
      <tr><td>Light 1</td><td>ハイライト — 色相を暖色（黄）方向にシフト</td></tr>
      <tr><td>Light 2</td><td>明るいハイライト</td></tr>
    </table>
    <p>この寒暖の色相シフトがアマチュアとプロの陰影を分けるポイントです。影は単に暗くするのではなく少し青くなり、ハイライトは少し暖かくなります。</p>
    <p><strong>操作：</strong>ベース色を選択 → Shadow 1/2 で影を塗り、Light 1/2 でハイライトを塗る</p>
    `,
  },
  {
    id: 'dither', nav: '④ ディザリング', html: `
    <h2>④ ディザリング</h2>
    <p><strong>ディザツール</strong> <kbd>D</kbd> は市松模様で現在の色を配置し、奇数セルは既存のピクセルをそのままにします。これにより2色だけで中間調を視覚的に表現できます。</p>
    <p><strong>操作手順：</strong></p>
    <ol>
      <li>色Aでペンを使ってエリアを塗る</li>
      <li>色Bを選択する</li>
      <li>ディザツールに切り替えて境界エリアを塗る</li>
    </ol>
    <p>結果として2色だけを使いながら視覚的なグラデーションが得られます。8ビット時代から使われてきたクラシックな技法です。</p>
    `,
  },
  {
    id: 'outline', nav: '⑤ Auto Outline', html: `
    <h2>⑤ Auto Outline</h2>
    <p>ドット絵の最も効果的なテクニックの一つ：スプライトのシルエットを <strong>1ドットの黒縁取り</strong> で囲むことで、どんな背景色でも読みやすくなります。ゲームスプライトには必須です。</p>
    <p><strong>操作手順：</strong></p>
    <ol>
      <li>スプライトを描き終える</li>
      <li><strong>ENHANCE</strong> パネルで縁取り色を選ぶ（黒 <code>#000000</code> が定番）</li>
      <li><strong>Auto Outline</strong> をクリック</li>
    </ol>
    <p>透明セルのうち非透明セルに隣接するものが縁取り色で塗られます。<strong>Remove Outline</strong> で他の描画を変えずに縁取りだけを消せます。</p>
    `,
  },
  {
    id: 'shortcuts', nav: 'ショートカット', html: `
    <h2>キーボードショートカット</h2>
    <table>
      <tr><th>キー</th><th>操作</th></tr>
      <tr><td><kbd>B</kbd></td><td>ペン</td></tr>
      <tr><td><kbd>E</kbd></td><td>消しゴム</td></tr>
      <tr><td><kbd>L</kbd></td><td>直線</td></tr>
      <tr><td><kbd>G</kbd></td><td>塗りつぶし</td></tr>
      <tr><td><kbd>I</kbd></td><td>スポイト</td></tr>
      <tr><td><kbd>D</kbd></td><td>ディザ</td></tr>
      <tr><td><kbd>S</kbd></td><td>対称トグル</td></tr>
      <tr><td><kbd>Ctrl</kbd>+<kbd>Z</kbd></td><td>Undo（60手）</td></tr>
      <tr><td><kbd>Ctrl</kbd>+<kbd>Y</kbd></td><td>Redo</td></tr>
    </table>
    <h2 style="margin-top:24px">Tips</h2>
    <ul>
      <li>ペン・消しゴム・ディザはドラッグ中の隙間を Bresenham 補間で埋めます</li>
      <li>直線ツールはドラッグ中プレビューし、離すと確定します</li>
      <li>補助線は書き出し PNG に含まれません</li>
      <li>書き出しは常に16倍スケール・背景透過です</li>
      <li>対称モードはすべての描画ツールで機能します</li>
    </ul>
    `,
  },
]

onMounted(() => {
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return
      navEl.value?.querySelectorAll('.gnav-link').forEach(a => a.classList.remove('active'))
      navEl.value?.querySelector(`a[href="#gs-${en.target.dataset.sec}"]`)?.classList.add('active')
    })
  }, { root: contentEl.value, threshold: 0.15 })

  contentEl.value?.querySelectorAll('.gsec').forEach(el => io.observe(el))
})

function scrollTo(id) {
  document.getElementById('gs-' + id)?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<template>
  <div id="gpage" :class="{ open: ui.guidePageOpen }">
    <nav ref="navEl" id="gnav">
      <div id="gnav-logo">GUIDE</div>
      <a
        v-for="s in SECTIONS"
        :key="s.id"
        class="gnav-link"
        :href="'#gs-' + s.id"
        @click.prevent="scrollTo(s.id)"
      >{{ s.nav }}</a>
    </nav>

    <div ref="contentEl" id="gcontent">
      <div
        v-for="s in SECTIONS"
        :key="s.id"
        :id="'gs-' + s.id"
        :data-sec="s.id"
        class="gsec"
        v-html="s.html"
      ></div>
    </div>

    <button id="gclose" @click="ui.guidePageOpen = false">✕ Close</button>
  </div>
</template>
