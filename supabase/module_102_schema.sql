-- ============================================================
-- Module 102 (OTK) — Supabase schema
-- ------------------------------------------------------------
-- 102 modulidagi murojaatlar va ularning treklarini saqlovchi jadval.
-- Treks list nested JSONB sifatida saqlanadi (bitta murojaatda
-- bir nechta trek bo'lishi mumkin).
-- ============================================================

CREATE TABLE IF NOT EXISTS module_102_entries (
  id              TEXT PRIMARY KEY,
  phone           TEXT NOT NULL,
  customer        TEXT DEFAULT '',
  status          TEXT DEFAULT 'qabul_qilindi',
  source          TEXT DEFAULT 'manual',
  locked_by       TEXT,
  locked_at       TIMESTAMPTZ,
  note            TEXT DEFAULT '',
  tracks          JSONB DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted      BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS module_102_phone_idx ON module_102_entries (phone);
CREATE INDEX IF NOT EXISTS module_102_status_idx ON module_102_entries (status);
CREATE INDEX IF NOT EXISTS module_102_updated_idx ON module_102_entries (updated_at DESC);
CREATE INDEX IF NOT EXISTS module_102_created_idx ON module_102_entries (created_at DESC);

-- updated_at avto-yangilanishi uchun trigger
CREATE OR REPLACE FUNCTION module_102_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS module_102_updated_at_trigger ON module_102_entries;
CREATE TRIGGER module_102_updated_at_trigger
  BEFORE UPDATE ON module_102_entries
  FOR EACH ROW
  EXECUTE FUNCTION module_102_set_updated_at();

-- RLS (Row Level Security) — anon API uchun ochiq (custom auth ishlatamiz)
ALTER TABLE module_102_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS module_102_anon_select ON module_102_entries;
CREATE POLICY module_102_anon_select ON module_102_entries
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS module_102_anon_insert ON module_102_entries;
CREATE POLICY module_102_anon_insert ON module_102_entries
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS module_102_anon_update ON module_102_entries;
CREATE POLICY module_102_anon_update ON module_102_entries
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS module_102_anon_delete ON module_102_entries;
CREATE POLICY module_102_anon_delete ON module_102_entries
  FOR DELETE TO anon USING (true);

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE module_102_entries;

-- ============================================================
-- Audit log jadvali (marshrut tarixi)
-- ============================================================

CREATE TABLE IF NOT EXISTS module_102_audit (
  id              TEXT PRIMARY KEY,
  complaint_id    TEXT NOT NULL,
  module          TEXT DEFAULT '102-modul',
  actor_id        TEXT,
  actor_name      TEXT DEFAULT '',
  action          TEXT NOT NULL,
  from_status     TEXT,
  to_status       TEXT,
  note            TEXT DEFAULT '',
  attempts        INTEGER DEFAULT 0,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS module_102_audit_complaint_idx ON module_102_audit (complaint_id);
CREATE INDEX IF NOT EXISTS module_102_audit_timestamp_idx ON module_102_audit (timestamp DESC);

ALTER TABLE module_102_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS module_102_audit_anon_select ON module_102_audit;
CREATE POLICY module_102_audit_anon_select ON module_102_audit
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS module_102_audit_anon_insert ON module_102_audit;
CREATE POLICY module_102_audit_anon_insert ON module_102_audit
  FOR INSERT TO anon WITH CHECK (true);
