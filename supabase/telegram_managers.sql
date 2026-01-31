-- Telegram managers who should receive notifications from the bot

create table if not exists public.telegram_managers (
  id          uuid primary key default gen_random_uuid(),
  telegram_id bigint not null,
  name        text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.telegram_managers disable row level security;

