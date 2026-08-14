-- =============================================================================
-- 019_time_entry_validity_constraints.sql — make duration invariants real
-- =============================================================================
-- time_entries currently carries no CHECK constraints at all. Every rule about
-- what a valid session looks like lives in browser TypeScript — the clamp in
-- lib/utils.ts resolveEntryEnd() and the write-path cap in lib/slices/timesheet.ts
-- — and writes go straight from the browser to PostgREST with the public anon
-- key. RLS enforces *ownership* but says nothing about *validity*, so the
-- database will accept a negative-length session or a 500-hour one.
--
-- That is not hypothetical. dc50cc2 and 015_repair_inflated_time_entries.sql
-- exist because abandoned sessions were committed as genuine multi-day entries
-- and silently inflated every report while the app looked healthy. The app-side
-- fix clamps the value before writing; it does not stop anything else writing.
--
-- These constraints turn that class of silent corruption into an immediate,
-- loud write failure that Sentry already captures — which is strictly better
-- than monitoring for it after the fact. Monitoring is the compensating control
-- for an invariant the schema declines to enforce; this removes the need.
--
-- Like 017, this refuses to run against dirty data rather than choosing which
-- rows to change. If it aborts, resolve the listed rows with a reviewed repair
-- (015 is the precedent) and re-run. On clean data it is idempotent.
--
-- Deliberately NOT included: a check that break_minutes cannot exceed the
-- session length. It is logically correct but risks rejecting legacy rows on
-- rounding alone, and a wrong break total is a reporting annoyance rather than
-- the silent-inflation class this migration exists to close.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1 — preview. Read-only. Run this alone first and read the output.
-- -----------------------------------------------------------------------------
-- SELECT
--   count(*) FILTER (WHERE clock_out IS NOT NULL AND clock_out <= clock_in)   AS inverted_or_zero,
--   count(*) FILTER (WHERE clock_out IS NOT NULL
--                      AND (clock_out - clock_in)
--                          - make_interval(mins => COALESCE(break_minutes, 0))
--                          > interval '24 hours')                             AS worked_over_24h,
--   count(*) FILTER (WHERE break_minutes < 0)                                 AS negative_breaks,
--   count(*)                                                                  AS total_rows
-- FROM time_entries;

-- -----------------------------------------------------------------------------
-- STEP 2 — guard. Aborts with the offending rows if any invariant is violated.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  bad_count INTEGER;
  sample TEXT;
BEGIN
  SELECT count(*) INTO bad_count
  FROM time_entries
  WHERE (clock_out IS NOT NULL AND clock_out <= clock_in)
     OR (clock_out IS NOT NULL
         AND (clock_out - clock_in)
             - make_interval(mins => COALESCE(break_minutes, 0)) > interval '24 hours')
     OR break_minutes < 0;

  IF bad_count > 0 THEN
    SELECT string_agg(
             format('%s (user %s, %s, %s)', id, user_id, date, reason),
             ', '
           )
    INTO sample
    FROM (
      SELECT id, user_id, date,
             CASE
               WHEN clock_out IS NOT NULL AND clock_out <= clock_in
                 THEN 'clock_out <= clock_in'
               WHEN clock_out IS NOT NULL
                    AND (clock_out - clock_in)
                        - make_interval(mins => COALESCE(break_minutes, 0)) > interval '24 hours'
                 THEN format('%s worked', (clock_out - clock_in)
                        - make_interval(mins => COALESCE(break_minutes, 0)))
               ELSE format('break_minutes = %s', break_minutes)
             END AS reason
      FROM time_entries
      WHERE (clock_out IS NOT NULL AND clock_out <= clock_in)
         OR (clock_out IS NOT NULL
             AND (clock_out - clock_in)
                 - make_interval(mins => COALESCE(break_minutes, 0)) > interval '24 hours')
         OR break_minutes < 0
      ORDER BY date DESC
      LIMIT 10
    ) AS worst;

    RAISE EXCEPTION
      'Cannot add time_entry validity constraints: % row(s) already violate them. Repair them first (see 015_repair_inflated_time_entries.sql), then re-run. Worst offenders: %',
      bad_count, sample;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- STEP 3 — constraints. DROP-then-ADD so re-running is a no-op; Postgres has no
-- ADD CONSTRAINT IF NOT EXISTS for CHECK.
-- -----------------------------------------------------------------------------

-- A closed session must end after it starts. Catches inverted writes and
-- zero-length entries, neither of which the app can legitimately produce.
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_clock_out_after_clock_in;
ALTER TABLE time_entries ADD CONSTRAINT time_entries_clock_out_after_clock_in
  CHECK (clock_out IS NULL OR clock_out > clock_in);

-- Worked time cannot exceed a day. Deliberately bounds (elapsed - breaks), not
-- elapsed: break_minutes is recorded separately, so a session where someone
-- forgets to end a break legitimately spans more than 24h of wall clock while
-- the worked total stays normal. Production data shows exactly that — an entry
-- spanning 29.8h with a ~19.8h break and ~10h worked. Bounding elapsed would
-- reject it, destroying a real workday.
--
-- make_interval and interval arithmetic are IMMUTABLE, so this is legal in a
-- CHECK. A NULL break_minutes is treated as zero.
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_duration_within_a_day;
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_worked_within_a_day;
ALTER TABLE time_entries ADD CONSTRAINT time_entries_worked_within_a_day
  CHECK (
    clock_out IS NULL
    OR (clock_out - clock_in) - make_interval(mins => COALESCE(break_minutes, 0))
       <= interval '24 hours'
  );

-- Break time cannot be negative. 000_initial_schema.sql dropped NOT NULL from
-- this column, so NULL is tolerated; only negative values are rejected.
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_break_minutes_non_negative;
ALTER TABLE time_entries ADD CONSTRAINT time_entries_break_minutes_non_negative
  CHECK (break_minutes IS NULL OR break_minutes >= 0);

COMMENT ON CONSTRAINT time_entries_clock_out_after_clock_in ON time_entries IS
  'A closed session ends after it starts. See migration 019.';
COMMENT ON CONSTRAINT time_entries_worked_within_a_day ON time_entries IS
  'Worked time (elapsed minus breaks) is at most 24h. Bounds worked rather than elapsed so a long unended break does not reject a real workday. See migration 019.';
COMMENT ON CONSTRAINT time_entries_break_minutes_non_negative ON time_entries IS
  'Break minutes are never negative. See migration 019.';

-- -----------------------------------------------------------------------------
-- Rollback, if a constraint turns out to reject legitimate writes.
-- -----------------------------------------------------------------------------
-- ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_clock_out_after_clock_in;
-- ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_worked_within_a_day;
-- ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_break_minutes_non_negative;

-- -----------------------------------------------------------------------------
-- Post-check — must return zero rows.
-- -----------------------------------------------------------------------------
-- SELECT id, user_id, date, clock_in, clock_out, break_minutes
-- FROM time_entries
-- WHERE (clock_out IS NOT NULL AND clock_out <= clock_in)
--    OR (clock_out IS NOT NULL AND (clock_out - clock_in)
--          - make_interval(mins => COALESCE(break_minutes, 0)) > interval '24 hours')
--    OR break_minutes < 0;
