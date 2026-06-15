-- Add completed column to tasks table
-- The app (lib/slices/tasks.ts, lib/mappers.ts) reads/writes a boolean `completed`
-- column, but the tasks table was created without it, causing:
--   "Could not find the 'completed' column of 'tasks' in the schema cache"
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster filtering by completion status
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);

-- Force PostgREST to reload its schema cache so the new column is picked up immediately
NOTIFY pgrst, 'reload schema';
