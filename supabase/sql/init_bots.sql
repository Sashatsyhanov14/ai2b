create table if not exists public.bots (
  id bigserial primary key,
  token text not null,
  masked_token text not null,
  webhook_secret_path text not null unique,
  webhook_secret_token text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

-- Optional RLS example:
-- alter table public.bots enable row level security;
-- create policy "read masked token" on public.bots for select using (true);
