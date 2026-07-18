# 本番運用（Operations）

DOTWORK の本番環境まわりの運用手順。対象は **フロントのデプロイ（Netlify）** と
**Supabase 本番のセットアップ／マイグレーション適用**。

- ローカル開発・利用方法・機能: [README.md](README.md)
- マイグレーションの作法（命名・ルール・ローカル適用）: [`supabase/migrations/README.md`](supabase/migrations/README.md)
- 設計・仕組み: [`CLAUDE.md`](CLAUDE.md) 「ルーティングとレッスン管理」

## フロントのデプロイ（Netlify）

[Netlify](https://www.netlify.com/) でホストし、`netlify-cli` でローカルから一発デプロイする。

### 初回だけの準備

```bash
npx netlify login   # ブラウザが開いて認証
npx netlify link    # このフォルダを既存の Netlify サイトに紐付け
```

紐付け情報は `.netlify/`（gitignore 済み）に保存される。

### デプロイ

```bash
npm run deploy          # ビルド → 本番URLへ反映
npm run deploy:preview  # ビルド → 下書きプレビューURL（本番は変えない）
```

`npm run deploy` は内部で `vite build && netlify deploy --prod --dir=dist` を実行する。ビルド設定（コマンド・公開ディレクトリ）は `netlify.toml`。

> **環境変数を未設定でビルドすると** Supabase 連携がツリーシェイクで除外され、`/admin` は「未設定」表示になる。本番ビルドでも `VITE_SUPABASE_*` を設定すること（→「環境変数（本番）」）。

## Supabase 本番セットアップ

1. [supabase.com](https://supabase.com) でプロジェクトを作成し、**Project Settings → API** から `Project URL` と `anon public` キーを控える（anon キーは公開前提。書き込みは RLS と Auth で保護される）。
2. リポジトリを対象プロジェクトに紐付けてマイグレーションを適用する（`lessons` テーブル＋RLS、公開バケット `lesson-refs`、並び替え RPC、既定レッスンのシード、学習者の作品テーブル `works`＋RLS が入る）:

   ```bash
   npx supabase link --project-ref <プロジェクトの Ref>
   npm run db:push      # ガード付き。差分だけ見るなら npm run db:push:dry
   ```

   （GUI で済ませたい場合は `supabase/migrations/` の SQL を古い順にダッシュボードの SQL Editor へ貼り付けても可。）
3. **管理者アカウントを作成**する（Supabase Auth ではなく `admins` テーブル）。SQL Editor で:

   ```sql
   insert into public.admins (login_id, password)
   values ('admin', public.admin_hash_password('強いパスワード'));
   ```

   これが `/admin` のログイン（ログインID＋パスワード）になる。パスワードは bcrypt でハッシュ保存される。
4. **管理 API の Edge Function をデプロイ**する（ログイン・書き込み・お題画像を担う。未デプロイだと `/admin` が機能しない）:

   ```bash
   npx supabase functions deploy admin
   ```

   `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` は Supabase 側が自動注入するので追加の秘密情報設定は不要。`verify_jwt = false`（独自トークン認証）は `config.toml` で管理。

   **CORS の許可オリジンを設定**する。関数は `Access-Control-Allow-Origin: *` を使わず、`ALLOWED_ORIGINS`（カンマ区切り）に載るオリジンだけを許可する。本番のサイト URL を関数シークレットに設定する（未設定だとローカル開発オリジンのみ許可＝本番のブラウザからは弾かれる）:

   ```bash
   npx supabase secrets set ALLOWED_ORIGINS="https://<本番ドメイン>"
   # 例: プレビュー等も許すなら "https://example.com,https://deploy-preview.example.com"
   ```

   ログインの総当たり対策（IP 単位で失敗回数を数え、指数バックオフ＋5回失敗で1時間ロック）は DB 関数 `admin_login` が担うため、マイグレーション適用だけで有効になる（追加設定は不要）。
5. **学習者の Google ログインを有効化**する（作品の保存・マイページに必要。管理者アカウントとは別系統で、Supabase Auth を使う）。ローカルの `config.toml` はリモートには反映されないので、ダッシュボードで設定する:
   1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) で OAuth 2.0 クライアント ID（ウェブアプリケーション）を作成し、**承認済みのリダイレクト URI** に `https://<プロジェクト Ref>.supabase.co/auth/v1/callback` を追加する。
   2. Supabase ダッシュボード → **Authentication → Providers → Google** を有効化し、クライアント ID とシークレットを貼る。
   3. **Authentication → URL Configuration** で `Site URL` に本番ドメイン（`https://<本番ドメイン>`）を設定する。ログイン後はここへ戻る。プレビュー URL も使うなら `Redirect URLs` に追加する。
6. ホスティング（Netlify）と `.env` に環境変数を設定する（→「環境変数（本番）」）。

## Supabase の一時停止対策（keep-alive）

無料プランのプロジェクトは約7日間アクセスが無いと自動で一時停止し、DB が使えなくなる。これを防ぐため、GitHub Actions のスケジュール実行（`.github/workflows/supabase-keepalive.yml`）が週2回（月・木）に anon キーで軽い読み取りを1回投げ、プロジェクトを「起きたまま」に保つ。

- 起こし続けたいのは本番プロジェクトなので、プレビュー用ワークフローが使う dev の `VITE_SUPABASE_*` とは分け、本番専用の GitHub Secrets `SUPABASE_PROD_URL` / `SUPABASE_PROD_ANON_KEY` を使う。この2つをリポジトリの Actions secrets に本番プロジェクトの値で登録する（→「環境変数（本番）」）。
- スケジュール実行は GitHub の仕様上 default ブランチ（`main`）でのみ動く。マージ前に試すときは Actions の「Run workflow」（`workflow_dispatch`）で手動実行する。
- 読み取り（`/rest/v1/lessons?select=id&limit=1`）が失敗するとジョブが失敗し、GitHub の既定通知でオーナーに知らせる。

## 本番へのマイグレーション適用

マイグレーションの作り方・ローカル適用は [`supabase/migrations/README.md`](supabase/migrations/README.md)。
本番へは **必ず `npm run db:push`**（ガード付き）を使い、生の `supabase db push` は使わない。

### 適用先（向き先）の決まり方

`supabase db push` は **`.env` ではなくリンク先プロジェクト** に適用する。

- 向き先 = `supabase link --project-ref <ref>` で確定し、`supabase/.temp/project-ref`（gitignore 済み・ローカル固有）に保存された ref。
- 認証 = Supabase access token（`supabase login` または環境変数 `SUPABASE_ACCESS_TOKEN`）＋ link 時に入力した DB パスワード。ホストは ref から導出される。
- `--db-url <接続文字列>` を付けるとリンクを無視してその DB に直行（footgun）。`--local` はローカル DB。
- **向き先に使われないもの**: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`（フロント用）、`supabase/config.toml` の `project_id`（既定はローカル識別子でリモート ref ではない）。

### 本番への適用ガード（`npm run db:push`）

`scripts/supabase-db-push.mjs` が以下を行い、誤適用を防ぐ:

1. リンク先 ref（`.temp/project-ref` ＝実際の向き先）を確認。未リンクなら中止。
2. `.env` の任意変数 `SUPABASE_PROD_REF` があれば、リンク先と一致するか照合（プロジェクト取り違えの検知）。
3. `db push --dry-run` で「何が適用されるか」を必ず表示。
4. 表示された **project ref をそのまま入力**したときだけ実際に適用。

> `npx supabase db reset --linked`（リンク先の全消去）は本番では使わないこと。

## 環境変数（本番）

| 変数 | 用途 | 設定先 |
|---|---|---|
| `VITE_SUPABASE_URL` | フロントの接続先 | Netlify env ＋ `.env` |
| `VITE_SUPABASE_ANON_KEY` | フロントの anon キー（公開前提） | Netlify env ＋ `.env` |
| `SUPABASE_PROD_REF` | （任意）`npm run db:push` の取り違え検知 | `.env` |
| `SUPABASE_PROD_URL` | keep-alive の本番接続先（→「Supabase の一時停止対策」） | GitHub Actions secret |
| `SUPABASE_PROD_ANON_KEY` | keep-alive の本番 anon キー（公開前提） | GitHub Actions secret |
| `ALLOWED_ORIGINS` | Edge Function の CORS 許可オリジン（カンマ区切り） | Supabase 関数シークレット（`supabase secrets set`） |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `_SECRET` | **ローカルのみ**の Google ログイン設定 | `.env`（本番はダッシュボードで設定） |

- `VITE_*` は**ビルド時に埋め込まれる**ため、ローカルだけでなくホスティング（Netlify）にも同じ値を設定する（未設定でビルドすると Supabase 連携が外れる）。
- 値は `.env.example` を `.env` にコピーして設定する（`.env` は gitignore 済み）。
- Google ログインの本番設定は環境変数ではなく **Supabase ダッシュボード**（Authentication → Providers / URL Configuration）で行う。`supabase/config.toml` の `[auth]` はローカルスタック専用でリモートには反映されない。
