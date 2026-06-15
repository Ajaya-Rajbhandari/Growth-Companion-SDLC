-- =============================================================================
-- 011_admin_cms.sql — data functions for the admin CMS (Users + Events sections)
-- =============================================================================
-- All SECURITY DEFINER + gated by is_admin(), like 010. Adds:
--   * admin_list_users()      — every user with activity stats + admin flag
--   * admin_recent_events()   — filterable recent event stream
--   * admin_set_admin()       — grant/revoke admin (won't remove the last admin)
-- =============================================================================

CREATE OR REPLACE FUNCTION admin_list_users()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::jsonb) INTO result FROM (
    SELECT
      u.id,
      u.email,
      u.created_at,
      u.last_sign_in_at,
      (u.email_confirmed_at IS NOT NULL) AS email_confirmed,
      EXISTS (SELECT 1 FROM admins a WHERE a.user_id = u.id) AS is_admin,
      (SELECT COUNT(*) FROM analytics_events e WHERE e.user_id = u.id) AS event_count,
      (SELECT MAX(e.created_at) FROM analytics_events e WHERE e.user_id = u.id) AS last_event_at
    FROM auth.users u
  ) t;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION admin_recent_events(limit_count integer DEFAULT 100, event_filter text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::jsonb) INTO result FROM (
    SELECT e.id, e.created_at, e.event, e.user_id, u.email, e.path, e.properties
    FROM analytics_events e
    LEFT JOIN auth.users u ON u.id = e.user_id
    WHERE (event_filter IS NULL OR e.event = event_filter)
    ORDER BY e.created_at DESC
    LIMIT LEAST(GREATEST(limit_count, 1), 500)
  ) t;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION admin_set_admin(target uuid, make_admin boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;

  IF make_admin THEN
    INSERT INTO admins (user_id) VALUES (target) ON CONFLICT DO NOTHING;
  ELSE
    IF (SELECT COUNT(*) FROM admins) <= 1 THEN
      RAISE EXCEPTION 'cannot remove the last admin';
    END IF;
    DELETE FROM admins WHERE user_id = target;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_list_users() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_recent_events(integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_admin(uuid, boolean) TO authenticated;

NOTIFY pgrst, 'reload schema';
