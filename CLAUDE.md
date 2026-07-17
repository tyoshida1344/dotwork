# CLAUDE.md

このファイルは、リポジトリ内のコードを扱う Claude Code (claude.ai/code) への案内です。

## コマンド

ローカル開発・利用は `README.md`、本番運用（Netlify デプロイ・Supabase 本番・マイグレーション適用）は `OPERATIONS.md`、マイグレーションの作法は `supabase/migrations/README.md`。
変更後の検証は `npm run build`（このリポジトリにテスト／Lint の設定は無い）。

## コーディング規約

- **import は `~`（= `src`）エイリアスで書く。`./`・`../` などの相対パスは原則使わない**（設定は `vite.config.js` / `jsconfig.json`）。例: `import SidePanel from '~/components/molecules/SidePanel.vue'`。
- **桁揃えのためのスペースを入れない**（CSS 変数・props・行末コメント等を並べる時、値やコメントの前を余分なスペースで揃えない。コロンの後は半角スペース1つ）。

## プロジェクト概要

**DOTWORK** — 初心者向けのドット絵エディタ。設計思想は「選択肢を絞り、陰影・縁取り・ディザリングを自動化する」こと（実装判断の前提。製品紹介・機能一覧は `README.md`）。技術スタックは **Vite + Vue 3（Composition API / `<script setup>`）** ＋ Vanilla JS コアモジュール。

## ファイル構成

置き場所の地図のみ。各ファイルの責務はアーキテクチャ節とソースを参照。

```
src/
  main.js / App.vue / router.js  ← エントリ、<router-view>、ルート定義（/ と /mypage と /admin＋子ルート。/mypage・/admin は遅延ロード、/admin は直リンクのみ）
  style.css                      ← グローバル CSS（CSS 変数・リセット・z-index/チェッカー・複数画面で共有するクラスのみ。部品固有・#layout・ガイド本文は各 .vue の <style scoped>）
  core/        ← 状態とロジック（Vanilla JS）: state / palette / canvas / tools / history / export / ui
                 ＋ レッスン管理まわり: lessons / supabase / lessonsApi
                 ＋ 学習者アカウント・表示名・作品: auth / profileApi / works / worksApi / galleryApi（公開作品の横断読み取り）
                 ＋ 共通ダイアログ: dialog（ネイティブ alert/confirm/prompt の置き換え。Promise を返す）
  views/       ← pages 層（ルートコンポーネント）: EditorView（エディタ本体）/ MyPageView（/mypage: 保存した作品の一覧）/ GalleryView（/gallery: 公開作品の横断一覧）
                 ＋ AdminView（/admin のシェル: 認証＋ヘッダー）/ AdminHome（管理トップのメニュー）/ LessonAdmin（レッスン管理）
  components/  ← atomic デザインで階層化（Base* は汎用の基底部品、ドメイン部品は従来名を維持。詳細はアーキテクチャ節）
    atoms/       ← BaseButton / ToolButton / WorkThumb（作品サムネイルをピクセルから描画）
    molecules/   ← SidePanel（セクション枠）/ BaseField（ラベル＋入力）/ SliderRow（ラベル＋スライダー＋値）/ LessonCard（お題カード。選択画面と編集プレビューで共用）
    organisms/   ← The*（Header/Toolbar/Canvas/Sidebar/StatusBar）、各パネル（Color/Palette/Enhance/Guides/Background/RefImage/Export）、オーバーレイ（GuidePage/LessonPage/ImageImportModal）、管理（AdminLogin/LessonForm）、BaseDialog
    templates/   ← レイアウトの器（BaseModal＝中央/上寄せモーダルの共通枠）
supabase/migrations/  ← DB マイグレーション（スキーマ・RLS・バケット・RPC・管理者アカウント admins/admin_sessions／既定レッスンのシード／作品 works）
supabase/functions/   ← Edge Function（admin: 管理者認証・レッスン/お題画像の書き込み。service_role）
supabase/config.toml  ← ローカルスタック設定（[auth.external.google] を含む。本番には反映されない）
.env.example         ← Supabase 接続情報テンプレート
```

## アーキテクチャ

### UI コンポーネント設計（atomic デザイン）

UI 部品は **atomic デザイン**で階層化する。層は `components/{atoms,molecules,organisms,templates}` ＋ pages（`views/`）。

