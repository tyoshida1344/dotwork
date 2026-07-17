<script setup>
import { TERMS_UPDATED } from '~/core/terms.js'
import BaseButton from '~/components/atoms/BaseButton.vue'

// 利用規約の全文。公開ギャラリーへの投稿時の同意対象で、閲覧はログイン不要。
// 本文を実質的に変えたら core/terms.js の TERMS_VERSION を上げること（再同意の起点になる）。
</script>

<template>
  <div id="terms">
    <div class="tm-inner">
      <header class="tm-head">
        <span class="tm-logo">TERMS</span>
        <BaseButton tag="router-link" to="/">← エディタへ戻る</BaseButton>
      </header>

      <h1 class="tm-title">利用規約</h1>
      <p class="tm-updated">最終更新日: {{ TERMS_UPDATED }}</p>

      <p class="tm-lead">
        この利用規約（以下「本規約」）は、DOTWORK（以下「本サービス」）で作成したドット絵作品を、
        公開ギャラリーに公開（投稿）する際の取り扱いを定めるものです。作品を公開すると、
        本規約に同意したものとみなします。
      </p>

      <section class="tm-sec">
        <h2>1. 作品の権利</h2>
        <p>
          公開した作品の著作権は、作成した本人に帰属します。公開しても権利が本サービスに移ることはありません。
          ただし本サービスは、公開ギャラリーでの表示・一覧・検索、および他の利用者が「お手本にする」機能で
          参照できるようにするために必要な範囲で、作品を利用（表示・複製）できるものとします。
        </p>
      </section>

      <section class="tm-sec">
        <h2>2. 公開の範囲</h2>
        <p>
          公開した作品は、ログインの有無にかかわらず、誰でも公開ギャラリーで閲覧できます。
          ほかの利用者は、公開作品を自分のキャンバスに参照画像として薄く重ね、練習に使えます。
          公開はいつでもマイページから非公開に戻せます。
        </p>
      </section>

      <section class="tm-sec">
        <h2>3. 禁止事項</h2>
        <p>作品を公開するとき、次のいずれかに当たる作品を公開してはいけません。</p>
        <ul>
          <li>他人の著作権・商標・肖像権などの権利を侵害するもの</li>
          <li>実在する作品・キャラクターを許可なく複製・転載したもの</li>
          <li>わいせつ・暴力的・差別的など、公序良俗に反するもの</li>
          <li>他人を誹謗中傷し、またはなりすますもの</li>
          <li>法令に違反し、または犯罪を助長するもの</li>
        </ul>
      </section>

      <section class="tm-sec">
        <h2>4. 非公開・削除</h2>
        <p>
          公開した作品は、マイページからいつでも本人が非公開に戻す・削除することができます。
          本サービスの運営者は、本規約に違反する作品や不適切と判断した作品を、事前の通知なく
          非公開または削除することがあります。
        </p>
      </section>

      <section class="tm-sec">
        <h2>5. 免責</h2>
        <p>
          本サービスは、公開作品の内容について保証しません。公開作品に関して利用者間、
          または第三者との間で生じたトラブルについて、運営者は責任を負いません。
        </p>
      </section>

      <section class="tm-sec">
        <h2>6. 規約の変更</h2>
        <p>
          本規約は必要に応じて改定することがあります。改定後に作品を公開した場合、改定後の
          本規約に同意したものとみなします。重要な変更があった場合は、次に作品を公開するときに、
          あらためて同意をお願いすることがあります。
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
#terms { position: fixed; inset: 0; background: var(--bg); overflow-y: auto; color: var(--text); }
.tm-inner { max-width: 720px; margin: 0 auto; padding: 28px 22px 60px; line-height: 1.8; }
.tm-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
.tm-logo { font-family: 'Silkscreen', monospace; color: var(--amber); font-size: 20px; letter-spacing: 1px; }
.tm-title { font-size: 20px; color: var(--text); }
.tm-updated { font-size: 12px; color: var(--muted); margin-top: 4px; margin-bottom: 18px; }
.tm-lead { color: var(--text); margin-bottom: 24px; }
.tm-sec { margin-bottom: 22px; }
.tm-sec h2 { font-size: 15px; color: var(--amber); margin-bottom: 8px; }
.tm-sec p { color: var(--text); }
.tm-sec ul { padding-left: 20px; margin-top: 8px; }
.tm-sec li { margin-bottom: 4px; color: var(--text); }

@media (max-width: 820px) {
  .tm-inner { padding: 20px 14px 48px; }
}
</style>
