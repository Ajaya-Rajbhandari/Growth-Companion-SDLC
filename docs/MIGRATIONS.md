# Database Migration Guide

This guide will help you run the database migrations for the Growth Companion SDLC application in Supabase.

## Prerequisites

- Access to your Supabase project dashboard
- SQL Editor access in Supabase

## Migration Files

The following migration files need to be run in order:

0. `migrations/000_initial_schema.sql` - **Baseline**: creates the core tables (tasks, notes, time_entries, work_templates, chat_sessions) with RLS. Run this FIRST on a fresh project. It is idempotent and safe to run on an existing database (it won't drop data).
1. `migrations/001_add_time_categories.sql` - Adds time categories table and category column to time_entries
2. `migrations/002_add_goals_table.sql` - Creates the goals table
3. `migrations/003_add_urgency_to_tasks.sql` - Adds urgency column to tasks table
4. `migrations/004_add_habits_tables.sql` - Creates habits and habit_logs tables
5. `migrations/005_add_ai_analytics.sql` - Creates AI feedback and analytics tables
6. `migrations/006_add_time_entry_subtasks.sql` - Adds subtask history storage to time_entries
7. `migrations/007_add_completed_to_tasks.sql` - Adds the `completed` boolean column to tasks
8. `migrations/008_cleanup_legacy_task_columns.sql` - Drops unused legacy columns from tasks (skill_id, description, estimated_minutes, difficulty, source_task_id, is_active). **Destructive** — see file header.
9. `migrations/009_add_analytics_events.sql` - Creates the `analytics_events` table for global product analytics (see scripts/analytics-queries.sql).
10. `migrations/010_add_admin_analytics.sql` - Adds the `admins` allowlist + SECURITY DEFINER functions powering the in-app Admin dashboard. **After running, add yourself as an admin** (see file header).
11. `migrations/011_admin_cms.sql` - Adds admin CMS data functions (list users, recent events, grant/revoke admin).

## Steps to Run Migrations

### Option 1: Using Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run Each Migration**
   - Copy the contents of each migration file (starting with `001_add_time_categories.sql`)
   - Paste it into the SQL Editor
   - Click "Run" or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
   - Wait for the success message
   - Repeat for each migration file in order (001, 002, 003, 004, 005, 006)

### Option 2: Using Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Make sure you're in the project root directory
cd /path/to/growth-companion-sdlc

# Link to your Supabase project (if not already linked)
supabase link --project-ref your-project-ref

# Run all migrations
supabase db push
```

## Verification

After running all migrations, verify the tables exist:

1. Go to **Table Editor** in Supabase
2. You should see the following new tables:
   - `time_categories`
   - `goals`
   - `habits`
   - `habit_logs`
   - `ai_feedback`
   - `ai_insights`
3. Check that the `tasks` table has a new `urgency` column
4. Check that the `tasks` table has a new `completed` column
5. Check that the `time_entries` table has a new `category` column
6. Check that the `time_entries` table has a new `subtasks` column

## Troubleshooting

### Error: "relation already exists"
- This means the table already exists. You can either:
  - Skip that migration if the table structure matches
  - Drop the table and re-run the migration (⚠️ **WARNING**: This will delete all data)

### Error: "column already exists"
- The column has already been added. You can skip that part of the migration.

### Error: "permission denied"
- Make sure you're using the correct database role
- Check that Row Level Security (RLS) policies are correctly set up

## Migration Order

**IMPORTANT**: Run migrations in this exact order:

0. ✅ `000_initial_schema.sql`
1. ✅ `001_add_time_categories.sql`
2. ✅ `002_add_goals_table.sql`
3. ✅ `003_add_urgency_to_tasks.sql`
4. ✅ `004_add_habits_tables.sql`
5. ✅ `005_add_ai_analytics.sql`
6. ✅ `006_add_time_entry_subtasks.sql`
7. ✅ `007_add_completed_to_tasks.sql`
8. ✅ `008_cleanup_legacy_task_columns.sql`

## After Migration

Once all migrations are complete:

1. **Test the application**
   - Try creating a goal
   - Try creating a habit
   - Try adding a time category
   - Try setting task urgency
   - Try switching tasks while clocked in

2. **Verify RLS Policies**
   - All tables should have Row Level Security enabled
   - Users should only be able to access their own data

## Need Help?

If you encounter any issues:
1. Check the Supabase logs in the Dashboard
2. Verify your environment variables are set correctly
3. Ensure you're logged in as the correct user when testing