- **層の分け方**：atoms＝これ以上分解しない基底部品（`BaseButton` / `ToolButton` / `WorkThumb`）、molecules＝atoms の小さな組み合わせ（`SidePanel` ほか）、organisms＝画面の意味あるまとまり（`The*`・各パネル・フォーム・オーバーレイ内容・`BaseDialog`）、templates＝レイアウトの器（`BaseModal` など。中身はスロット）、pages＝ルートコンポーネント（`views/`）。
- **命名**：汎用の基底部品は Vue 公式スタイルガイドに従い **`Base*`**（`BaseButton` / `BaseModal` / `BaseDialog`…）。ドメイン固有部品（`The*`・各パネル・`WorkThumb`・カード類）は従来名のまま。
- **スタイルの置き場**：部品固有の見た目は各 `.vue` の **`<style scoped>`** に置く。`style.css` は **CSS 変数・リセット（`body` 等）・z-index スケール・チェッカー背景**、button/select の下地、複数画面で共有する管理画面クラス（`.admin-logo`/`.admin-head`/`.admin-head-actions` 等）とエラー表示（`.admin-error`/`.mp-error`）に絞る。`#layout` グリッドは `EditorView`、ガイド本文（`#gcontent`。中身が `v-html` のため `:deep()` で当てる）は `GuidePage` の scoped に置く。新規・改修時は原則 scoped 側へ寄せる。親から子部品のルート要素を上書きする時や `v-html` の中身を当てる時だけ `:deep()` を使う（例：`TheStatusBar` のズームボタン、`SliderRow`/`BaseField` のスロット入力、`GuidePage` の本文）。

**ボタンのバリアント（`BaseButton`）**：props は `variant`（`default`/`accent`/`teal`/`danger`/`subtle`）・`block`（幅いっぱい）・`compact`（詰めた小ボタン）・`active`（トグルのオン表示）・`loading`（処理中は disabled＋`loadingText` に差し替え）・`tag="router-link"`（リンクをボタン見た目に。旧 `.hbtn` / `.admin-btn` を一本化）。**どのバリアントをいつ使うか（主操作＝アンバー／破壊的＝赤 など）は README「UI／デザイン方針」**。ツールバーの状態表示（L/R バッジ・アクティブ枠）は `ToolButton` が props で吸収する。

**z-index スケール**（`:root` の CSS 変数。下から上へ）：`--z-canvas-bg/px/grid`（1/2/3）＜ `--z-dropdown`（作品カードの ⋯）＜ `--z-tooltip` ＜ `--z-drawer-backdrop`/`--z-drawer`（スマホのサイドドロワー）＜ `--z-overlay`（全画面ページ）＜ `--z-modal`（モーダル）＜ `--z-dialog`（共通ダイアログ）。新しい重なりはこのスケールから選ぶ。

**共通ダイアログ（core/dialog.js ＋ organisms/BaseDialog.vue）**：ネイティブの `alert`/`confirm`/`prompt` は使わず、`showAlert` / `showConfirm` / `showPrompt`（Promise を返す）で共通ダイアログを開く。`BaseDialog` は `App.vue` に1つだけ置き、`--z-dialog` で最前面に出す。文言は呼び出し側がそのまま渡す（`.claude/rules/ui-copy.md` に従う）。

### 状態管理（state.js）

`S = reactive({...})` がアプリ唯一の状態ソース。Vue の Proxy ベース reactivity で動作するため、`S.pixels[i] = color` 等のインデックス代入もトラッキングされる。ただしピクセル配列の変更を watch することはパフォーマンス上避けており、代わりにツール関数が直接 `drawPx()` を呼ぶ。

キャンバスの初期サイズは **16×16**。サイズを変更すると `resetCanvas()` が `saveDefaultSize()` で localStorage（キー `dotwork.canvasSize`）に保存し、次回起動時の既定値として復元する。`SIZES` 配列は `TheStatusBar` の SIZE セレクト選択肢と一致させること。

`ui.js` は `hoverPos`（カーソル位置）・`guidePageOpen`（ガイドページ表示）・`cropOpen`（画像→ドット変換のクロップ表示）・`lessonPageOpen`（レッスン選択表示）など、アンドゥ履歴に含める必要のない揮発性状態を持つ。これらは `S` から分離してある。

### ルーティングとレッスン管理（router.js / lessons.js / lessonsApi.js / supabase.js）

