# Test Data Seeding Guide

This guide explains how to seed comprehensive test data for testing all features of the Growth Companion SDLC app.

## Overview

The seeding script generates:
- **500 tasks** with various completion states, priorities, and due dates (spanning 200 days)
- **300 notes** with past dates, categories, and tags
- **200 days of time entries** with breaks, categories, and realistic work sessions
- **20 goals** with various statuses and milestones
- **8 habits** with logs for the past 100 days
- **8 time categories** for organizing time entries

## Method 1: Using the UI Button (Recommended) ✅

**Easiest method - No setup required!**

1. **Log in** to the app
2. Navigate to **Profile** view (click "Profile" in the sidebar)
3. Scroll down to find the **"Test Data Seeding"** card
4. Click the **"🌱 Seed Test Data"** button
5. Confirm the action when prompted
6. Wait for the seeding to complete (progress will be shown)
7. The app will automatically refresh when done

**Note:** This method uses the browser's Supabase client, so you must be logged in.

---

## Method 2: Using Node.js Script

**For command-line usage**

### Prerequisites

1. Install `tsx` (TypeScript executor):
   ```bash
   npm install --save-dev tsx
   ```
   Or if using the updated package.json:
   ```bash
   npm install
   ```

2. Make sure you have your `.env` file with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Running the Script

1. **Log in to the app first** (the script needs your session)
2. Get your session token from the browser:
   - Open browser console (F12)
   - Run: `(await supabase.auth.getSession()).data.session.access_token`
   - Copy the token

3. Run the script:
   ```bash
   npm run seed
   ```

   Or directly:
   ```bash
   npx tsx scripts/seed-test-data.ts
   ```

**Note:** The Node.js script uses the Supabase client which requires authentication. You may need to modify it to use a service role key for automated seeding.

---

## Method 3: Using Browser Console

**For developers who want to run it manually**

1. **Log in** to the app
2. Open browser console (F12)
3. Copy the contents of `scripts/seed-test-data-browser.js`
4. Paste into the console and press Enter
5. Wait for completion

---

## Method 4: Using API Route

**For programmatic access**

1. **Log in** to the app and get your session token
2. Make a POST request to `/api/seed-test-data`:
   ```javascript
   const response = await fetch('/api/seed-test-data', {
     method: 'POST',
     headers: {
       'Authorization': `Bearer ${your_session_token}`,
       'Content-Type': 'application/json',
     },
   })
   const result = await response.json()
   console.log(result)
   ```

---

## What Gets Created

### Time Categories (8)
- Development, Meetings, Research, Code Review, Documentation, Testing, Planning, Debugging
- Each with a unique color

### Tasks (500)
- Mix of completed and pending tasks
- Various priorities (low, medium, high)
- Various urgency levels
- Due dates spanning from 200 days ago to 30 days in the future
- Created dates distributed over the past 200 days

### Notes (300)
- Various categories (work, personal, ideas, meeting, other)
- Tags (urgent, important, follow-up, research, design, etc.)
- Created dates spanning 200 days
- Some notes have updated dates (simulating edits)

### Time Entries (~200-300 entries)
- Work sessions spanning 200 days
- Realistic work hours (1-8 hours per session)
- Multiple sessions per day (1-3 sessions)
- Breaks included (0-3 breaks per session)
- Categories assigned randomly
- Weekend work included (30% chance)
- Some days skipped for realism (10% of weekdays)

### Goals (20)
- Various statuses: active, completed, paused, cancelled
- Progress tracking (0-100%)
- Target dates in the future
- Milestones (0-5 per goal)
- Categories: Career, Health, Learning, Personal, Work

### Habits (8)
- Daily, weekly, and custom frequencies
- Target counts (1-5)
- Various colors

### Habit Logs (~800-1000 logs)
- Logs for past 100 days
- 70% completion rate (realistic)
- Counts (1-3 per day)
- Some with notes

---

## Data Distribution

- **Time Range:** 200 days of historical data
- **Tasks:** Distributed over 200 days, some completed, some pending
- **Notes:** Created dates spread over 200 days, some with updates
- **Time Entries:** Work sessions for ~150-180 days (weekends and some weekdays skipped)
- **Goals:** Created over past 200 days, various completion states
- **Habits:** Created recently, logs for past 100 days

---

## Testing Scenarios Covered

✅ **Calendar View:**
- Tasks with due dates visible
- Time entries on various dates
- Goals with target dates
- Habits showing daily tracking

✅ **Dashboard:**
- Last 7 days chart with data
- Weekly statistics
- Task completion rates
- Time tracking metrics

✅ **Timesheet View:**
- 200 days of history
- Various categories
- Breaks included
- Multiple sessions per day

✅ **Tasks View:**
- 500 tasks to filter and search
- Various priorities and urgency
- Completed and pending tasks
- Due dates spanning wide range

✅ **Notes View:**
- 300 notes to search
- Various categories
- Tags for filtering
- Past dates for testing date filters

✅ **Goals View:**
- 20 goals with various statuses
- Progress tracking
- Milestones
- Target dates

✅ **Habits View:**
- 8 habits
- 100 days of logs
- Streak calculations
- Heatmap visualization

---

## Important Notes

⚠️ **Warning:** This will create a large amount of data in your database. Make sure you:
- Are using a test/development database
- Have enough storage space
- Understand that this data will be associated with your user account

🔄 **After Seeding:**
- Refresh the app to see the new data
- The app will automatically refresh after UI-based seeding
- All views should now show the test data

🗑️ **Clearing Test Data:**
- You can delete test data manually from Supabase dashboard
- Or create a cleanup script (not included)

---

## Troubleshooting

### "Not authenticated" error
- Make sure you're logged in to the app
- For Node.js script, you may need to use a service role key

### "Duplicate key" errors
- Some data may already exist
- The script handles duplicates gracefully
- You can run it multiple times safely

### Slow performance
- Seeding 200 days of data takes time (2-5 minutes)
- Be patient, especially for time entries
- Progress is shown in the UI

### Missing data
- Check Supabase dashboard to verify data was created
- Check RLS policies are set correctly
- Verify migrations have been run

---

## Next Steps

After seeding:
1. ✅ Test calendar view with all the events
2. ✅ Test dashboard with 200 days of data
3. ✅ Test filtering and searching with large datasets
4. ✅ Test date range filters
5. ✅ Test export functionality with lots of data
6. ✅ Test performance with large datasets
7. ✅ Verify all charts and visualizations work

---

**Happy Testing! 🎉**
