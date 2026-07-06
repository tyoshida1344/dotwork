-- 種別: DDL（テーブル追加＋関数の更新）
-- 管理者ログインの総当たり対策（IP 単位のスロットリング）:
--  - IP ごとに失敗回数を記録し、指数バックオフ（再試行の間隔を 2^(失敗回数-1) 秒に広げる）で
--    自動総当たりを鈍らせ、5 回失敗で 1 時間ロックする。
--  - 失敗回数は直近 1 時間のローリング窓で数え、ログイン成功でクリアする。
--  - CORS 制限（オリジン限定）は Edge Function 側（supabase/functions/admin）で行う。
--  - IP は Edge Function が x-forwarded-for から取り出して p_ip で渡す（取れなければ null）。

-- ── admin_login_attempts（IP 単位の失敗記録） ────────
create table public.admin_login_attempts (
  ip           text primary key,
  fails        integer not null default 0,
  last_fail_at timestamptz not null default now(),
  locked_until timestamptz
);
alter table public.admin_login_attempts enable row level security;  -- ポリシー無し＝クライアントからは不可視
grant all on public.admin_login_attempts to service_role;            -- Edge Function（service_role）のみ

-- ── ログイン：資格情報の照合＋IP 単位のスロットリング ──
-- 戻り値は jsonb:
--   {"status":"ok","token":<生トークン>}       … 成功
--   {"status":"invalid"}                        … ID/パスワード不一致（またはアカウント無し）
--   {"status":"locked","retry_after":<秒>}      … バックオフ待ち or ハードロック中
-- （旧 admin_login(text,text)=戻り値 text は本関数で置き換える）
drop function if exists public.admin_login(text, text);

create or replace function public.admin_login(p_login_id text, p_password text, p_ip text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin      public.admins;
  v_att        public.admin_login_attempts;
  v_token      text;
  v_now        timestamptz := now();
  v_fails      integer := 0;      -- 窓調整後の現在の失敗回数（この試行の前まで）
  v_wait       integer;           -- 指数バックオフの必要待ち秒
  v_ready_at   timestamptz;
  c_window     constant interval := interval '1 hour';  -- 失敗カウントのローリング窓＝ロック時間
  c_max        constant integer  := 5;                  -- この回数の失敗でロック
begin
  -- 期限切れセッションの掃除（軽い housekeeping）
  delete from public.admin_sessions where expires_at <= v_now;
  -- 窓を過ぎた古い失敗記録の掃除（行の溜まり込み防止。期限切れロックも対象）
  delete from public.admin_login_attempts
    where last_fail_at < v_now - c_window
      and (locked_until is null or locked_until <= v_now);

  -- ── IP 単位のスロットリング（p_ip があるとき） ──
  if p_ip is not null and p_ip <> '' then
    select * into v_att from public.admin_login_attempts where ip = p_ip;

    -- ハードロック中なら即拒否（資格情報の照合はしない）
    if v_att.locked_until is not null and v_att.locked_until > v_now then
      return jsonb_build_object(
        'status', 'locked',
        'retry_after', ceil(extract(epoch from (v_att.locked_until - v_now)))::int);
    end if;

    -- 窓を跨いだ古い記録はリセット扱い（直近 1 時間に失敗が無ければ数え直し）
    if v_att.ip is not null and v_att.last_fail_at >= v_now - c_window then
      v_fails := coalesce(v_att.fails, 0);
    end if;

    -- 指数バックオフ：直近の失敗から必要待ち時間が経っていなければ即拒否（試行に数えない）
    if v_fails > 0 then
      v_wait := least(ceil(power(2, v_fails - 1))::int, 3600);
      v_ready_at := v_att.last_fail_at + make_interval(secs => v_wait);
      if v_now < v_ready_at then
        return jsonb_build_object(
          'status', 'locked',
          'retry_after', ceil(extract(epoch from (v_ready_at - v_now)))::int);
      end if;
    end if;
  end if;

  -- ── 資格情報の照合 ──
  select * into v_admin
    from public.admins
    where login_id = p_login_id and deleted_at is null;

  -- タイミング差でアカウントの有無が漏れないよう、未存在でも必ずハッシュ照合を 1 回行う
  if v_admin.id is null or v_admin.password <> crypt(p_password, v_admin.password) then
    if v_admin.id is null then
      perform crypt(p_password, gen_salt('bf'));
    end if;
    -- 失敗を記録（p_ip があるとき）。窓調整後 v_fails に +1 し、c_max 到達でロック。
    if p_ip is not null and p_ip <> '' then
      v_fails := v_fails + 1;
      insert into public.admin_login_attempts (ip, fails, last_fail_at, locked_until)
        values (p_ip, v_fails, v_now,
                case when v_fails >= c_max then v_now + c_window else null end)
      on conflict (ip) do update set
        fails        = excluded.fails,
        last_fail_at = excluded.last_fail_at,
        locked_until = excluded.locked_until;
    end if;
    return jsonb_build_object('status', 'invalid');
  end if;

  -- ── 成功：失敗カウントをクリアし、セッションを発行 ──
  if p_ip is not null and p_ip <> '' then
    delete from public.admin_login_attempts where ip = p_ip;
  end if;

  -- 生トークンを返し、DB には sha256 ハッシュのみ保存する
  v_token := encode(gen_random_bytes(32), 'hex');
  insert into public.admin_sessions (token, admin_id, expires_at)
    values (encode(digest(v_token, 'sha256'), 'hex'), v_admin.id, v_now + interval '7 days');
  return jsonb_build_object('status', 'ok', 'token', v_token);
end;
$$;

revoke all on function public.admin_login(text, text, text) from public;
grant execute on function public.admin_login(text, text, text) to service_role;