`vue-router`（history モード）。`/` = `EditorView`（エディタ本体）。`/gallery` = `GalleryView`（遅延ロード・公開作品の一覧。閲覧はログイン不要のため `beforeEnter` は無い）。`/mypage` = `MyPageView`（遅延ロード・ログイン必須。`beforeEnter` が未ログインならエディタへ戻す）。`/admin` = `AdminView`（遅延ロード）で、これは **DOTWORK ADMIN の「シェル」**（Supabase 設定チェック・ログイン・共通ヘッダー・ログアウト）。管理機能そのものは子ルートに分離する: `/admin`（index）= `AdminHome`（管理トップのメニュー）、`/admin/lessons` = `LessonAdmin`（レッスン管理）。今後の管理機能は子ルート＋`AdminHome` のメニュー項目として足す。`/admin` は UI 上の導線を置かず**直リンクのみ**で到達し、エディタへ戻る導線も持たない。`App.vue` は `<router-view>` と全ルート共通の `BaseDialog` を置く。SPA フォールバックは `netlify.toml` の redirect で対応。

レッスンの正データは **Supabase**（`lessons` テーブル＋公開バケット `lesson-refs`）。`supabase.js` は env（`VITE_SUPABASE_*`）から anon クライアントを作り、未設定なら `null`。`lessonsApi.js` は、**読み取り**（`fetchLessons`）を anon で直接行い、**書き込み・お題画像・認証**は Edge Function `admin` 経由で行う。DB 列（`id`/`description`/`deleted_at`…）とフロントの形（`id`/`desc`…）を相互変換する。レッスンの削除は物理削除ではなく `deleted_at` を立てる**論理削除**で、一覧は `deleted_at is null` のみ取得する。

`lessons.js` の `LESSONS` は**リアクティブ配列**。`loadLessons()` が Supabase から取得して中身を差し替える（未設定・取得失敗時は空。バンドルのフォールバックは持たない）。このとき**お題画像（`ref`）が無いレッスンは未公開扱いで除外**する（学習者向けの `LESSONS` にだけ効くフィルタで、管理画面が使う `fetchLessons()` は全件返す＝画像を付ければ公開される）。`@supabase/supabase-js` をエディタ初期ロードのバンドルから外すため、`lessons.js` は `supabase`/`lessonsApi` を**動的 import** し、`LessonPage` を初めて開いた時に `ensureLessons()` で読み込む（`main.js` では先読みしない）。管理画面で更新したら `invalidateLessons()` を呼び、次にレッスン画面を開いた時に取り直す。

お題画像は公開バケットに**毎回ユニークなファイル名**で保存（CDN キャッシュ汚染・URL 列挙の回避）。アップロードは Edge Function が**署名付きアップロードURL**を発行してクライアントがそこへ直接送る。差し替え・削除時は旧画像を `deleteRefImage()`（Edge Function 経由）で掃除する。閲覧（公開読み）は anon 可、書き込みはクライアントから不可。

### 認証と管理者アカウント（Edge Function `admin`）

管理者は **Supabase Auth と切り離した独自アカウント**。`admins` テーブル（`login_id`＋bcrypt ハッシュの `password`）＋`admin_sessions`（トークンは sha256 ハッシュで保存）で認証する。ログイン・書き込み・お題画像は Edge Function `supabase/functions/admin`（**service_role**）が担い、クライアント（anon）は `x-admin-token` を送るだけ。RLS は `lessons`/バケットとも**書き込みをクライアントから禁止**し（service_role のみ）、読み取りは全員。これは学習者アカウント（Supabase Auth／将来 Google）を管理者と**完全分離**するため。管理者の作成・パス変更は DB 操作（Studio / SQL、`admin_hash_password()`）で行う。`admin` 関数は独自トークン認証のため `config.toml` で `verify_jwt = false`。

総当たり対策として、`admin_login` は **IP 単位のログイン失敗スロットリング**を行う（`admin_login_attempts` テーブルに IP ごとの失敗回数を記録し、指数バックオフ＝再試行間隔を `2^(失敗回数-1)` 秒に広げ、5回失敗で1時間ロック。成功でクリア）。IP は Edge Function が `x-forwarded-for` から取り出して RPC に渡す。戻り値は `jsonb`（`{status: ok|invalid|locked, token?, retry_after?}`）で、`locked` は関数が `429 + Retry-After` に変換する。CORS は `*` を使わず、環境変数 `ALLOWED_ORIGINS`（カンマ区切り・未設定時はローカル開発オリジンのみ）に載る Origin だけをエコーする。

### 学習者アカウント・表示名・作品（auth.js / profileApi.js / works.js / worksApi.js / galleryApi.js）

学習者は **Supabase Auth の Google OAuth** でログインする（管理者の独自トークン認証とは別系統）。作品は本人しか読み書きしないため、レッスンと違い **Edge Function を通さず、`auth.uid()` ベースの RLS でクライアントから直接** `works` テーブルを読み書きする。

