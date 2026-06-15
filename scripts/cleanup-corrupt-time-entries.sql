-- =============================================================================
-- cleanup-corrupt-time-entries.sql
-- =============================================================================
-- Removes time_entries left in an impossible state by manual testing:
--   * the session spans more than 24h (a forgotten clock-out), or
--   * a subtask's clockIn/clockOut falls outside the session's own window, or
--   * a break's startTime/endTime falls outside the session's own window.
-- These produce the giant durations (271h, 287h subtasks, 19h breaks) seen in
-- the history/calendar. Real sessions are unaffected.
--
-- HOW TO USE:
--   1. Run STEP 1 (preview) and review the rows it returns.
--   2. If they're all junk, run STEP 2 (delete).
-- DESTRUCTIVE — there is no undo. Scope it to your user_id if sharing the DB.
-- =============================================================================

-- ---- STEP 1: PREVIEW (safe, read-only) --------------------------------------
SELECT
  id,
  date,
  clock_in,
  clock_out,
  round(EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600.0, 1) AS span_hours,
  jsonb_array_length(COALESCE(subtasks, '[]'::jsonb))         AS subtask_count,
  jsonb_array_length(COALESCE(breaks, '[]'::jsonb))           AS break_count
FROM time_entries
WHERE clock_out IS NOT NULL
  AND (
        clock_out - clock_in > interval '24 hours'
     OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(subtasks, '[]'::jsonb)) s
          WHERE (s->>'clockOut')::timestamptz > clock_out + interval '1 minute'
             OR (s->>'clockIn')::timestamptz  < clock_in  - interval '1 minute'
        )
     OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(COALESCE(breaks, '[]'::jsonb)) b
          WHERE (b->>'endTime')::timestamptz   > clock_out + interval '1 minute'
             OR (b->>'startTime')::timestamptz < clock_in  - interval '1 minute'
        )
      )
ORDER BY span_hours DESC NULLS LAST;

-- ---- STEP 2: DELETE (run only after reviewing STEP 1) -----------------------
-- DELETE FROM time_entries
-- WHERE clock_out IS NOT NULL
--   AND (
--         clock_out - clock_in > interval '24 hours'
--      OR EXISTS (
--           SELECT 1 FROM jsonb_array_elements(COALESCE(subtasks, '[]'::jsonb)) s
--           WHERE (s->>'clockOut')::timestamptz > clock_out + interval '1 minute'
--              OR (s->>'clockIn')::timestamptz  < clock_in  - interval '1 minute'
--         )
--      OR EXISTS (
--           SELECT 1 FROM jsonb_array_elements(COALESCE(breaks, '[]'::jsonb)) b
--           WHERE (b->>'endTime')::timestamptz   > clock_out + interval '1 minute'
--              OR (b->>'startTime')::timestamptz < clock_in  - interval '1 minute'
--         )
--       );
