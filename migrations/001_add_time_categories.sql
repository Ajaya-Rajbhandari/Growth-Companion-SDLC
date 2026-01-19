-- Add category column to time_entries table
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS category TEXT;

-- Create time_categories table for user-defined categories
CREATE TABLE IF NOT EXISTS time_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_time_categories_user_id ON time_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_category ON time_entries(category);

-- Enable RLS (Row Level Security)
ALTER TABLE time_categories ENABLE ROW LEVEL SECURITY;

-- Create policy for time_categories
CREATE POLICY "Users can view their own time categories"
  ON time_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own time categories"
  ON time_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time categories"
  ON time_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time categories"
  ON time_categories FOR DELETE
  USING (auth.uid() = user_id);
