-- ============================================================
-- Toshkent ombori — omborga qaytgan yuklar (returns) jadvali
-- ------------------------------------------------------------
-- Omborga vozvrat bo'lib qaytgan treklar shu yerga kiritiladi.
-- Avtomatik tarzda 104 — Moliyada "Topilgan yuk" sifatida ham qayd
-- etiladi (compensated_loads_registry orqali).
-- ============================================================

CREATE TABLE IF NOT EXISTS warehouse_returns (
  id              TEXT PRIMARY KEY,
  track_code      TEXT NOT NULL,
  return_date     TIMESTAMPTZ NOT NULL DEFAULT now(),
  problem_type    TEXT DEFAULT '',
  responsible     TEXT DEFAULT '',
  customer_phone  TEXT DEFAULT '',
  customer_name   TEXT DEFAULT '',
  note            TEXT DEFAULT '',
  status          TEXT DEFAULT 'qabul_qilindi',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted      BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS warehouse_returns_track_idx ON warehouse_returns (track_code);
CREATE INDEX IF NOT EXISTS warehouse_returns_date_idx ON warehouse_returns (return_date DESC);
CREATE INDEX IF NOT EXISTS warehouse_returns_status_idx ON warehouse_returns (status);
CREATE INDEX IF NOT EXISTS warehouse_returns_updated_idx ON warehouse_returns (updated_at DESC);

-- updated_at avto-yangilanishi
CREATE OR REPLACE FUNCTION warehouse_returns_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS warehouse_returns_updated_at_trigger ON warehouse_returns;
CREATE TRIGGER warehouse_returns_updated_at_trigger
  BEFORE UPDATE ON warehouse_returns
  FOR EACH ROW
  EXECUTE FUNCTION warehouse_returns_set_updated_at();

-- RLS — anon API uchun ochiq
ALTER TABLE warehouse_returns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS warehouse_returns_anon_select ON warehouse_returns;
CREATE POLICY warehouse_returns_anon_select ON warehouse_returns
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS warehouse_returns_anon_insert ON warehouse_returns;
CREATE POLICY warehouse_returns_anon_insert ON warehouse_returns
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS warehouse_returns_anon_update ON warehouse_returns;
CREATE POLICY warehouse_returns_anon_update ON warehouse_returns
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS warehouse_returns_anon_delete ON warehouse_returns;
CREATE POLICY warehouse_returns_anon_delete ON warehouse_returns
  FOR DELETE TO anon USING (true);

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE warehouse_returns;
