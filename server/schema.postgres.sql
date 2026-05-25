-- ============================================================
-- Cargo QC — Supabase / PostgreSQL Schema (v1.1.0)
-- ------------------------------------------------------------
-- Bu fayl Supabase loyiha SQL Editor'ida ishga tushiriladi.
-- Barcha CREATE'lar `IF NOT EXISTS` — qayta yuritish xavfsiz.
--
-- Strategiya:
--   - Custom auth: username + password_hash (Supabase Auth ishlatilmaydi)
--   - JSONB payload — frontend mavjud shaklini buzmaslik uchun
--   - RLS yoqilgan, anon role uchun read/write ochiq (internal tool)
--   - Realtime — barcha jadvallar uchun yoqilgan
-- ============================================================

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1) ROLES (lookup)
-- ============================================================
create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

insert into roles (code, name) values
  ('admin', 'Administrator'),
  ('manager', 'Manager'),
  ('menejer', 'Menejer'),
  ('operator', 'Operator'),
  ('supervisor', 'Supervisor')
on conflict (code) do nothing;

-- ============================================================
-- 2) USERS (custom auth — username + password_hash)
-- ============================================================
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,            -- SHA-256, 'sha256:' prefix bilan
  full_name text not null,
  role text not null default 'operator',  -- roles.code'ga ishora
  avatar_url text default '',
  active boolean not null default true,
  work_start text default '',             -- '09:00' shaklida
  work_end text default '',
  permissions jsonb default '[]'::jsonb,  -- custom permissions massivi
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_users_username on users (lower(username));
create index if not exists idx_users_role on users (role);
create index if not exists idx_users_active on users (active);

-- ============================================================
-- 3) APP SETTINGS — yagona payload bilan (problem_types, departments va h.k.)
-- ============================================================
create table if not exists app_settings (
  id text primary key,                    -- masalan: 'otk_settings'
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text default ''
);

-- ============================================================
-- 4) COMPLAINTS ENTRIES (OTK murojaatlar)
-- ============================================================
create table if not exists complaints_entries (
  id text primary key,                    -- frontend bergan ID
  date timestamptz not null default now(),
  track_code text not null default '',
  problem_type text default '',
  department text default 'Belgilanmagan',
  request_source text default 'Belgilanmagan',
  status text default 'Jarayonda',
  priority text default 'Past',
  comment text default '',
  -- Owner tracking
  handled_by text default '',
  handled_by_id text default '',
  handled_by_role text default '',
  created_by text default '',
  created_by_id text default '',
  created_by_role text default '',
  last_updated_by text default '',
  last_updated_by_id text default '',
  last_updated_by_role text default '',
  -- Import metadata
  source_system text not null default 'cargo-qc-ui',
  source_row_key text default '',
  import_batch_id text default '',
  imported_at timestamptz,
  -- Lifecycle
  closed_at timestamptz,
  archived_at timestamptz,
  is_archived boolean not null default false,
  is_deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  -- Frontend shape'ini saqlash uchun
  payload jsonb default '{}'::jsonb
);

create index if not exists idx_complaints_track_code on complaints_entries (lower(track_code));
create index if not exists idx_complaints_date on complaints_entries (date desc);
create index if not exists idx_complaints_status on complaints_entries (status);
create index if not exists idx_complaints_department on complaints_entries (department);
create index if not exists idx_complaints_problem_type on complaints_entries (problem_type);
create index if not exists idx_complaints_is_archived on complaints_entries (is_archived);
create index if not exists idx_complaints_is_deleted on complaints_entries (is_deleted);

