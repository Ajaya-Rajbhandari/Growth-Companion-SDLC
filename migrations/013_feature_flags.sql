-- =============================================================================
-- 013_feature_flags.sql — DB-backed feature flag overrides (live admin toggles)
-- =============================================================================
-- A row here overrides the static default in lib/feature-flags.ts. The app reads
-- the table on load (public SELECT) and applies overrides for everyone; admins
-- write via the gated RPC. No row = use the code default.
-- =============================================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  name TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Public read so live toggles apply to all clients (incl. signed-out).
DROP POLICY IF EXISTS "Anyone can read feature flags" ON feature_flags;
CREATE POLICY "Anyone can read feature flags"
  ON feature_flags FOR SELECT USING (true);
-- No client writes — admins go through admin_set_feature_flag().

CREATE OR REPLACE FUNCTION admin_set_feature_flag(flag_name text, is_enabled boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;

  INSERT INTO feature_flags (name, enabled, updated_at, updated_by)
  VALUES (flag_name, is_enabled, now(), auth.uid())
  ON CONFLICT (name) DO UPDATE
    SET enabled = EXCLUDED.enabled, updated_at = now(), updated_by = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION admin_set_feature_flag(text, boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';
