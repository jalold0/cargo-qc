create extension if not exists "pgcrypto";

create table if not exists public.compensated_loads_registry (
  id text primary key,
  track_code text not null default '',
  compensated_date timestamptz null,
  phone text not null default '',
  customer text not null default '',
  payment_amount text not null default '',
  payment_status text not null default 'Kutmoqda',
  comment text not null default '',
  found_case_outcome text not null default '',
  found_resolution_status text not null default 'Jarayonda',
  imported_at timestamptz null,
  updated_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb
);

create index if not exists compensated_loads_registry_track_code_idx
  on public.compensated_loads_registry (track_code);

create index if not exists compensated_loads_registry_payment_status_idx
  on public.compensated_loads_registry (payment_status);

alter table public.compensated_loads_registry enable row level security;

drop policy if exists "compensated_loads_registry_select_anon" on public.compensated_loads_registry;
create policy "compensated_loads_registry_select_anon"
on public.compensated_loads_registry
for select
to anon
using (true);

drop policy if exists "compensated_loads_registry_insert_anon" on public.compensated_loads_registry;
create policy "compensated_loads_registry_insert_anon"
on public.compensated_loads_registry
for insert
to anon
with check (true);

drop policy if exists "compensated_loads_registry_update_anon" on public.compensated_loads_registry;
create policy "compensated_loads_registry_update_anon"
on public.compensated_loads_registry
for update
to anon
using (true)
with check (true);
