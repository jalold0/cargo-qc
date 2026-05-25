create extension if not exists "pgcrypto";

create table if not exists public.app_settings (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_select_anon" on public.app_settings;
create policy "app_settings_select_anon"
on public.app_settings
for select
to anon
using (true);

drop policy if exists "app_settings_insert_anon" on public.app_settings;
create policy "app_settings_insert_anon"
on public.app_settings
for insert
to anon
with check (true);

drop policy if exists "app_settings_update_anon" on public.app_settings;
create policy "app_settings_update_anon"
on public.app_settings
for update
to anon
using (true)
with check (true);
