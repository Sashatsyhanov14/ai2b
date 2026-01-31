-- Long-term rental contracts for rent_long_units
-- Run this in Supabase SQL editor once, after rent_long_units and leads exist.

create table if not exists public.rent_long_contracts (
  id           uuid primary key default gen_random_uuid(),
  unit_id      uuid not null references public.rent_long_units(id) on delete cascade,
  lead_id      uuid references public.leads(id),
  tenant_name  text,
  telegram_id  bigint,
  start_date   date not null,
  review_date  date not null,
  status       text not null default 'active', -- active | extended | closed
  is_active    boolean not null default true, -- quick flag: активен / не активен
  meta         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- For existing databases where rent_long_contracts уже создана:
alter table public.rent_long_contracts
  add column if not exists is_active boolean not null default true;

create or replace function public.set_rent_long_contracts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_rent_long_contracts_updated_at on public.rent_long_contracts;
create trigger trg_rent_long_contracts_updated_at
before update on public.rent_long_contracts
for each row
execute function public.set_rent_long_contracts_updated_at();
