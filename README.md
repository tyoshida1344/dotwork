# DOTWORK

初心者でも"レベルの高いドット絵"が作れるピクセルアートエディタ。

陰影・縁取り・ディザリングといった「玄人の技」をツール側が自動化することで、デザイン未経験のゲーム開発者でも清潔で読みやすいスプライトを作れるようにするのがコンセプト。

## 機能

| 機能 | 詳細 |
|---|---|
| **描画ツール** | ペン / 消しゴム / 直線 / 塗りつぶし / スポイト / ディザ |
| **左右対称** | 反対側に同じドットを自動描画 |
| **シャドウランプ** | ベース色から明暗5段を自動生成（影は寒色・光は暖色にシフト） |
| **パレット** | PICO-8 / Sweetie16 / グレースケール / 参照画像から抽出 |
| **Auto Outline** | シルエット外周を1ドットで自動縁取り |
| **ディザリング** | 市松模様で2色の中間調を表現 |
| **補助線** | 頭身ガイド / 中心線 / カスタム横縦線（書き出し非対象） |
| **参照画像** | 読み込み・オーバーレイ表示・パレット抽出 |
| **Undo / Redo** | 60手まで |
| **PNG 書き出し** | 倍率を選択（1x〜16x）・背景透過 |
| **ログイン** | Google アカウント（Supabase Auth） |
| **作品の保存** | 保存した作品をマイページから再開・整理（1アカウント20件まで） |

## セットアップ

Node.js 18 以上が必要です。

```bash
git clone <リポジトリURL>
cd dot-editor
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。

## コマンド

```bash
npm run dev      # 開発サーバー起動（HMR あり）
npm run build    # プロダクションビルド → dist/
npm run preview  # ビルド結果の確認
```

本番デプロイ・本番 DB へのマイグレーション適用は [OPERATIONS.md](OPERATIONS.md) を参照。

## Supabase 連携（レッスン管理・ログイン）

レッスン管理画面 `/admin` と、学習者のログイン・作品の保存（`/mypage`）は Supabase（DB / 認証 / ストレージ）を使います。ここでは**ローカルでの動かし方**を説明します。**本番セットアップ・本番へのマイグレーション適用・デプロイは [OPERATIONS.md](OPERATIONS.md)** を、設計・仕組みは [`CLAUDE.md`](CLAUDE.md) の「ルーティングとレッスン管理」「学習者アカウントと作品」を参照。

> Supabase 未設定でもエディタ（描画）は動作しますが、レッスンは取得できず一覧が空になり、ログイン導線も出ません（`/admin` は「未設定」表示）。

### ローカル開発（Supabase CLI）

Docker 上に Postgres・Auth・Storage・Studio を立ち上げ、手元だけで動かせます。

**前提**: [Docker Desktop](https://www.docker.com/products/docker-desktop/)（起動しておく） / [Supabase CLI](https://supabase.com/docs/guides/local-development)（グローバル導入は不要。以下は `npx` 例。scoop / Homebrew でも可）

```bash
npx supabase init    # 初回のみ。supabase/config.toml を生成（対話で y/N を聞かれる）
npx supabase start   # Docker 上にローカルスタックを起動
```

起動後に表示される接続情報（後から `npx supabase status` でも確認可）:

| 項目 | 値 |
|---|---|
| API URL | `http://127.0.0.1:54321` |
| Studio（管理 UI） | `http://127.0.0.1:54323` |
| DB URL | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| anon key | 出力された `anon key` をコピー |

- **スキーマ適用**: `npx supabase db reset`（`supabase/migrations/` を古い順に適用し、シードも投入。ローカル DB は初期化される）。
- **Edge Function**: `npx supabase functions serve admin`（管理API＝ログイン・書き込み・お題画像を配信）。`http://localhost:5173/admin` を使う間はこれを起動しておく。
- **管理者アカウント**: Supabase Auth ではなく `admins` テーブルで管理。Studio → SQL Editor で作成:

  ```sql
  insert into public.admins (login_id, password)
  values ('admin', public.admin_hash_password('好きなパスワード'));
  ```

  これが `/admin` のログイン（ログインID＋パスワード）になる。パスワードは bcrypt でハッシュ保存される。
