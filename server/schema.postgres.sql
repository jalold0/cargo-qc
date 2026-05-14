create extension if not exists pgcrypto;

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  full_name text not null,
  role_code text not null references roles(code),
  avatar_url text default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  permission_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, permission_key)
);

create table if not exists settings_problem_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists settings_departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists settings_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  profile_key text not null,
  imported_by uuid references users(id),
  row_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  skipped_count integer not null default 0,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create table if not exists otk_entries (
  id uuid primary key default gen_random_uuid(),
  track_code text not null,
  event_date timestamptz not null,
  problem_type text not null,
  department text default 'Belgilanmagan',
  request_source text default 'Belgilanmagan',
  status text not null,
  priority text not null default 'Past',
  comment text default '',
  handled_by_name text default 'OTK workplace',
  handled_by_user_id uuid references users(id),
  created_by_name text default 'OTK workplace',
  created_by_user_id uuid references users(id),
  last_updated_by_name text default '',
  last_updated_by_user_id uuid references users(id),
  source_system text not null default 'cargo-qc-ui',
  source_row_key text default '',
  import_batch_id uuid references import_batches(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_otk_entries_track_code on otk_entries(track_code);
create index if not exists idx_otk_entries_event_date on otk_entries(event_date desc);
create index if not exists idx_otk_entries_status on otk_entries(status);
create index if not exists idx_otk_entries_department on otk_entries(department);
create index if not exists idx_otk_entries_source_row_key on otk_entries(source_row_key);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users(id),
  actor_name text not null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
