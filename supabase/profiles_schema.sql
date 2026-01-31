-- Supabase profiles schema + trigger + RLS
-- Run this in the Supabase SQL editor (single transaction is fine)

-- 1) Extension
create extension if not exists pgcrypto;

-- 2) Drop old table if exists (WARNING: this deletes data)
-- Comment this block if you already have data you want to keep
drop table if exists public.profiles cascade;

-- 3) Profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  avatar_url text,
  role text default 'user',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- 4) Auto create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- 5) RLS policies
alter table public.profiles enable row level security;

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read"
on public.profiles for select
to authenticated
using (auth.uid() = id);

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Optional migration if you already had profiles without FK
-- alter table public.profiles
--   drop constraint if exists profiles_pkey,
--   add constraint profiles_pkey primary key (id);
-- alter table public.profiles
--   drop constraint if exists profiles_id_fkey,
--   add constraint profiles_id_fkey
--   foreign key (id) references auth.users(id) on delete cascade;

