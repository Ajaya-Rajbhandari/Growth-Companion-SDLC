-- =============================================================================
-- analytics-queries.sql — global product analytics "dashboard"
-- =============================================================================
-- Run these in the Supabase SQL Editor (service role bypasses RLS, so you see
-- ALL users' events). Each block is independent — run the one you want.
-- Events come from lib/analytics.ts trackEvent(). Adjust the time windows freely.
-- =============================================================================

-- ---- Event volume by type (last 30 days) -----------------------------------
SELECT event, COUNT(*) AS events, COUNT(DISTINCT user_id) AS users
FROM analytics_events
WHERE created_at > now() - interval '30 days'
GROUP BY event
ORDER BY events DESC;

-- ---- Daily Active Users (last 30 days) -------------------------------------
SELECT date_trunc('day', created_at)::date AS day,
       COUNT(DISTINCT user_id) AS dau,
       COUNT(*) AS events
FROM analytics_events
WHERE user_id IS NOT NULL AND created_at > now() - interval '30 days'
GROUP BY day
ORDER BY day DESC;

-- ---- Weekly / Monthly active users -----------------------------------------
SELECT
  COUNT(DISTINCT user_id) FILTER (WHERE created_at > now() - interval '7 days')  AS wau,
  COUNT(DISTINCT user_id) FILTER (WHERE created_at > now() - interval '30 days') AS mau
FROM analytics_events
WHERE user_id IS NOT NULL;

-- ---- New signups per day ----------------------------------------------------
SELECT date_trunc('day', created_at)::date AS day, COUNT(*) AS signups
FROM analytics_events
WHERE event = 'user_signed_up'
GROUP BY day
ORDER BY day DESC;

-- ---- Onboarding funnel (signup -> completed/skipped) -----------------------
SELECT
  COUNT(*) FILTER (WHERE event = 'user_signed_up')        AS signups,
  COUNT(*) FILTER (WHERE event = 'onboarding_completed')  AS completed,
  COUNT(*) FILTER (WHERE event = 'onboarding_skipped')    AS skipped,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event = 'onboarding_completed')
    / NULLIF(COUNT(*) FILTER (WHERE event = 'user_signed_up'), 0), 1
  ) AS completion_pct
FROM analytics_events;

-- ---- Feature adoption (create events) --------------------------------------
SELECT event,
       COUNT(*) AS total,
       COUNT(DISTINCT user_id) AS users
FROM analytics_events
WHERE event IN ('task_created', 'note_created', 'goal_created', 'habit_created', 'clock_in')
GROUP BY event
ORDER BY users DESC;

-- ---- Clock-in / worked-time stats (last 30 days) ---------------------------
SELECT date_trunc('day', created_at)::date AS day,
       COUNT(*) AS clock_outs,
       ROUND(AVG((properties->>'workedMinutes')::numeric) / 60.0, 1) AS avg_hours,
       ROUND(AVG((properties->>'taskCount')::numeric), 1) AS avg_tasks_per_session
FROM analytics_events
WHERE event = 'clock_out' AND created_at > now() - interval '30 days'
GROUP BY day
ORDER BY day DESC;

-- ---- Most active users (last 30 days) --------------------------------------
SELECT user_id, COUNT(*) AS events, COUNT(DISTINCT event) AS distinct_actions,
       MAX(created_at) AS last_seen
FROM analytics_events
WHERE user_id IS NOT NULL AND created_at > now() - interval '30 days'
GROUP BY user_id
ORDER BY events DESC
LIMIT 25;

-- ---- Raw recent event stream (debug) ---------------------------------------
SELECT created_at, event, user_id, path, properties
FROM analytics_events
ORDER BY created_at DESC
LIMIT 100;
