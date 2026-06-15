-- =============================================================================
-- 010_add_admin_analytics.sql — in-app admin analytics (no service-role key)
-- =============================================================================
-- An `admins` allowlist plus SECURITY DEFINER functions that read GLOBAL
-- analytics. The functions run as their owner (bypassing RLS) but refuse to
-- return anything unless the caller is in `admins`, so the powerful access stays
-- server-side in Postgres and never needs a service-role key in the app.
--
-- AFTER RUNNING: add yourself as an admin (replace the email):
--   INSERT INTO admins (user_id)
--   SELECT id FROM auth.users WHERE email = 'you@example.com'
--   ON CONFLICT DO NOTHING;
-- =============================================================================

CREATE TABLE IF NOT EXISTS admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
-- A user may check whether THEY are an admin; no client-side writes.
DROP POLICY IF EXISTS "Users can read their own admin row" ON admins;
CREATE POLICY "Users can read their own admin row"
  ON admins FOR SELECT USING (auth.uid() = user_id);

-- Is the current caller an admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid());
$$;

-- Global analytics summary. Refuses non-admins. `days` bounds the time window.
CREATE OR REPLACE FUNCTION admin_get_analytics(days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  since timestamptz := now() - (days || ' days')::interval;
  result jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;

  result := jsonb_build_object(
    'totals', (
      SELECT jsonb_build_object(
        'events', COUNT(*),
        'users', COUNT(DISTINCT user_id),
        'signups', COUNT(*) FILTER (WHERE event = 'user_signed_up')
      )
      FROM analytics_events WHERE created_at > since
    ),
    'activeNow', (
      SELECT jsonb_build_object(
        'wau', COUNT(DISTINCT user_id) FILTER (WHERE created_at > now() - interval '7 days'),
        'mau', COUNT(DISTINCT user_id) FILTER (WHERE created_at > now() - interval '30 days')
      )
      FROM analytics_events WHERE user_id IS NOT NULL
    ),
    'eventVolume', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.events DESC), '[]'::jsonb) FROM (
        SELECT event, COUNT(*) AS events, COUNT(DISTINCT user_id) AS users
        FROM analytics_events WHERE created_at > since
        GROUP BY event
      ) t
    ),
    'dau', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.day), '[]'::jsonb) FROM (
        SELECT date_trunc('day', created_at)::date AS day,
               COUNT(DISTINCT user_id) AS dau, COUNT(*) AS events
        FROM analytics_events
        WHERE user_id IS NOT NULL AND created_at > since
        GROUP BY day
      ) t
    ),
    'funnel', (
      SELECT jsonb_build_object(
        'signups',   COUNT(*) FILTER (WHERE event = 'user_signed_up'),
        'completed', COUNT(*) FILTER (WHERE event = 'onboarding_completed'),
        'skipped',   COUNT(*) FILTER (WHERE event = 'onboarding_skipped')
      )
      FROM analytics_events
    ),
    'adoption', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.users DESC), '[]'::jsonb) FROM (
        SELECT event, COUNT(*) AS total, COUNT(DISTINCT user_id) AS users
        FROM analytics_events
        WHERE event IN ('task_created','note_created','goal_created','habit_created','clock_in')
        GROUP BY event
      ) t
    ),
    'activeUsers', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.events DESC), '[]'::jsonb) FROM (
        SELECT e.user_id, u.email,
               COUNT(*) AS events,
               COUNT(DISTINCT e.event) AS distinct_actions,
               MAX(e.created_at) AS last_seen
        FROM analytics_events e
        LEFT JOIN auth.users u ON u.id = e.user_id
        WHERE e.user_id IS NOT NULL AND e.created_at > since
        GROUP BY e.user_id, u.email
        ORDER BY events DESC
        LIMIT 25
      ) t
    )
  );

  RETURN result;
END;
$$;

-- Let logged-in users call these; the admin check inside gates the data.
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_analytics(integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
