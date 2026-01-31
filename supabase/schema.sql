-- Enable extensions used for UUIDs
create extension if not exists pgcrypto;

-- Tenants (for ensure_tenant RPC)
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner uuid not null unique references auth.users(id)
);
alter table public.tenants enable row level security;

create policy "tenants select for owner"
  on public.tenants for select
  to authenticated
  using (owner = auth.uid());

create policy "tenants insert for owner"
  on public.tenants for insert
  to authenticated
  with check (owner = auth.uid());

-- ensure_tenant: creates a tenant row for current user if none exists
create or replace function public.ensure_tenant()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  t_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select id into t_id from public.tenants where owner = auth.uid();
  if t_id is null then
    insert into public.tenants (owner) values (auth.uid()) returning id into t_id;
  end if;
  return t_id;
end$$;
grant execute on function public.ensure_tenant() to authenticated;

-- Leads
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  whatsapp text,
  context_type text not null,
  city text,
  budget_eur numeric,
  source text
);
alter table public.leads enable row level security;

create policy "leads select for auth"
  on public.leads for select
  to authenticated
  using (true);

create policy "leads insert for auth"
  on public.leads for insert
  to authenticated
  with check (true);

-- Sale properties
create table if not exists public.sale_properties (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  slug text unique not null,
  title jsonb,
  city text,
  price_eur numeric,
  is_active boolean not null default true
);
alter table public.sale_properties enable row level security;

-- Extend sale_properties with richer details (parity with rentals)
alter table public.sale_properties
  add column if not exists address         text,
  add column if not exists description     text,
  add column if not exists nearby          text,
  add column if not exists in_apartment    text,
  add column if not exists bedrooms        int,
  add column if not exists bathrooms       int,
  add column if not exists living_rooms    int,
  add column if not exists kitchens        int,
  add column if not exists balconies       int,
  add column if not exists photos          text[];

create policy "sale select for auth"
  on public.sale_properties for select
  to authenticated
  using (true);

create policy "sale insert for auth"
  on public.sale_properties for insert
  to authenticated
  with check (true);

-- Rental units
create table if not exists public.rental_units (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  city text not null,
  bedrooms int
);
alter table public.rental_units enable row level security;

-- Extend rental_units with additional fields
alter table public.rental_units
  add column if not exists address         text,
  add column if not exists animals         boolean default false,
  add column if not exists description     text,
  add column if not exists nearby          text,
  add column if not exists in_apartment    text,
  add column if not exists living_rooms    int,
  add column if not exists kitchens        int,
  add column if not exists balconies       int,
  add column if not exists price_month_eur numeric,
  add column if not exists photos          text[],
  add column if not exists is_active       boolean default true,
  add column if not exists title           jsonb;

-- Ensure full replica identity for Realtime update/delete payloads
alter table public.rental_units replica identity full;

create policy "units select for auth"
  on public.rental_units for select
  to authenticated
  using (true);

create policy "units insert for auth"
  on public.rental_units for insert
  to authenticated
  with check (true);

-- Rental bookings
create table if not exists public.rental_bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  unit_id uuid not null references public.rental_units(id) on delete cascade,
  start_utc timestamptz not null,
  end_utc timestamptz not null,
  guest_name text,
  status text not null default 'confirmed',
  source text
);
alter table public.rental_bookings enable row level security;

create policy "bookings select for auth"
  on public.rental_bookings for select
  to authenticated
  using (true);

create policy "bookings insert for auth"
  on public.rental_bookings for insert
  to authenticated
  with check (true);

create policy "bookings update for auth"
  on public.rental_bookings for update
  to authenticated
  using (true)
  with check (true);

-- Realtime publication for live updates
do $$ begin
  perform 1 from pg_publication where pubname = 'supabase_realtime';
  if not found then
    create publication supabase_realtime for table public.leads, public.sale_properties, public.rental_bookings;
  else
    -- Try to add tables idempotently
    begin
      alter publication supabase_realtime add table public.leads;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.sale_properties;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.rental_bookings;
    exception when duplicate_object then null; end;
    begin
      alter publication supabase_realtime add table public.rental_units;
    exception when duplicate_object then null; end;
  end if;
end $$;

-- Ensure rental_units is part of publication on fresh setups as well
do $$ begin
  perform 1 from pg_publication where pubname = 'supabase_realtime';
  if found then
    -- no-op: handled above
    null;
  else
    create publication supabase_realtime for table public.leads, public.sale_properties, public.rental_bookings, public.rental_units;
  end if;
end $$;

-- Gallery photos for properties
create table if not exists public.property_photos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_id uuid references auth.users(id),
  rental_unit_id uuid references public.rental_units(id) on delete cascade,
  url text not null,
  position int
);
alter table public.property_photos enable row level security;

create policy "photos select for auth"
  on public.property_photos for select to authenticated using (true);
create policy "photos insert for auth"
  on public.property_photos for insert to authenticated with check (true);
