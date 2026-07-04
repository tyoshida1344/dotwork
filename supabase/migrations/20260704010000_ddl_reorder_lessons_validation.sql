-- 種別: DDL（関数の更新）
-- reorder_lessons(ids): レッスンの表示順を並べ替える RPC。
--   ids = 「並べ替え後のレッスン id を、表示したい順に並べた配列」。
--   この並び順どおりに各レッスンの sort_order を先頭から 1, 2, 3 … と振り直す。
--   一覧は sort_order 昇順で引くため、これで表示順が決まる（振り直す前の値は参照しない）。
-- 入力の前提と検証:
--   ・ids は表示中レッスンの id を過不足なく1回ずつ並べたもの、という前提で呼ばれる。
--   ・同じ id が重複していると、sort_order が衝突して一覧順が不定になり得るため。重複があれば例外で中止する。
--   ・削除済み（deleted_at）レッスンの id が混ざっても、その行の sort_order は振り直さない。
create or replace function public.reorder_lessons(ids bigint[])
returns void
language plpgsql
as $$
declare i integer;
begin
  -- ids に重複した id が無いか検査する（重複＝sort_order 衝突の元）。空配列は no-op。
  -- 「配列の要素数」と「重複を除いた個数」が食い違えば重複がある。
  if coalesce(array_length(ids, 1), 0) <> (select count(distinct e) from unnest(ids) as e) then
    raise exception 'reorder_lessons: ids に重複があります';
  end if;
  -- ids の並び位置 i（1 始まり）を、その id のレッスンの sort_order にする（未削除のみ）。
  for i in 1 .. coalesce(array_length(ids, 1), 0) loop
    update public.lessons
      set sort_order = i, updated_at = now()
      where id = ids[i] and deleted_at is null;
  end loop;
end;
$$;
