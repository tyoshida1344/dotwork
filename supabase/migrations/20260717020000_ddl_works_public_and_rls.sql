-- 種別: DDL（列追加＋RLS）
-- 作品の公開機能（イシュー #5）。マイページの作品に「公開/非公開」を持たせ、公開した作品を
-- 全ユーザー横断の公開ギャラリーで一覧・検索できるようにする。投稿は別テーブルにコピーせず、
-- works の行そのものを公開する（同一行なので編集・削除がそのままギャラリーに反映される）。
--
-- 公開数の上限は設けない。作品数の上限20（works_enforce_limit）がそのまま公開数の上限を兼ねる
-- （公開作品も1件の作品なので、20を超えて公開はできない）。

-- 公開フラグ。既定は非公開。
alter table public.works add column is_public boolean not null default false;

-- 既存の作品は既定 false（非公開）でよいので、バックフィルの DML は不要。

-- 公開ギャラリーは「公開中の作品を更新日時の新しい順」で引く。対象は公開行だけなので部分index にする。
create index works_public_updated_idx on public.works (updated_at desc) where is_public;

-- ── RLS: 公開行は誰でも読める ────────────────
-- 本人の全作品を見せる既存ポリシー（works owner select）に加え、公開行は未ログイン含め全員に開く。
-- 複数の permissive ポリシーは OR で合成されるため、本人は自分の全作品＋他人の公開作品が見える。
create policy "works public read" on public.works
  for select to anon, authenticated using (is_public = true);

-- 既存の GRANT は authenticated のみ。未ログイン閲覧のため anon にも読み取りを与える
-- （どの行が見えるかは上の RLS が絞る。profiles を anon 読みに開いたのと同じ事情）。
grant select on public.works to anon;
