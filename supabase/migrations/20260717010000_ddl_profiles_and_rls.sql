-- 種別: DDL（スキーマ定義＋RLS）
-- 学習者の表示名（ニックネーム）。Google の名前・メールは画面に出さず、本人が決めた
-- 表示名をここで管理する（イシュー #20）。#5（投稿）で他人の投稿者名を出すため、
-- 読み取りは全員に開き、書き込みは本人のみに RLS で絞る。
--
-- ログインは Supabase Auth（Google）で、管理者アカウント（admins テーブル＋Edge Function）
-- とは別系統。works と同じく auth.uid() ベースの RLS でクライアントから直接読み書きする。

-- ── profiles テーブル ────────────────────────
-- user_id:      auth.users を参照する PK。退会時はプロフィールも cascade で消す
-- display_name: 本人が決める表示名。重複は許す（一意制約は置かない）
create table public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- 空・長すぎを DB 側でも縛る（クライアントの maxlength と一致させること）
  constraint profiles_name_len check (char_length(display_name) between 1 and 20)
);

-- ── RLS: 読み取りは全員、insert・update は本人のみ ──
alter table public.profiles enable row level security;

-- 他人の投稿者名（#5）を出すため、閲覧は全員に開く
create policy "profiles read for all" on public.profiles
  for select using (true);

-- auth.uid() は行ごとではなく1回だけ評価させる（(select ...) で包むのが Supabase の推奨形）
create policy "profiles owner insert" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "profiles owner update" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 退会（auth.users の削除）に伴う cascade だけが profiles を消すので、delete ポリシーは置かない。

-- RLS ポリシーは「どの行を見せるか」を決めるだけで、テーブルへのアクセスには GRANT が要る
-- （config.toml の auto_expose_new_tables 参照。works／lessons と同じ事情）。
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

-- ── 既定名を自動付与（auth.users の insert トリガー） ──
-- クライアント側の書き込み失敗で名前が空のまま残るのを防ぐため、初期行は DB 側で必ず作る。
-- 既定名は「ユーザー」＋4桁ゼロ埋め乱数（0000..9999）。重複は許す。
-- security definer で RLS を越えて insert する（サインアップ時は auth.uid() が本人と一致しないため）。
-- search_path を空にするので、テーブルもリテラルも完全修飾する。
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, 'ユーザー' || lpad((floor(random() * 10000))::int::text, 4, '0'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── updated_at は DB 側で打つ（クライアントに任せない） ──
create or replace function public.profiles_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch_before_update
  before update on public.profiles
  for each row execute function public.profiles_touch_updated_at();
