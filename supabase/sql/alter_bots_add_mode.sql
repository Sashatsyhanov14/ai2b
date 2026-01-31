-- Adds a mode column used to control bot behavior (e.g., 'assistant', 'crm')
alter table if exists public.bots
  add column if not exists mode text not null default 'assistant';

