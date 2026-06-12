-- Add task-switch history storage to time entries.
-- Subtasks array structure: [{id, title, clockIn, clockOut}]
-- When a user switches tasks mid-session, the previous task is stored as a subtask
-- with clockIn/clockOut times marking the duration spent on that specific task.
ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::jsonb;

UPDATE time_entries
SET subtasks = '[]'::jsonb
WHERE subtasks IS NULL;

-- Ensure RLS policies apply to this column (inherited from time_entries policy)
-- Users can only access/modify subtasks of their own time entries via existing RLS
