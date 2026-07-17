-- 種別: DDL（トリガー）
-- 作品の公開には利用規約への同意を必須にする（イシュー #37）。クライアントは公開前に
-- user_consents へ同意を記録してから is_public を立てるが、UI を迂回して直接 works を
-- 更新されても「同意記録のない公開作品」が生まれないよう、DB 側でも担保する。
--
-- 版ごとの再同意はフロント（consentApi.hasAgreed）が担う。DB は「利用規約に一度でも
-- 同意しているか」だけを見る。現在の版を DB に持たせると版を上げるたびに DDL が要り
-- ドリフトの元になるため、版の管理はフロントに寄せる。

create or replace function public.works_require_terms_consent()
returns trigger
language plpgsql
as $$
begin
  -- 非公開→公開（および新規で公開）に切り替わるときだけ確認する。
  -- 公開中の作品の上書き保存（is_public は据え置き）では発火しない。
  if new.is_public and (tg_op = 'INSERT' or not old.is_public) then
    -- SECURITY INVOKER（既定）で本人の行を RLS 越しに見る。works の insert／update ポリシーが
    -- new.user_id = auth.uid() を保証するため、これは常に本人の同意記録になる。
    if not exists (
      select 1 from public.user_consents
      where user_id = new.user_id and document = 'terms'
    ) then
      raise exception '作品を公開するには利用規約への同意が必要です。'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger works_require_consent_before_publish
  before insert or update on public.works
  for each row execute function public.works_require_terms_consent();

-- 既存の公開作品はそのまま。トリガーは公開への切り替え時だけ発火し、既存の公開状態には触れない
-- （上書き保存でも is_public は据え置きなので再チェックは走らない）ため、バックフィルの DML は不要。