`auth.js` はログイン状態（`authState.ready` / `authState.user`）と Google サインイン／アウトを持つ。`lessons.js` と同じく `supabase.js` を**動的 import** し、さらに **ログインの形跡が無いうちは読み込まない**（`localStorage` の `sb-*-auth-token` の有無と、OAuth から戻った URL かどうかで判定する）。未ログインの利用者に `@supabase/supabase-js` のチャンクを取らせないため。`authState.ready` になるまでヘッダーはログイン導線を出さない（表示のちらつき防止）。

OAuth はリダイレクトでページごと捨てるため、`ログイン` を押す前に `works.js` の `stashEditor()` で編集中のキャンバスを `sessionStorage` へ退避し、戻ってきた `EditorView` の `onMounted` が `restoreStashedEditor()` で復元する。

表示名（ニックネーム）は `profiles` テーブルで管理し、`profileApi.js` が本人のセッションで直接読み書きする（`works` と同じく RLS `auth.uid() = user_id`。**読み取りは全員可**〈他人の表示名も見せられるように〉・**書き込みは本人のみ**）。Google の名前・メールは画面に出さない。**初回サインアップ時に `auth.users` の insert トリガーが既定の表示名を自動付与する**：形式は「`ユーザー` ＋ 4桁ゼロ埋め乱数」（`ユーザー0000`〜`ユーザー9999`）、重複は許す（一意制約なし）、長さは **1〜20 文字**（DB の `CHECK` とクライアントの `maxlength` を一致させる）。トリガーは新規 insert にしか効かないため、テーブル導入時点の既存ユーザーには**バックフィルの DML** で同じ既定名を補う。変更はマイページのヘッダーでインライン編集する。

`works.js` はエディタと作品の橋渡し（`supabase` を静的 import しない）。`snapshotEditor()` / `applySnapshot()` が「保存する状態」の唯一の定義で、保存・OAuth 退避・作品を開く の全てがこれを通る。保存対象は**ピクセル・サイズ・パレット・補助線・レッスン紐づけ**のみ（背景色・選択色・参照画像・ズーム・アンドゥ履歴は含めない）。`applySnapshot()` は描画を呼ばない（マイページから開く時点ではキャンバスが未マウントのため。再描画は呼び出し元 or `TheCanvas` の `onMounted`）。レッスンに紐づく作品を開くとレッスンモードごと復元し、そのレッスンが非公開になっていたら通常モードで開く。

`worksApi.js` は `works` の CRUD（DB 列 `head_units`/`v_div_units` ⇄ フロント `headUnits`/`vDivUnits` を相互変換）。レッスンの論理削除と違い、**作品は物理削除**する（上限のカウントがその場で戻るように）。サムネイル画像は保存せず、`WorkThumb` がピクセル配列から等倍の canvas に描いて CSS で引き伸ばす。

保持できる作品数の上限は **20 件**。強制するのは DB のトリガー `works_enforce_limit()`（`P0001` を投げ、そのメッセージをそのまま画面に出す）で、`worksApi.js` の `WORK_LIMIT` は保存前に弾いて理由を伝えるためのもの。**両者の値は必ず一致させること。** 上限は新規作成にだけ効き、既存作品への上書きは常に可能。

**公開ギャラリー（galleryApi.js / GalleryView.vue）**：作品は `works.is_public` フラグで公開/非公開を持つ。公開は別テーブルへコピーせず**同じ行を公開する**ため、公開中の作品を上書き保存すればギャラリーの表示もそのまま変わり、削除すればギャラリーからも消える。`worksApi.setWorkPublic()` が `is_public` だけを更新する（`workToRow` に `is_public` を含めないのは、エディタの上書き保存＝`updateWork` が公開状態を巻き戻さないため）。閲覧はログイン不要で、`works` の RLS に「`is_public` の行は誰でも `select` 可」ポリシーを足し、`anon` にも `select` を付与している（`profiles` を全員読みに開いたのと同じ事情）。公開数専用の上限は設けず、作品数の上限20がそのまま兼ねる。`galleryApi.fetchPublicWorks()` は公開作品を新しい順に上限 `GALLERY_LIMIT` 件まで取り、投稿者名を `profiles` から別引きして付ける（`works→profiles` の外部キーは無い）。検索（タイトル・投稿者名・レッスン・サイズ）は取得済みの一覧に対して `GalleryView` が画面側で絞り込む。レッスンに紐づく公開作品は「解答例」としてレッスン絞り込みで見つけられ、`works.applyReferenceFromPixels()` がその絵をピクセルから画像化して `S.refImg` に載せ、エディタで参照画像として重ねられる（お題オーバーレイの機構を流用）。

