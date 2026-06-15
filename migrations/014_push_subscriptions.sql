-- =============================================================================
-- 014_push_subscriptions.sql — Web Push subscriptions for closed-app reminders
-- =============================================================================
-- One row per browser/device push subscription. Users manage their own (RLS);
-- the daily cron sender reads all of them with the service-role key.
-- =============================================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert their own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users insert their own push subscriptions"
  ON push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view their own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users view their own push subscriptions"
  ON push_subscriptions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete their own push subscriptions" ON push_subscriptions;
CREATE POLICY "Users delete their own push subscriptions"
  ON push_subscriptions FOR DELETE USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
