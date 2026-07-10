-- 種別: DDL（スキーマ定義＋RLS）
-- 学習者が保存する作品（works）。ログインは Supabase Auth（Google）で、
-- 管理者アカウント（admins テーブル＋Edge Function）とは別系統。
--
-- レッスンと違い、作品は本人しか読み書きしない。そのため Edge Function（service_role）を
-- 通さず、auth.uid() ベースの RLS でクライアント（authenticated）から直接読み書きする。
--
-- 保存するのは「ピクセル・サイズ・色セット・補助線・レッスン紐づけ」。サムネイル画像は
-- 持たず、pixels からクライアント側で描画する（ストレージ不要・描画とデータが必ず一致する）。

create table public.works (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null default '無題',
  cols        integer not null,
  rows        integer not null,
  pixels      jsonb not null,                       -- 長さ cols*rows のフラット配列。各要素は hex 文字列か null（透明）
  palette     jsonb not null default '[]'::jsonb,   -- hex 文字列の配列
  head_units  integer not null default 0,           -- 補助線（横分割）。GuidesPanel のスライダーと同じ 0..8
  v_div_units integer not null default 0,           -- 補助線（縦分割）
  lesson_id   bigint references public.lessons (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- 素の JSON をそのまま受けるので、サイズと形は DB 側でも縛る
  constraint works_title_len   check (char_length(title) between 1 and 60),
  constraint works_size_range  check (cols between 1 and 64 and rows between 1 and 64),
  constraint works_pixels_len  check (jsonb_typeof(pixels) = 'array' and jsonb_array_length(pixels) = cols * rows),
  constraint works_palette_arr check (jsonb_typeof(palette) = 'array' and jsonb_array_length(palette) <= 64),
  constraint works_guides      check (head_units between 0 and 8 and v_div_units between 0 and 8)
);

-- 一覧は「本人の作品を更新日時の新しい順」で引く
create index works_user_updated_idx on public.works (user_id, updated_at desc);

-- ── RLS: 本人の行だけ読み書きできる ────────────
alter table public.works enable row level security;

-- auth.uid() は行ごとではなく1回だけ評価させる（(select ...) で包むのが Supabase の推奨形）
create policy "works owner select" on public.works
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "works owner insert" on public.works
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "works owner update" on public.works
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "works owner delete" on public.works
  for delete to authenticated using ((select auth.uid()) = user_id);

-- RLS は「どの行を見せるか」を決めるだけなので、テーブル権限は別途付与する
-- （config.toml の auto_expose_new_tables 参照。lessons と同じ事情）。
grant select, insert, update, delete on public.works to authenticated;

-- ── 保持できる作品数の上限 ──────────────────
-- クライアント側でも保存前に件数を見て弾くが、そちらは UX のためのもの。
-- ここが唯一の強制点。フロントの WORK_LIMIT（src/core/worksApi.js）と値を一致させること。
create or replace function public.works_enforce_limit()
returns trigger
language plpgsql
as $$
declare
  v_limit constant integer := 20;
  v_count integer;
begin
  -- 同じユーザーの insert を直列化する（トランザクション終了で自動解放）。
  -- 数えてから挿すまでの間に別の insert が走ると、両方が上限内と判定して超過しうるため。
  perform pg_advisory_xact_lock(hashtext(new.user_id::text)::bigint);

  -- SECURITY INVOKER（既定）なので RLS 越しに数える。insert ポリシーが
  -- new.user_id = auth.uid() を保証するため、これは常に本人の作品数になる。
  select count(*) into v_count from public.works where user_id = new.user_id;
  if v_count >= v_limit then
    raise exception '保存できる作品は % 件までです。マイページで不要な作品を削除してください。', v_limit
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger works_limit_before_insert
  before insert on public.works
  for each row execute function public.works_enforce_limit();

-- ── updated_at は DB 側で打つ（一覧の並び順の根拠になるため、クライアントに任せない） ──
create or replace function public.works_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger works_touch_before_update
  before update on public.works
  for each row execute function public.works_touch_updated_at();
