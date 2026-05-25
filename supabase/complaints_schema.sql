create extension if not exists "pgcrypto";

create table if not exists public.complaints_entries (
  id text primary key,
  date timestamptz not null default now(),
  track_code text not null default '',
  problem_type text not null default '',
  department text not null default '',
  request_source text not null default '',
  status text not null default 'Jarayonda',
  priority text not null default 'Past',
  comment text not null default '',
  handled_by text not null default '',
  handled_by_id bigint null,
  handled_by_role text not null default '',
  created_by text not null default '',
  created_by_id bigint null,
  created_by_role text not null default '',
  last_updated_by text not null default '',
  last_updated_by_id bigint null,
  last_updated_by_role text not null default '',
  source_system text not null default 'cargo-qc-ui',
  source_row_key text not null default '',
  import_batch_id text not null default '',
  imported_at timestamptz null,
  updated_at timestamptz not null default now(),
  closed_at timestamptz null,
  archived_at timestamptz null,
  is_archived boolean not null default false,
  is_deleted boolean not null default false,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists complaints_entries_date_idx
  on public.complaints_entries (date desc);

create index if not exists complaints_entries_track_code_idx
  on public.complaints_entries (track_code);

create index if not exists complaints_entries_archived_idx
  on public.complaints_entries (is_archived, is_deleted);

alter table public.complaints_entries enable row level security;

drop policy if exists "complaints_entries_select_anon" on public.complaints_entries;
create policy "complaints_entries_select_anon"
on public.complaints_entries
for select
to anon
using (true);

drop policy if exists "complaints_entries_insert_anon" on public.complaints_entries;
create policy "complaints_entries_insert_anon"
on public.complaints_entries
for insert
to anon
with check (true);

drop policy if exists "complaints_entries_update_anon" on public.complaints_entries;
create policy "complaints_entries_update_anon"
on public.complaints_entries
for update
to anon
using (true)
with check (true);
