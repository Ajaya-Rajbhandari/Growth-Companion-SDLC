-- 015_repair_inflated_time_entries.sql
--
-- One-off data repair for time entries inflated by abandoned sessions.
--
-- Background: until the fix in PR #12, a session left open was measured against
-- "now" in every report, and closing it stamped the current time with no ceiling.
-- A session abandoned for four days was therefore written into history as a real
-- ~96-hour entry, permanently skewing the analytics and AI coach totals.
--
-- This script clamps each affected entry to the longest span its owner's settings
-- could legitimately produce: office_hours + grace_minutes + allow_overwork_minutes,
-- plus that entry's own recorded break minutes. It is deliberately generous — the
-- goal is to remove impossible data, not to second-guess plausible data.
--
-- SAFETY
--   * Every modified row is copied to time_entries_repair_backup first (see the
--     rollback block at the bottom — this is fully reversible).
--   * Runs in a single transaction.
--   * Idempotent: a second run matches nothing, because repaired rows are already
--     within the cap.
--   * Leaves active sessions alone. An open entry is only closed once it has been
--     open longer than ABANDONED_AFTER (24h below), so a session you are currently
--     clocked into is never touched.
--
-- HOW TO RUN
--   1. Run STEP 1 on its own and read the output. Nothing is modified.
--   2. Only if STEP 1 looks right, run STEP 2.
--   3. STEP 3 (commented out) restores everything if you change your mind.

-- ---------------------------------------------------------------------------
-- Shared definition of "what should this entry's maximum end time have been?"
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW time_entry_repair_candidates AS
WITH limits AS (
  SELECT
    u.id AS user_id,
    COALESCE((u.raw_user_meta_data ->> 'office_hours')::numeric, 9) * 60
      + COALESCE((u.raw_user_meta_data ->> 'grace_minutes')::numeric, 0)
      + COALESCE((u.raw_user_meta_data ->> 'allow_overwork_minutes')::numeric, 0)
      AS limit_minutes
  FROM auth.users u
)
SELECT
  e.id,
  e.user_id,
  e.date,
  e.clock_in,
  e.clock_out,
  e.break_minutes,
  l.limit_minutes,
  e.clock_in + make_interval(mins => (l.limit_minutes + e.break_minutes)::int) AS max_clock_out,
  CASE WHEN e.clock_out IS NULL THEN 'abandoned_open' ELSE 'over_cap_closed' END AS reason,
  ROUND(EXTRACT(epoch FROM (COALESCE(e.clock_out, now()) - e.clock_in)) / 3600, 1) AS recorded_hours,
  ROUND((l.limit_minutes + e.break_minutes) / 60.0, 1) AS capped_hours
FROM time_entries e
JOIN limits l ON l.user_id = e.user_id
WHERE
  -- Closed entries that recorded more than the settings could ever allow.
  (
    e.clock_out IS NOT NULL
    AND e.clock_out > e.clock_in + make_interval(mins => (l.limit_minutes + e.break_minutes)::int)
  )
  -- Sessions left open long enough that they are certainly abandoned, not active.
  OR (
    e.clock_out IS NULL
    AND e.clock_in < now() - interval '24 hours'
  );

-- ===========================================================================
-- STEP 1 — PREVIEW. Read-only. Run this first and inspect the rows.
-- ===========================================================================
--   SELECT reason, count(*) AS entries,
--          ROUND(SUM(recorded_hours)::numeric, 1) AS hours_now,
--          ROUND(SUM(capped_hours)::numeric, 1)   AS hours_after
--   FROM time_entry_repair_candidates
--   GROUP BY reason;
--
--   SELECT id, date, clock_in, clock_out, recorded_hours, capped_hours, reason
--   FROM time_entry_repair_candidates
--   ORDER BY recorded_hours DESC;

-- ===========================================================================
-- STEP 2 — REPAIR. Modifies data. Only run after reviewing STEP 1.
-- ===========================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS time_entries_repair_backup (
  id             UUID PRIMARY KEY,
  user_id        UUID NOT NULL,
  date           DATE,
  clock_in       TIMESTAMPTZ,
  clock_out      TIMESTAMPTZ,       -- the ORIGINAL value, before clamping
  break_minutes  INTEGER,
  reason         TEXT,
  repaired_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep the pre-repair state so STEP 3 can put it back verbatim.
INSERT INTO time_entries_repair_backup (id, user_id, date, clock_in, clock_out, break_minutes, reason)
SELECT id, user_id, date, clock_in, clock_out, break_minutes, reason
FROM time_entry_repair_candidates
ON CONFLICT (id) DO NOTHING;

UPDATE time_entries e
SET clock_out = LEAST(COALESCE(e.clock_out, now()), c.max_clock_out)
FROM time_entry_repair_candidates c
WHERE c.id = e.id;

COMMIT;

-- Confirm afterwards — this should return no rows:
--   SELECT * FROM time_entry_repair_candidates WHERE clock_out IS NOT NULL;

-- ===========================================================================
-- STEP 3 — ROLLBACK. Restores every repaired entry to its original clock_out.
-- ===========================================================================
--   BEGIN;
--   UPDATE time_entries e
--   SET clock_out = b.clock_out
--   FROM time_entries_repair_backup b
--   WHERE b.id = e.id;
--   COMMIT;