### 3層キャンバス（canvas.js）

`bgcv` → `cv` → `gridcv` の順に重なる（全て `position: absolute`）。`gridcv` が最前面でマウスイベントを受け取る。

- `bgcv`：背景レイヤー。`S.bg` が null なら透過チェッカー、色指定なら単色。表示専用で `exportPNG()` は参照しない。`S.bg` 変更時に `TheCanvas.vue` が watch して再描画
- `cv`：参照画像オーバーレイ（底面）＋ピクセルデータ（前面）
- `gridcv`：グリッド線・補助線（書き出し非対象）

コンテキスト（`bgX/pxX/gX`）はモジュールレベル変数に保持し、`TheCanvas.vue` の `onMounted` で `initContexts()` を呼んで初期化する。

### ツール操作フロー（tools.js / history.js）

```
マウスダウン（TheCanvas.vue）
  └─ tool = button===2 ? S.toolR : S.toolL  ← 押したボタンでツール決定
  └─ saveUndo()             ← ストローク開始前に1回だけ保存
  └─ applyDraw(x, y, tool)  ← 指定ツールを1セルに適用
  └─ drawPx()               ← 呼び出し元（TheCanvas.vue）が担う

history.js の undo/redo は S.pixels のみ操作し、描画は呼び出さない。
App.vue が「undo() 成功 → drawPx()」の順で呼ぶ。
```

### 左右クリックのツール（toolL / toolR）

ツールは `S.toolL`（左ボタン）と `S.toolR`（右ボタン）の2枠を持つ。ツールバーは左クリックで `toolL`、右クリック（`contextmenu`）で `toolR` を割り当て、L/R バッジで表示する。キャンバスはマウスダウン時に押したボタンで使用ツールを決め、ストローク中は `strokeTool`（TheCanvas のモジュール変数）に保持する。キーボードショートカット（B/E/L…）は `toolL` を切り替える。右クリックのコンテキストメニューはキャンバスとツールボタンで抑制している。

### 注意点

- **ディザ＋対称のパリティ修正**：ディザツールは元ピクセルの `(x+y)%2` のパリティを鏡像側にも使う。これにより中心軸をまたいで市松パターンがズレる問題を防ぐ。
- **直線ツールのプレビュー**：`lineSnap`（ドラッグ開始時スナップショット）を毎フレーム `S.pixels` に復元してから再描画。確定は `window` の `mouseup`。終点がキャンバス外の場合は線を確定せず、`lineSnap` に戻して破棄する。
- **watch の範囲**：`S.overlay`・`S.refImg`・`S.headUnits`・`S.vDivUnits` は `TheCanvas.vue` で watch して描画を更新する。ピクセル配列は deep watch せず、ツール関数から直接 `drawPx()` を呼ぶ。
- **ズーム倍率**：`S.cell` は `zoomCanvas()` が `ZOOM_LEVELS`（`2,4,6,8,12,16,24,32` px）を1段ずつ移動する。`±` ボタンとキャンバスのホイールから共用。8px 未満は縮小プレビュー域で、`drawGrid()` が毎セルのグリッド線を隠す（補助線は残す）。

## テーマ・フォント

配色・フォント・ボタンのバリアントの使い分けなど**デザイン方針は README「UI／デザイン方針」**にまとめる。ここでは実装の要点のみ：

- CSS 変数は `style.css` の `:root` で管理（面 `--bg`/`--bg2`/`--bg3`、境界 `--border`、本文 `--text`、補助 `--muted`、アクセント `--amber`/`--teal`＋淡い塗り `--amber-soft`/`--teal-soft`、`--on-accent`、チェッカー `--checker`）。
- 補助線（横＝ティール `#0d9488` / 縦＝ピンク `#f06080`）・グリッド線・ホバー枠・透過チェッカーは `canvas.js` で描画（`drawBg` / `drawGrid` ほか。白背景向けに `rgba(0,0,0,…)`）。

## ロードマップ（未実装）

1. 任意サイズのキャンバス＋大キャンバス時のパン / スクロール（タッチのピンチズーム / 2本指パン含む）
2. フレーム単位のアニメーション＋オニオンスキン
3. アンドゥ粒度の統一（ペンのストローク単位 vs. 単発操作単位）
