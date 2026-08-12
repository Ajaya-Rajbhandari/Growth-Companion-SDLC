-- =============================================================================
-- 017_one_time_entry_per_day.sql — enforce the once-per-day rule in the database
-- =============================================================================
-- clockIn() checks for an existing entry with a SELECT and then INSERTs. That is
-- a check-then-act race: two clicks a few hundred milliseconds apart can both
-- pass the SELECT before either INSERT lands, leaving a user with two sessions
-- for the same day and a silently doubled timesheet.
--
-- The client now serialises the mutation, but the client is not the authority —
-- the widget, a second tab, and a retried request all bypass any in-memory latch.
-- This makes the rule a constraint instead of a convention.
--
-- The index is created only when the existing data already satisfies it. If any
-- duplicates are present the migration aborts with the offending user/date pairs
-- rather than choosing which record to destroy — that call belongs to a human,
-- and 015_repair_inflated_time_entries.sql is the precedent for a reviewed fix.
-- =============================================================================

DO $$
DECLARE
  duplicate_count INTEGER;
  sample TEXT;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT user_id, date
    FROM time_entries
    GROUP BY user_id, date
    HAVING COUNT(*) > 1
  ) AS dupes;

  IF duplicate_count > 0 THEN
    SELECT string_agg(format('%s on %s (%s rows)', user_id, date, row_count), ', ')
    INTO sample
    FROM (
      SELECT user_id, date, COUNT(*) AS row_count
      FROM time_entries
      GROUP BY user_id, date
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 10
    ) AS worst;

    RAISE EXCEPTION
      'Cannot add the once-per-day constraint: % user/date pair(s) already have more than one time entry. Resolve them first, then re-run. Worst offenders: %',
      duplicate_count, sample;
  END IF;
END $$;

-- Partial on nothing — every entry carries a user_id and a date (both NOT NULL in
-- 000_initial_schema.sql), so this covers the whole table.
CREATE UNIQUE INDEX IF NOT EXISTS time_entries_one_per_user_per_day_idx
  ON time_entries (user_id, date);

COMMENT ON INDEX time_entries_one_per_user_per_day_idx IS
  'Enforces the app rule that a user clocks in at most once per calendar day. See migration 017.';