- **`.env`**: `VITE_SUPABASE_URL=http://127.0.0.1:54321` と、表示された anon key を `VITE_SUPABASE_ANON_KEY` に設定。
- **停止**: `npx supabase stop`（データ保持） / `npx supabase stop --no-backup`（ローカル DB も破棄）。
- **スキーマ変更**: 既存マイグレーションは編集せず**新しいマイグレーションを追加**する。作法は [`supabase/migrations/README.md`](supabase/migrations/README.md)、本番への適用は [OPERATIONS.md](OPERATIONS.md)。

### Google ログイン（学習者アカウント・ローカル）

作品の保存とマイページは Google ログインが必要（管理者アカウントとは別系統）。ローカルで試すには Google Cloud の OAuth クライアントを用意する。

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) で **OAuth 2.0 クライアント ID**（種類: ウェブアプリケーション）を作成する。
2. **承認済みのリダイレクト URI** に `http://127.0.0.1:54321/auth/v1/callback` を追加する（ローカル Supabase の Auth コールバック）。
3. 発行されたクライアント ID とシークレットを `.env.local` の `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` に設定する（`VITE_SUPABASE_*` と同じファイル）。
4. `npx supabase stop && npx supabase start`（`config.toml` と env ファイルを読み直させる）。

> **env ファイルの読まれ方**: Supabase CLI は `config.toml` の `env(...)` を解決するとき、プロジェクトルートの **`.env` と `.env.local` の両方**を読む。同じ変数が両方にあれば **`.env.local` が優先**される（実測）。Vite も両方読むため、Google の資格情報はどちらに書いても動く。**片方にだけ書く**こと（両方に散らすと、どちらが効いているのか分からなくなる）。
>
> 変数が未設定だと CLI は `env(...)` を**解決せずリテラル文字列のまま**コンテナへ渡すため、ログイン時に `{"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}` になる。`config.toml` を変更しただけで再起動していない場合も同じエラーになる。反映されたかは `docker exec supabase_auth_dot-editor env | grep GOOGLE` で確認できる（`GOTRUE_EXTERNAL_GOOGLE_ENABLED=true` と、解決済みの client id が出れば成功）。

ログイン後の戻り先は `config.toml` の `site_url`（`http://localhost:5173`＝Vite の開発サーバー）。本番の設定は [OPERATIONS.md](OPERATIONS.md)。

### トラブルシューティング（ローカル）

- **`/admin` のログイン等で `{"message":"name resolution failed"}` が返る** — Edge Function を動かすコンテナ（`supabase_edge_runtime_<project_id>`。本プロジェクトの `project_id` は `dot-editor`）が落ちている（Windows で時々発生）。Kong が Edge Function のホストを解決できずこのエラーになる。関数のコード変更が原因ではないことが多い。
  - 確認: `docker ps -a --filter name=supabase_edge_runtime`（`Exited` になっている）。
  - 復旧（最小）: `docker start supabase_edge_runtime_dot-editor`。直らなければスタックごと `npx supabase stop && npx supabase start`。
- **`supabase_vector_<project_id>` が `Restarting` を繰り返す** — ログ収集用のコンテナで、ローカルの動作には影響しない（無害）。放置してよい。
- **ローカルだと Edge Function の CORS が常に `Access-Control-Allow-Origin: *` になる** — 手前の Kong（`functions-v1` ルートの `cors` プラグイン）が付与するため。関数側の `ALLOWED_ORIGINS` によるオリジン限定は**ローカルでは観測できず**、hosted（本番）でのみ効く（本番の Edge Function はこのローカル Kong を通らない）。

### 利用メモ

