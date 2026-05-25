create extension if not exists "pgcrypto";

create table if not exists public.assistant_ai_requests (
  id text primary key,
  track_code text not null default '',
  customer_id text not null default '',
  phone text not null default '',
  full_name text not null default '',
  problem_type text not null default '',
  status text not null default 'Qabul qildi',
  source text not null default 'telegram_bot',
  handled_by text not null default '',
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assistant_ai_requests_created_at_idx
  on public.assistant_ai_requests (created_at desc);

create index if not exists assistant_ai_requests_track_code_idx
  on public.assistant_ai_requests (track_code);

alter table public.assistant_ai_requests enable row level security;

drop policy if exists "assistant_ai_requests_select_anon" on public.assistant_ai_requests;
create policy "assistant_ai_requests_select_anon"
on public.assistant_ai_requests
for select
to anon
using (true);

drop policy if exists "assistant_ai_requests_insert_anon" on public.assistant_ai_requests;
create policy "assistant_ai_requests_insert_anon"
on public.assistant_ai_requests
for insert
to anon
with check (true);

drop policy if exists "assistant_ai_requests_update_anon" on public.assistant_ai_requests;
create policy "assistant_ai_requests_update_anon"
on public.assistant_ai_requests
for update
to anon
using (true)
with check (true);
