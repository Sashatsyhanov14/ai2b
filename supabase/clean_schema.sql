-- =====================================================
-- AI2B Clean Schema - ПОЛНЫЙ СБРОС И СОЗДАНИЕ
-- Выполни в Supabase SQL Editor
-- =====================================================

-- =====================================================
-- СНАЧАЛА УДАЛЯЕМ ВСЕ СТАРЫЕ ТАБЛИЦЫ
-- =====================================================

-- Отключаем проверки foreign keys временно
set session_replication_role = 'replica';

-- Удаляем все возможные старые таблицы
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
drop table if exists public.company_files cascade;
drop table if exists public.bots cascade;
drop table if exists public.tenants cascade;
drop table if exists public.profiles cascade;

-- Включаем проверки обратно
set session_replication_role = 'origin';

-- =====================================================
-- ТЕПЕРЬ СОЗДАЁМ ЧИСТЫЕ ТАБЛИЦЫ
-- =====================================================

-- UUID extension
create extension if not exists "uuid-ossp";

-- =====================================================
-- 1. UNITS - Объекты для продажи
-- =====================================================
create table public.units (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz default now(),
  
  -- Локация
  city text not null,
  address text,
  
  -- Характеристики
  type text default 'apartment',
  rooms int,
  floor int,
  floors_total int,
  area_m2 numeric,
  
  -- Цена в EUR
  price numeric,
  
  -- Статус
  status text default 'available',
  
  -- Описание
  title text,
  description text,
  
  -- Доп инфо
  features text[],
  project_id uuid,
  is_active boolean default true
);

alter table public.units enable row level security;
create policy "units_select" on public.units for select using (true);
create policy "units_insert" on public.units for insert with check (true);
create policy "units_update" on public.units for update using (true);
create policy "units_delete" on public.units for delete using (true);

-- =====================================================
-- 2. UNIT_PHOTOS - Фото объектов
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
create policy "photos_select" on public.unit_photos for select using (true);
create policy "photos_insert" on public.unit_photos for insert with check (true);
create policy "photos_delete" on public.unit_photos for delete using (true);

-- =====================================================
-- 3. LEADS - Заявки клиентов
-- =====================================================
create table public.leads (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz default now(),
  
  name text,
  phone text,
  email text,
  
  unit_id uuid references public.units(id) on delete set null,
  city text,
  budget_min numeric,
  budget_max numeric,
  
  source text default 'telegram',
  source_bot_id text,
  telegram_chat_id text,
  
  status text default 'new',
  data jsonb default '{}',
  notes text
);

alter table public.leads enable row level security;
create policy "leads_select" on public.leads for select using (true);
create policy "leads_insert" on public.leads for insert with check (true);
create policy "leads_update" on public.leads for update using (true);

-- =====================================================
-- 4. SESSIONS - Сессии бота
-- =====================================================
create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  updated_at timestamptz default now(),
  
  bot_id text not null,
  external_user_id text not null,
  context jsonb default '{}',
  
  unique(bot_id, external_user_id)
);

alter table public.sessions enable row level security;
create policy "sessions_all" on public.sessions for all using (true);

-- =====================================================
-- 5. MESSAGES - История переписки
-- =====================================================
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  
  session_id uuid not null references public.sessions(id) on delete cascade,
  bot_id text,
  role text not null,
  content text,
  payload jsonb default '{}'
);

alter table public.messages enable row level security;
create policy "messages_all" on public.messages for all using (true);
create index messages_session_idx on public.messages(session_id, created_at desc);

-- =====================================================
-- 6. TELEGRAM_MANAGERS - Кто получает уведомления
-- =====================================================
create table public.telegram_managers (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  telegram_id text not null unique,
  name text,
  is_active boolean default true
);

alter table public.telegram_managers enable row level security;
create policy "managers_select" on public.telegram_managers for select using (true);
create policy "managers_insert" on public.telegram_managers for insert with check (true);

-- =====================================================
-- 7. COMPANY_FILES - Файлы компании
-- =====================================================
create table public.company_files (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamptz not null default now(),
  
  name text not null,
  description text,
  file_type text,
  url text not null,
  category text default 'general',
  sort_order int default 0,
  is_active boolean default true
);

alter table public.company_files enable row level security;
create policy "files_select" on public.company_files for select using (true);
create policy "files_insert" on public.company_files for insert with check (true);
create policy "files_update" on public.company_files for update using (true);
create policy "files_delete" on public.company_files for delete using (true);

-- =====================================================
-- ИНДЕКСЫ
-- =====================================================
create index units_city_idx on public.units(city);
create index units_active_idx on public.units(is_active) where is_active = true;
create index leads_status_idx on public.leads(status);
create index sessions_idx on public.sessions(bot_id, external_user_id);

-- =====================================================
-- ГОТОВО! Таблицы:
-- 1. units - объекты продажи
-- 2. unit_photos - фото объектов
-- 3. leads - заявки
-- 4. sessions - сессии бота
-- 5. messages - история чата
-- 6. telegram_managers - менеджеры
-- 7. company_files - файлы компании
-- =====================================================