- `npm run dev` で起動し、`http://localhost:5173/admin` にアクセス（UI 上の導線はなく直リンクのみ）。ログイン後にレッスンの新規作成・編集・削除・並び替えができる。
- お題画像は **PNG / SVG・2MB まで・任意**。アップロードすると公開バケットにユニークなファイル名で保存され、差し替え・削除時に旧画像は自動で掃除される。未設定のカードは「画像なし」表示になる。
- 既定 4 レッスンのお題画像は `src/assets/lessons/lv1/`・`lv2/` にあるので、初回はそれぞれ編集してアップロードする。
- 公開バケットのため、URL を知れば誰でも画像を閲覧可能（お題画像は元々公開前提）。
- 作品の保存はヘッダーの「保存」から。マイページ（`/mypage`）で開き直し・リネーム・複製・PNG 書き出し・削除ができる。**1アカウント 20 件まで**で、上限に達したら削除しないと新規保存できない（既存作品への上書きは可）。
- 保存されるのはピクセル・キャンバスサイズ・色セット・補助線・レッスン紐づけ。背景色・参照画像・アンドゥ履歴は保存されない。レッスン中に保存した作品を開くとレッスンモードごと復元する。

## キーボードショートカット

| キー | 操作 |
|---|---|
| `B` | ペン |
| `E` | 消しゴム |
| `L` | 直線 |
| `G` | 塗りつぶし |
| `I` | スポイト |
| `D` | ディザ |
| `S` | 左右対称トグル |
| `Ctrl` + `Z` | Undo |
| `Ctrl` + `Y` | Redo |

## UI／デザイン方針

白基調のミニマルなテーマ。色は用途で役割を決め、ボタンは「操作の重み」で色を使い分ける（実装は `src/style.css` の `:root` 変数と各コンポーネントの `<style scoped>`）。

### テーマ配色

- **面の階層**：`--bg` 薄グレー `#f3f4f6`（アプリ／キャンバス領域）＜ `--bg2` 白 `#ffffff`（ヘッダー・ツールバー・サイドバー・ステータス）＜ `--bg3` `#f9fafb`（ボタン・入力）。境界線 `--border` `#e5e7eb`、本文 `--text` `#374151`、補助テキスト `--muted` `#6b7280`。
- **アクセント**：主アクセントはアンバー `--amber` `#e08a1e`、副次アクセントはティール `--teal` `#0d9488`。アクティブ表示は淡い塗り `--amber-soft` / `--teal-soft`、アクセント塗り上の文字は `--on-accent`（白）。
- **フォント**：見出し・ロゴは **Silkscreen**、UI は **DM Mono**（Google Fonts）。
- **補助線・背景**：横分割線はティール `#0d9488`、縦分割線はピンク `#f06080`。透過は薄グレーのチェッカー。

### ボタンのバリアント（使い分け）

「操作の重み」で選ぶ。**主操作はアンバー、破壊的は赤**を守り、別種の操作を同じ主操作ボタンで並べない。

| バリアント | 用途 | 見た目 |
|---|---|---|
| `accent` | 主操作（保存・実行・開始など） | アンバー |
| `default` | 副次的な操作 | 素の枠線ボタン |
| `teal` | 副次アクセント（レッスン・ガイド等の導線） | ティール |
| `danger` | 破壊的操作（削除・クリア） | 赤 |
| `subtle` | 補助的な小ボタン | 控えめ |

実装リファレンス（`variant` / `block` / `compact` / `loading` / `tag` などの props、部品の階層）は [`CLAUDE.md`](CLAUDE.md) の「UI コンポーネント設計」を参照。

## 技術スタック

- [Vite](https://vitejs.dev/) — ビルドツール
- [Vue 3](https://vuejs.org/) — UI フレームワーク（Composition API）
- Canvas API — 3層構成でピクセル描画

## 開発体制

このプロジェクトは **AI 駆動開発** で実装しています。コードの記述・修正・リファクタリングは原則として AI（[Claude Code](https://claude.com/claude-code)）が担い、**人の手はソースコードに直接入れない**運用です。人間は要件定義・方針判断・レビューに徹し、実装そのものは AI に委ねています。

そのため、コミット履歴やコードの構成は AI による実装を前提としています。

## ライセンス

MIT
