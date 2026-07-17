-- 種別: DML（データ投入）
-- profiles 導入時点で既に存在するユーザーへ、既定名の行を補う。
-- 新規ユーザーは auth.users の on_auth_user_created トリガーが行を作るので、対象は導入時点の既存分だけ。
-- 既に行があれば触らない（冪等）。既定名の形式はトリガーと同じ「ユーザー」＋4桁ゼロ埋め乱数。
insert into public.profiles (user_id, display_name)
select u.id, 'ユーザー' || lpad((floor(random() * 10000))::int::text, 4, '0')
from auth.users u
on conflict (user_id) do nothing;
