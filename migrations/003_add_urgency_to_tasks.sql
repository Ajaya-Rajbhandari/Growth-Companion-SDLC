-- Add urgency column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tasks_urgency ON tasks(urgency);