-- ============================================================
-- 5) COMPENSATED LOADS REGISTRY (104 — Moliya)
-- ============================================================
create table if not exists compensated_loads_registry (
  id text primary key,
  track_code text not null default '',
  compensated_date timestamptz,
  phone text default '',
  customer text default '',
  payment_amount text default '',         -- raqam yoki matn (free-form)
  payment_status text default 'Kutmoqda',
  comment text default '',
  found_case_outcome text default '',
  found_resolution_status text default 'Qabul qilindi',
  -- Workflow (assigned employee tracking)
  assigned_to text default '',
  assigned_to_id text default '',
  assigned_at timestamptz,
  workflow_comment text default '',
  receipt_file jsonb,                     -- { url, name, type, size }
  -- CRM-104 maxsus maydonlari
  javobgar text default '',
  baraka_status text default '',
  entered_date_104 text default '',
  -- Lifecycle
  imported_at timestamptz,
  updated_at timestamptz not null default now(),
  -- Frontend shape
  payload jsonb default '{}'::jsonb
);

create index if not exists idx_compensated_track on compensated_loads_registry (lower(track_code));
create index if not exists idx_compensated_status on compensated_loads_registry (payment_status);
create index if not exists idx_compensated_resolution on compensated_loads_registry (found_resolution_status);

-- ============================================================
-- 6) ASSISTANT AI REQUESTS (telegram bot murojaatlari)
-- ============================================================
create table if not exists assistant_ai_requests (
  id text primary key,
  track_code text default '',
  customer_id text default '',
  phone text default '',
  full_name text default '',
  problem_type text default '',
  status text default 'Qabul qildi',
  source text default 'telegram_bot',
  handled_by text default '',
  comment text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assistant_ai_track on assistant_ai_requests (lower(track_code));
create index if not exists idx_assistant_ai_status on assistant_ai_requests (status);
create index if not exists idx_assistant_ai_created on assistant_ai_requests (created_at desc);

-- ============================================================
-- 7) MODULE 102 COMPLAINTS (OTK detal sahifa)
-- ============================================================
create table if not exists module_102_complaints (
  id text primary key,
  date timestamptz not null default now(),
  customer text default '',
  phone text default '',
  problem_summary text default '',
  status text default 'qabul_qilindi',    -- qabul_qilindi | jarayonda | yopildi | finansga_yuborish
  responsible_dept text default '',
  reason text default '',
  operator_note text default '',
  handled_by text default '',
  handled_by_id text default '',
  -- Lifecycle
  closed_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  -- Tracks list + audit log (JSONB)
  tracks jsonb default '[]'::jsonb,
  audit_log jsonb default '[]'::jsonb,
  payload jsonb default '{}'::jsonb
);

create index if not exists idx_module_102_status on module_102_complaints (status);
create index if not exists idx_module_102_date on module_102_complaints (date desc);
create index if not exists idx_module_102_dept on module_102_complaints (responsible_dept);

-- ============================================================
-- 8) AUDIT LOGS (umumiy)
-- ============================================================
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id text default '',
  actor_name text default 'System',
  actor_role text default '',
  entity_type text not null,              -- 'complaint' | 'compensated' | 'assistant_ai' | 'module_102' | 'settings'
  entity_id text not null,
  action text not null,                   -- 'create' | 'update' | 'delete' | 'assign' | 'status_change'
  message text default '',
  track_code text default '',
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_entity on audit_logs (entity_type, entity_id);
create index if not exists idx_audit_created on audit_logs (created_at desc);

-- ============================================================
-- 9) IMPORT BATCHES (Excel import tarixini ushlash)
-- ============================================================
create table if not exists import_batches (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  profile_key text not null,              -- 'otk_workplace' | 'compensated_104' va h.k.
  imported_by_id text default '',
  imported_by_name text default '',
  row_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  skipped_count integer not null default 0,
  status text not null default 'completed',  -- 'completed' | 'failed' | 'partial'
  error_message text default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_import_profile on import_batches (profile_key);
create index if not exists idx_import_created on import_batches (created_at desc);

-- ============================================================
-- 10) Auto-update `updated_at` triggers
-- ============================================================
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on users;
create trigger trg_users_updated_at before update on users
  for each row execute function set_updated_at();

