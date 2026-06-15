-- =============================================================================
-- 009_add_analytics_events.sql — homegrown product/behavioral analytics
-- =============================================================================
-- A single append-only event stream for global product analytics: who did what,
-- when. Written client-side via lib/analytics.ts trackEvent(); read globally by
-- the app owner from the Supabase SQL Editor (service role bypasses RLS — see
-- scripts/analytics-queries.sql).
-- =============================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON analytics_events(event);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone (incl. anon, e.g. a just-signed-up user pending email confirmation) may
-- append events. Events are low-stakes telemetry, not sensitive data.
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON analytics_events;
CREATE POLICY "Anyone can insert analytics events"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

-- Users may read only their own events. Global/aggregate reads are done by the
-- owner via the Supabase SQL Editor (service role), which bypasses RLS.
DROP POLICY IF EXISTS "Users can view their own analytics events" ON analytics_events;
CREATE POLICY "Users can view their own analytics events"
  ON analytics_events FOR SELECT
  USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
