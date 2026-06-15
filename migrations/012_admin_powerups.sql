-- =============================================================================
-- 012_admin_powerups.sql — admin user drill-down + feedback inbox
-- =============================================================================
-- SECURITY DEFINER + is_admin()-gated, like 010/011.
--   * admin_get_user(uuid)        — one user's profile, event breakdown, recent events
--   * admin_list_feedback(int,text) — global AI feedback stream (chat_feedback)
-- =============================================================================

CREATE OR REPLACE FUNCTION admin_get_user(target uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;

  result := jsonb_build_object(
    'user', (
      SELECT jsonb_build_object(
        'id', u.id,
        'email', u.email,
        'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at,
        'email_confirmed', (u.email_confirmed_at IS NOT NULL),
        'is_admin', EXISTS (SELECT 1 FROM admins a WHERE a.user_id = u.id)
      )
      FROM auth.users u WHERE u.id = target
    ),
    'eventCount', (SELECT COUNT(*) FROM analytics_events WHERE user_id = target),
    'lastEventAt', (SELECT MAX(created_at) FROM analytics_events WHERE user_id = target),
    'breakdown', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.count DESC), '[]'::jsonb) FROM (
        SELECT event, COUNT(*) AS count
        FROM analytics_events WHERE user_id = target GROUP BY event
      ) t
    ),
    'recentEvents', (
      SELECT COALESCE(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::jsonb) FROM (
        SELECT id, created_at, event, path, properties
        FROM analytics_events WHERE user_id = target
        ORDER BY created_at DESC LIMIT 50
      ) t
    )
  );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION admin_list_feedback(limit_count integer DEFAULT 100, type_filter text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::jsonb) INTO result FROM (
    SELECT f.id, f.created_at, f.feedback_type, f.feedback_text, f.user_id, u.email
    FROM chat_feedback f
    LEFT JOIN auth.users u ON u.id = f.user_id
    WHERE (type_filter IS NULL OR f.feedback_type = type_filter)
    ORDER BY f.created_at DESC
    LIMIT LEAST(GREATEST(limit_count, 1), 500)
  ) t;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_get_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_list_feedback(integer, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
