-- Add task-switch history storage to time entries.
-- Each switch stores the previous task as a JSON object with clockIn/clockOut.
ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::jsonb;

UPDATE time_entries
SET subtasks = '[]'::jsonb
WHERE subtasks IS NULL;
