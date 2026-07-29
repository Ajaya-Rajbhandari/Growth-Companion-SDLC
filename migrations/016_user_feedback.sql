-- =============================================================================
-- 016_user_feedback.sql — general user feedback channel
-- =============================================================================
-- The admin Feedback page previously read chat_feedback, which only records
-- thumbs on individual AI replies. There was no way for a user to send feedback
-- about the app itself. This adds that channel: users insert their own rows,
-- admins read all of them through a gated RPC.
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('bug', 'idea', 'other')),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  page TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_feedback_created_at_idx ON user_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS user_feedback_user_id_idx ON user_feedback (user_id);

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Users may submit and review their own feedback. Deliberately no UPDATE or
-- DELETE policy: submitted feedback is a record, not editable content.
DROP POLICY IF EXISTS "Users can submit their own feedback" ON user_feedback;
CREATE POLICY "Users can submit their own feedback"
  ON user_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own feedback" ON user_feedback;
CREATE POLICY "Users can view their own feedback"
  ON user_feedback FOR SELECT USING (auth.uid() = user_id);

-- Admin read-all. RLS above would otherwise limit admins to their own rows, so
-- this is SECURITY DEFINER and re-checks is_admin() itself.
CREATE OR REPLACE FUNCTION admin_list_user_feedback(
  limit_count integer DEFAULT 100,
  category_filter text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.created_at DESC), '[]'::jsonb) INTO result FROM (
    SELECT f.id, f.created_at, f.category, f.message, f.page, f.user_id, u.email
    FROM user_feedback f
    LEFT JOIN auth.users u ON u.id = f.user_id
    WHERE (category_filter IS NULL OR f.category = category_filter)
    ORDER BY f.created_at DESC
    LIMIT LEAST(GREATEST(limit_count, 1), 500)
  ) t;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_list_user_feedback(integer, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
