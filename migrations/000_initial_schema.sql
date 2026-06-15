-- =============================================================================
-- 000_initial_schema.sql — Baseline schema for the core tables
-- =============================================================================
-- These tables (tasks, notes, time_entries, work_templates, chat_sessions) were
-- originally created by hand in the Supabase dashboard and never tracked in the
-- repo, so a fresh Supabase project could not be reproduced from these
-- migrations. This file captures them from the Db* types in lib/mappers.ts and
-- the inserts in lib/slices/*.ts.
--
-- Safe to run against an existing database: every statement is idempotent
-- (CREATE TABLE / INDEX IF NOT EXISTS, ADD COLUMN IF NOT EXISTS). It will NOT
-- drop or recreate tables that already exist, so existing data is preserved.
-- Columns added by later migrations (003 urgency, 007 completed, 001 category,
-- 006 subtasks) are included here so a brand-new project gets the full shape in
-- one pass; the incremental migrations then become no-ops.
--
-- Run order: this is 000 — run it BEFORE 001-007.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- tasks
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  urgency TEXT DEFAULT 'medium' CHECK (urgency IN ('low', 'medium', 'high')),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Backfill columns on a pre-existing tasks table created without them.
-- (CREATE TABLE IF NOT EXISTS above is a no-op when the table already exists,
-- so every column the app inserts must be re-asserted here.)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'medium';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE;
-- The legacy hand-made tasks table has extra NOT NULL columns the app's task
-- model never populates (e.g. `description`, `estimated_minutes`), each of which
-- breaks inserts with "null value in column ... violates not-null constraint".
-- Rather than patch them one by one, relax NOT NULL on every column EXCEPT the
-- ones the app always provides (id, user_id, title). Idempotent and self-healing
-- against whatever other surprise columns the manual table carries.
DO $$
DECLARE
  col record;
BEGIN
  FOR col IN
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
      AND is_nullable = 'NO'
      AND column_name NOT IN ('id', 'user_id', 'title')
  LOOP
    EXECUTE format('ALTER TABLE tasks ALTER COLUMN %I DROP NOT NULL;', col.column_name);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
CREATE POLICY "Users can view their own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
CREATE POLICY "Users can insert their own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
CREATE POLICY "Users can update their own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
CREATE POLICY "Users can delete their own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- notes
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  category TEXT DEFAULT 'other' CHECK (category IN ('work', 'personal', 'ideas', 'meeting', 'other')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Backfill columns on a pre-existing notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
-- Relax any legacy NOT NULL columns the app does not populate (keep id/user_id/title).
DO $$
DECLARE col record;
BEGIN
  FOR col IN
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notes'
      AND is_nullable = 'NO' AND column_name NOT IN ('id', 'user_id', 'title')
  LOOP
    EXECUTE format('ALTER TABLE notes ALTER COLUMN %I DROP NOT NULL;', col.column_name);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own notes" ON notes;
CREATE POLICY "Users can view their own notes" ON notes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own notes" ON notes;
CREATE POLICY "Users can insert their own notes" ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
CREATE POLICY "Users can update their own notes" ON notes FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;
CREATE POLICY "Users can delete their own notes" ON notes FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- time_entries
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  break_minutes INTEGER NOT NULL DEFAULT 0,
  breaks JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  title TEXT,
  template_id UUID,
  category TEXT,
  subtasks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Backfill columns on a pre-existing time_entries table (incl. 001 category, 006 subtasks)
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_out TIMESTAMPTZ;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS break_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS breaks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS subtasks JSONB DEFAULT '[]'::jsonb;
-- Relax any legacy NOT NULL columns the app does not populate (keep the columns
-- the clock-in insert always provides: id/user_id/date/clock_in).
DO $$
DECLARE col record;
BEGIN
  FOR col IN
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'time_entries'
      AND is_nullable = 'NO' AND column_name NOT IN ('id', 'user_id', 'date', 'clock_in')
  LOOP
    EXECUTE format('ALTER TABLE time_entries ALTER COLUMN %I DROP NOT NULL;', col.column_name);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);

ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own time entries" ON time_entries;
CREATE POLICY "Users can view their own time entries" ON time_entries FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own time entries" ON time_entries;
CREATE POLICY "Users can insert their own time entries" ON time_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own time entries" ON time_entries;
CREATE POLICY "Users can update their own time entries" ON time_entries FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own time entries" ON time_entries;
CREATE POLICY "Users can delete their own time entries" ON time_entries FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- work_templates
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Backfill columns on a pre-existing work_templates table
ALTER TABLE work_templates ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE work_templates ADD COLUMN IF NOT EXISTS usage_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_work_templates_user_id ON work_templates(user_id);

ALTER TABLE work_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own work templates" ON work_templates;
CREATE POLICY "Users can view their own work templates" ON work_templates FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own work templates" ON work_templates;
CREATE POLICY "Users can insert their own work templates" ON work_templates FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own work templates" ON work_templates;
CREATE POLICY "Users can update their own work templates" ON work_templates FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own work templates" ON work_templates;
CREATE POLICY "Users can delete their own work templates" ON work_templates FOR DELETE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- chat_sessions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Chat',
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Backfill columns on a pre-existing chat_sessions table
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS messages JSONB DEFAULT '[]'::jsonb;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON chat_sessions;
CREATE POLICY "Users can view their own chat sessions" ON chat_sessions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own chat sessions" ON chat_sessions;
CREATE POLICY "Users can insert their own chat sessions" ON chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own chat sessions" ON chat_sessions;
CREATE POLICY "Users can update their own chat sessions" ON chat_sessions FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete their own chat sessions" ON chat_sessions;
CREATE POLICY "Users can delete their own chat sessions" ON chat_sessions FOR DELETE USING (auth.uid() = user_id);

-- Force PostgREST to reload its schema cache so new tables/columns are visible immediately
NOTIFY pgrst, 'reload schema';
