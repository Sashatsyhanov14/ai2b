-- =====================================================
-- AI2B Clean Schema - Sales Only
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================================================
-- DROP OLD TABLES (if they exist)
-- =====================================================
drop table if exists public.rent_long_contracts cascade;
drop table if exists public.rent_daily_units cascade;
drop table if exists public.rent_long_units cascade;
drop table if exists public.rental_bookings cascade;
drop table if exists public.rental_units cascade;
drop table if exists public.sale_properties cascade;
drop table if exists public.property_photos cascade;
drop table if exists public.messages cascade;
drop table if exists public.sessions cascade;
drop table if exists public.leads cascade;
drop table if exists public.unit_photos cascade;
drop table if exists public.units cascade;
drop table if exists public.telegram_managers cascade;

-- =====================================================
-- 1. UNITS - Properties for sale
-- =====================================================
create table public.units (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz default now(),
  
  -- Location
  city text not null,
  address text,
  
  -- Property details
  type text default 'apartment', -- apartment, villa, land, commercial
  rooms int,
  floor int,
  floors_total int,
  area_m2 numeric,
  
  -- Price in EUR
  price numeric,
  
  -- Status
  status text default 'available', -- available, reserved, sold
  
  -- Description
  title text,
  description text,
  
  -- Extra info (for bot to describe)
  features text[], -- e.g. ['sea view', 'pool', 'parking']
  
  -- Future: project link
  project_id uuid,
  
  -- Soft delete
  is_active boolean default true
);

-- Enable RLS
alter table public.units enable row level security;

-- Allow all authenticated users to read
create policy "units_select_auth" on public.units
  for select to authenticated using (true);

-- Allow all authenticated users to insert/update
create policy "units_insert_auth" on public.units
  for insert to authenticated with check (true);

create policy "units_update_auth" on public.units
  for update to authenticated using (true) with check (true);

create policy "units_delete_auth" on public.units
  for delete to authenticated using (true);

-- Allow anon (bot) to read
create policy "units_select_anon" on public.units
  for select to anon using (is_active = true);

-- =====================================================
-- 2. UNIT_PHOTOS - Photos for properties
-- =====================================================
create table public.unit_photos (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  unit_id uuid not null references public.units(id) on delete cascade,
  url text not null,
  is_main boolean default false,
  sort_order int default 0
);

alter table public.unit_photos enable row level security;

create policy "unit_photos_select_all" on public.unit_photos
  for select using (true);

create policy "unit_photos_insert_auth" on public.unit_photos
  for insert to authenticated with check (true);

create policy "unit_photos_delete_auth" on public.unit_photos
  for delete to authenticated using (true);

-- =====================================================
-- 3. LEADS - Customer inquiries
-- =====================================================
create table public.leads (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz default now(),
  
  -- Contact info
  name text,
  phone text,
  email text,
  
  -- What they want
  unit_id uuid references public.units(id) on delete set null,
  city text,
  budget_min numeric,
  budget_max numeric,
  rooms_min int,
  rooms_max int,
  
  -- Source
  source text default 'telegram', -- telegram, whatsapp, website
  source_bot_id text,
  telegram_chat_id text,
  
  -- Status
  status text default 'new', -- new, contacted, qualified, closed, spam
  
  -- Extra data
  data jsonb default '{}',
  notes text
);

alter table public.leads enable row level security;

create policy "leads_select_auth" on public.leads
  for select to authenticated using (true);

create policy "leads_insert_all" on public.leads
  for insert with check (true);

create policy "leads_update_auth" on public.leads
  for update to authenticated using (true) with check (true);

-- =====================================================
-- 4. SESSIONS - Bot conversation sessions
-- =====================================================
create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz default now(),
  
  bot_id text not null,
  external_user_id text not null, -- Telegram chat_id
  
  -- Unique constraint: one session per user per bot
  unique(bot_id, external_user_id),
  
  -- Conversation context (city, budget, shown units, etc.)
  context jsonb default '{}'
);

alter table public.sessions enable row level security;

create policy "sessions_all" on public.sessions
  for all using (true) with check (true);

-- =====================================================
-- 5. MESSAGES - Conversation history
-- =====================================================
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  
  session_id uuid not null references public.sessions(id) on delete cascade,
  bot_id text,
  role text not null, -- user, assistant, system
  content text,
  payload jsonb default '{}'
);

alter table public.messages enable row level security;

create policy "messages_all" on public.messages
  for all using (true) with check (true);

-- Index for fast message lookup
create index messages_session_idx on public.messages(session_id, created_at desc);

-- =====================================================
-- 6. TELEGRAM_MANAGERS - Who gets lead notifications
-- =====================================================
create table public.telegram_managers (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  telegram_id text not null unique,
  name text,
  is_active boolean default true
);

alter table public.telegram_managers enable row level security;

create policy "managers_select_auth" on public.telegram_managers
  for select to authenticated using (true);

create policy "managers_select_anon" on public.telegram_managers
  for select to anon using (is_active = true);

-- =====================================================
-- INDEXES for performance
-- =====================================================
create index units_city_idx on public.units(city);
create index units_status_idx on public.units(status);
create index units_active_idx on public.units(is_active) where is_active = true;
create index leads_status_idx on public.leads(status);
create index sessions_bot_user_idx on public.sessions(bot_id, external_user_id);

-- =====================================================
-- DONE!
-- =====================================================
