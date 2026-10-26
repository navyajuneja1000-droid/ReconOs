-- ReconOS accounts. Run once in Supabase → SQL Editor → New query → paste → Run.
-- Safe to re-run: it only creates what's missing.

-- 1. One profile per login. Plan fields are written only by the server (Dodo webhook).
create table if not exists public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  email text,
  brand text not null default '',
  picked text[] not null default '{}',
  plan text not null default 'free' check (plan in ('free', 'starter', 'growth')),
  plan_status text not null default 'none',
  current_period_end timestamptz,
  dodo_customer_id text,
  dodo_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Rate cards, one row per partner.
create table if not exists public.rate_cards (
  user_id uuid not null references auth.users on delete cascade,
  partner text not null,
  card jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, partner)
);

-- 3. Saved audit results: totals and the claim list (order IDs, AWBs, amounts).
--    Never the raw report files, never customers' names, addresses or phone numbers.
create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  month_key text not null,
  period_from date,
  period_to date,
  partners text[] not null default '{}',
  claim_total numeric not null default 0,
  check_total numeric not null default 0,
  findings jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_key)
);

-- New login → empty profile.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email) values (new.id, new.email) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Paid = an active plan, or a cancelled one still inside the period already paid for.
create or replace function public.is_paid(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = uid and p.plan in ('starter', 'growth')
      and (p.plan_status = 'active' or (p.plan_status = 'cancelled' and p.current_period_end > now()))
  )
$$;

-- Free accounts get one audit month; re-running that same month is fine.
create or replace function public.can_save_audit(uid uuid, month text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_paid(uid)
    or not exists (select 1 from public.audits a where a.user_id = uid and a.month_key <> month)
$$;

-- Row security: everyone sees and changes only their own rows.
alter table public.profiles enable row level security;
alter table public.rate_cards enable row level security;
alter table public.audits enable row level security;

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select using (auth.uid() = user_id);
drop policy if exists "own profile edit" on public.profiles;
create policy "own profile edit" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Logged-in users may edit only these columns; the plan columns stay server-only.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (brand, picked, updated_at) on public.profiles to authenticated;

drop policy if exists "own cards" on public.rate_cards;
create policy "own cards" on public.rate_cards for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own audits read" on public.audits;
create policy "own audits read" on public.audits for select using (auth.uid() = user_id);
drop policy if exists "own audits add" on public.audits;
create policy "own audits add" on public.audits for insert with check (auth.uid() = user_id and public.can_save_audit(auth.uid(), month_key));
drop policy if exists "own audits update" on public.audits;
create policy "own audits update" on public.audits for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own audits delete" on public.audits;
create policy "own audits delete" on public.audits for delete using (auth.uid() = user_id);
revoke all on public.audits from anon;
revoke all on public.rate_cards from anon;
revoke all on public.profiles from anon;
