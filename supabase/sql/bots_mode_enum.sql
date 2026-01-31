-- Ensure enum type for bots.mode and constrain values
do $$ begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'bot_mode' and n.nspname = 'public'
  ) then
    create type public.bot_mode as enum ('assistant','crm','qa','search');
  end if;
end $$;

-- Add column if missing (enum)
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='bots' and column_name='mode'
  ) then
    alter table public.bots add column mode public.bot_mode not null default 'assistant';
  end if;
end $$;

-- If column exists as text, convert to enum safely
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='bots' and column_name='mode' and data_type <> 'USER-DEFINED'
  ) then
    alter table public.bots alter column mode type public.bot_mode using mode::public.bot_mode;
    alter table public.bots alter column mode set default 'assistant';
    alter table public.bots alter column mode set not null;
  end if;
end $$;

