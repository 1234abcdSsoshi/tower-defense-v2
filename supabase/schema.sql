-- =====================================================================
-- 時代戦線 ── アカウントと進行データ
--
-- Supabase の SQL Editor にこのまま貼って実行する。
-- 何度流しても同じ結果になるよう書いてある。
--
-- ここで一番大事なのは行レベルセキュリティ（RLS）。
-- anon キーは配布物に埋まっていて誰でも読めるので、
-- データを守っているのは鍵ではなくこのポリシー。
-- RLS を切ると、誰でも他人の進行データを読み書きできる状態になる。
-- =====================================================================

-- ---------------------------------------------------------------- 表示名
-- 進行データとは分けてある。2P で相手に見せるのは名前だけで、
-- 進行の中身を相手に見せる理由はないため。
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users on delete cascade,
  name       text not null check (char_length(name) between 1 and 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2P を始めるときは、対戦相手の名前が見えるよう select を広げる。
-- そのときは「名前だけ」に留めること（列を足すなら別の表か view にする）:
--   create policy "profiles_select_any" on public.profiles
--     for select to authenticated using (true);


-- ---------------------------------------------------------------- 進行データ
-- 中身は SaveData（src/save/save.ts）をそのまま jsonb で持つ。
-- 列に開かないのは、バランス調整で項目が増減するため。
-- 対戦の判定にこの値を信用してはいけない（端末から送られてくる値なので）。
-- 勝敗を突き合わせるときは、入力ログを再生して検証する側に寄せること。
create table if not exists public.saves (
  user_id    uuid primary key references auth.users on delete cascade,
  data       jsonb not null,
  version    integer not null default 3,
  updated_at timestamptz not null default now()
);

alter table public.saves enable row level security;

drop policy if exists "saves_select_own" on public.saves;
create policy "saves_select_own" on public.saves
  for select using (auth.uid() = user_id);

drop policy if exists "saves_insert_own" on public.saves;
create policy "saves_insert_own" on public.saves
  for insert with check (auth.uid() = user_id);

drop policy if exists "saves_update_own" on public.saves;
create policy "saves_update_own" on public.saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 進行データは消せてよい（作り直せる）。ただし他人のものは消せない
drop policy if exists "saves_delete_own" on public.saves;
create policy "saves_delete_own" on public.saves
  for delete using (auth.uid() = user_id);


-- ---------------------------------------------------------------- 検算
-- RLS が本当に効いているか。両方 true でなければ配ってはいけない
select
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass) as profiles_rls,
  (select relrowsecurity from pg_class where oid = 'public.saves'::regclass)    as saves_rls;
