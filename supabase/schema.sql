-- Neon Dash Ultimate: Supabase schema
-- Run this entire file in Supabase Dashboard > SQL Editor.
-- Uses the anon/publishable browser key safely with Row Level Security.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null default 'NEON RIDER' check (char_length(username) between 2 and 18),
  created_at timestamptz not null default now()
);

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('classic', 'time', 'endless')),
  best_score integer not null default 0 check (best_score >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, mode)
);

alter table public.profiles enable row level security;
alter table public.scores enable row level security;

-- Public profile names are displayed beside leaderboard scores.
create policy "Profiles are publicly readable"
on public.profiles for select
to anon, authenticated
using (true);

create policy "Users can insert their own profile"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Scores are public for leaderboard reads; clients cannot write directly.
create policy "Scores are publicly readable"
on public.scores for select
to anon, authenticated
using (true);

-- Create a profile after each new Auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(nullif(left(new.raw_user_meta_data ->> 'username', 18), ''), 'NEON RIDER')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- The browser calls this RPC; it can only submit a score for the signed-in user.
-- This is a casual-game leaderboard. For competitive anti-cheat validation,
-- submit verified game sessions through a trusted Edge Function instead.
create or replace function public.submit_score(p_score integer, p_mode text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_mode not in ('classic', 'time', 'endless') then
    raise exception 'Invalid game mode';
  end if;
  if p_score < 0 or p_score > 10000000 then
    raise exception 'Invalid score';
  end if;

  insert into public.scores (user_id, mode, best_score, updated_at)
  values (current_user_id, p_mode, p_score, now())
  on conflict (user_id, mode)
  do update set
    best_score = greatest(public.scores.best_score, excluded.best_score),
    updated_at = now();
end;
$$;

revoke all on function public.submit_score(integer, text) from public;
grant execute on function public.submit_score(integer, text) to authenticated;

create index if not exists scores_mode_best_score_idx
on public.scores (mode, best_score desc);
