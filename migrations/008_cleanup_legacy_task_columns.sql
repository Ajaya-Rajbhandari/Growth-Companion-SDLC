-- =============================================================================
-- 008_cleanup_legacy_task_columns.sql
-- =============================================================================
-- The hand-made `tasks` table carried columns from an earlier task design
-- (skill-tree / gamification) that the current app never reads or writes. They
-- were the source of the "null value in column ... violates not-null constraint"
-- errors before 000 relaxed them. Verified unused across the entire codebase
-- (lib, app, components, scripts) — safe to remove.
--
-- DESTRUCTIVE: drops columns. Run only after confirming there is no data in them
-- you care about. Idempotent (DROP COLUMN IF EXISTS), so re-running is a no-op,
-- and a no-op on fresh projects where 000 never created these columns.
-- =============================================================================

ALTER TABLE tasks DROP COLUMN IF EXISTS skill_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS description;
ALTER TABLE tasks DROP COLUMN IF EXISTS estimated_minutes;
ALTER TABLE tasks DROP COLUMN IF EXISTS difficulty;
ALTER TABLE tasks DROP COLUMN IF EXISTS source_task_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS is_active;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
