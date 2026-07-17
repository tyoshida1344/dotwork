-- 種別: DDL（スキーマ定義＋RLS）
-- ユーザーの同意記録（イシュー #37）。まずは公開ギャラリーへの投稿時に、利用規約への同意を
-- 求めて残すために使う。今後プライバシーポリシー・Cookie 使用同意なども同じ表に足せるよう、
-- 文書種別（document）と版（version）を持つ汎用の作りにする。
--
-- works／profiles と同じく、Supabase Auth（Google）でログインした本人が
-- auth.uid() ベースの RLS でクライアントから直接読み書きする（Edge Function は挟まない）。

create table public.user_consents (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  document   text not null,   -- 同意対象の文書。今は 'terms'。将来 'privacy'／'cookie' を足す
  version    text not null,   -- 同意した版。フロントの TERMS_VERSION と一致させる
  agreed_at  timestamptz not null default now(),

  -- 文書種別は決められた値だけ受ける。増やすときはこの CHECK に足す
  constraint user_consents_document check (document in ('terms', 'privacy', 'cookie')),
  -- 版は短い識別子。空・長すぎを縛る
  constraint user_consents_version_len check (char_length(version) between 1 and 40),
  -- 同じ本人・同じ文書・同じ版は1行にまとめる（再表示で二重に記録しない。存在確認の引きも兼ねる）
  constraint user_consents_once unique (user_id, document, version)
);

-- ── RLS: 本人の行だけ読み書きできる ────────────
alter table public.user_consents enable row level security;

-- auth.uid() は行ごとではなく1回だけ評価させる（(select ...) で包むのが Supabase の推奨形）
create policy "user_consents owner select" on public.user_consents
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "user_consents owner insert" on public.user_consents
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- 同意は取り消さない（非公開に戻しても同意した事実は残す）ので update／delete ポリシーは置かない。
-- 退会（auth.users の削除）に伴う cascade だけが行を消す。

-- RLS は「どの行を見せるか」を決めるだけなので、テーブル権限は別途付与する
-- （config.toml の auto_expose_new_tables 参照。works／profiles と同じ事情）。
grant select, insert on public.user_consents to authenticated;

-- user_consents は新規・空。過去に公開済みの作品はそのまま公開のまま（遡って同意は求めない）で、
-- 同意は次回以降の公開時に記録するため、バックフィルの DML は不要。
