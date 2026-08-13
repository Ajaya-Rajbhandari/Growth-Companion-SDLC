-- =============================================================================
-- 018_analytics_events_attribution.sql — stop forged event attribution
-- =============================================================================
-- 009 opened analytics_events to any inserter with `WITH CHECK (true)` so that a
-- just-signed-up user pending email confirmation could still emit events. The
-- reasoning covered confidentiality — telemetry is not sensitive — but not
-- integrity: user_id is supplied by the caller (lib/analytics.ts), and the anon
-- key is public by design, shipped in the client bundle.
--
-- Anyone could therefore attribute arbitrary events to any user_id. Those rows
-- are read globally by admin_get_analytics (010) and per-user by admin_get_user
-- (012), so fabricated activity surfaces in the admin dashboards as genuine user
-- behaviour, and poisons the event stream that incident detection leans on.
--
-- The rule is not "anonymous callers get a pass" — it is "nobody may attribute an
-- event to someone else". Unattributed telemetry stays open; attributed telemetry
-- must match the caller:
--
--   auth state | user_id     | result
--   -----------+-------------+---------------------------------------------
--   signed out | NULL        | allowed  — pre-confirmation signup telemetry
--   signed out | some user   | REJECTED — this is the forgery being closed
--   signed in  | NULL        | allowed  — see note below, this case is real
--   signed in  | self        | allowed  — the normal path
--   signed in  | another user| REJECTED — impersonation
--
-- The `user_id IS NULL` branch is load-bearing, not a loophole. trackEvent writes
-- `user_id: userId ?? null` (lib/analytics.ts), and three call sites pass an
-- optional id — lib/slices/ui.ts (onboarding_completed, onboarding_skipped) and
-- components/ai-coach-card.tsx (ai_insight_generated) all use `user?.id`. If the
-- store's user has not hydrated while a Supabase session is already live, those
-- inserts carry a NULL user_id from a signed-in caller. Writing this check as
-- `auth.uid() IS NULL OR auth.uid() = user_id` would reject them, and
-- trackEvent only logs failures in development — so they would vanish silently
-- in production. Anchoring on user_id instead of auth.uid() avoids that.
-- =============================================================================

DROP POLICY IF EXISTS "Anyone can insert analytics events" ON analytics_events;

CREATE POLICY "Callers may only attribute events to themselves"
  ON analytics_events FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

COMMENT ON POLICY "Callers may only attribute events to themselves" ON analytics_events IS
  'Replaces 009''s WITH CHECK (true). Unattributed telemetry stays open; an attributed row must match auth.uid(), so no caller can write events onto another user. See migration 018.';

-- -----------------------------------------------------------------------------
-- Detection query — run after applying, to size pre-existing forged rows.
--
-- This finds only the *provably* forged subset: rows attributed to a user_id that
-- does not exist in auth.users. Rows forged onto a real account are by definition
-- indistinguishable from that user's genuine telemetry, so a clean result here is
-- not proof the table was never poisoned — only that no obvious junk remains.
--
-- Reports only; changes nothing. Any repair should follow the reviewed-migration
-- pattern in 015_repair_inflated_time_entries.sql.
-- -----------------------------------------------------------------------------
-- SELECT user_id, event, COUNT(*) AS rows, MIN(created_at) AS first_seen,
--        MAX(created_at) AS last_seen
-- FROM analytics_events
-- WHERE user_id IS NOT NULL
--   AND user_id NOT IN (SELECT id FROM auth.users)
-- GROUP BY user_id, event
-- ORDER BY rows DESC;