drop trigger if exists trg_app_settings_updated_at on app_settings;
create trigger trg_app_settings_updated_at before update on app_settings
  for each row execute function set_updated_at();

drop trigger if exists trg_complaints_updated_at on complaints_entries;
create trigger trg_complaints_updated_at before update on complaints_entries
  for each row execute function set_updated_at();

drop trigger if exists trg_compensated_updated_at on compensated_loads_registry;
create trigger trg_compensated_updated_at before update on compensated_loads_registry
  for each row execute function set_updated_at();

drop trigger if exists trg_assistant_updated_at on assistant_ai_requests;
create trigger trg_assistant_updated_at before update on assistant_ai_requests
  for each row execute function set_updated_at();

drop trigger if exists trg_module_102_updated_at on module_102_complaints;
create trigger trg_module_102_updated_at before update on module_102_complaints
  for each row execute function set_updated_at();

-- ============================================================
-- 11) ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------
-- Internal tool — anon role uchun read/write ochiq.
-- Real production'da auth.uid() bilan tighten qilinishi mumkin.
-- ============================================================

-- Yoqish
alter table users enable row level security;
alter table app_settings enable row level security;
alter table complaints_entries enable row level security;
alter table compensated_loads_registry enable row level security;
alter table assistant_ai_requests enable row level security;
alter table module_102_complaints enable row level security;
alter table audit_logs enable row level security;
alter table import_batches enable row level security;

-- Helper makros: read + write policy bitta funksiyada
do $$
declare
  t text;
  tables text[] := array[
    'users',
    'app_settings',
    'complaints_entries',
    'compensated_loads_registry',
    'assistant_ai_requests',
    'module_102_complaints',
    'audit_logs',
    'import_batches'
  ];
begin
  foreach t in array tables
  loop
    execute format('drop policy if exists "%s_anon_read" on %I;', t, t);
    execute format('drop policy if exists "%s_anon_write" on %I;', t, t);
    execute format('drop policy if exists "%s_anon_update" on %I;', t, t);
    execute format('drop policy if exists "%s_anon_delete" on %I;', t, t);

    execute format(
      'create policy "%s_anon_read" on %I for select to anon using (true);',
      t, t
    );
    execute format(
      'create policy "%s_anon_write" on %I for insert to anon with check (true);',
      t, t
    );
    execute format(
      'create policy "%s_anon_update" on %I for update to anon using (true) with check (true);',
      t, t
    );
    execute format(
      'create policy "%s_anon_delete" on %I for delete to anon using (true);',
      t, t
    );
  end loop;
end $$;

-- ============================================================
-- 12) Realtime publication (Supabase Realtime uchun)
-- ============================================================
-- Quyidagi buyruqlarni Supabase Dashboard'da Database → Replication
-- bo'limida ham qo'lda yoqish mumkin. Lekin SQL ham ishlatamiz:
alter publication supabase_realtime add table users;
alter publication supabase_realtime add table app_settings;
alter publication supabase_realtime add table complaints_entries;
alter publication supabase_realtime add table compensated_loads_registry;
alter publication supabase_realtime add table assistant_ai_requests;
alter publication supabase_realtime add table module_102_complaints;

-- ============================================================
-- 13) Seed: birinchi admin foydalanuvchi
-- ------------------------------------------------------------
-- Parol: admin123 ning SHA-256 hash'i
-- (frontend authHash.js bilan bir xil format: 'sha256:' prefix)
-- ============================================================
insert into users (username, password_hash, full_name, role, active, work_start, work_end)
values (
  'jaloldin.mirzakbarov',
  'sha256:240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
  'Jaloldin Mirzakbarov',
  'admin',
  true,
  '09:00',
  '18:00'
)
on conflict (username) do nothing;

-- ============================================================
-- ✅ SCHEMA TAYYOR
-- Endi: .env.local'da VITE_SUPABASE_URL va VITE_SUPABASE_ANON_KEY
-- to'ldiring, dev serverni qayta ishga tushiring.
-- ============================================================
