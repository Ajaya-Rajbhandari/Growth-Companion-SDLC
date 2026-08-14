# Incident Response

Production runbook for Growth Companion. Adapted from a generic Kubernetes-oriented
runbook to this stack: **Next.js App Router on Vercel** (project `growth-companion-sdlc`,
single region `iad1`), **Supabase** (Postgres + Auth + the entire authorization layer via
RLS), **Google Gemini** (sole AI provider), **Sentry** (errors only).

There are no pods, no replicas, and no orchestrator. Nothing to restart, nothing to scale.

> **Read [Known blind spots](#known-blind-spots) before you trust any signal in this
> document.** Several of this system's worst failure modes produce no error, no alert, and
> a green dashboard. Knowing which ones is the difference between a 20-minute incident and
> a four-day one.

---

## 0. First 60 seconds

1. **Check the providers before you debug your own code.** [vercel-status.com](https://www.vercel-status.com) and [status.supabase.com](https://status.supabase.com). Thirty seconds rules out "it isn't you."
2. **Open an incident log** — `docs/incidents/YYYY-MM-DD-short-slug.md`. Leave it *untracked* during the incident so rollbacks and `git checkout` can't touch it. Timestamps in **UTC** (Sentry, Vercel logs, and the cron are all UTC).
3. **Ask the question that sets severity:** *is bad data being written right now?* That outranks "is the site up?" Downtime is fully recoverable. Silent corruption may not be.
4. **If a deploy landed in the last 24h — roll back now** ([Option A](#option-a--rollback)), before understanding the cause. Diagnosis is a post-mortem activity, not a recovery activity.

---

## 1. Severity

| SEV | Definition | Response | Examples |
|-----|------------|----------|----------|
| **SEV1** | App unreachable, login broken, **or data being lost/corrupted right now**, or a security boundary failure | Immediate | Vercel/Supabase outage, auth callback failing for everyone, time-entry inflation, unauthenticated service-role access |
| **SEV2** | Core flow broken, app up, data intact and not degrading | < 1 hour | Clock in/out failing, Gemini down (all AI routes), a bad feature-flag toggle |
| **SEV3** | One non-core feature degraded, workaround exists | Next work block | Task-title suggestions down, push timing wrong, chart misrender |
| **SEV4** | Cosmetic, no user impact | Backlog | Styling, copy |

**The overriding rule: any data-integrity concern is SEV1**, even at 100% uptime. This
project has the precedent — [`migrations/015_repair_inflated_time_entries.sql`](../migrations/015_repair_inflated_time_entries.sql)
exists because abandoned sessions inflated every report while the app served traffic
normally.

**Escalation carve-out for silent corruption.** The generic "no root cause in 30 min →
escalate" trigger fires on *every* integrity incident by construction, because that time is
spent establishing whether corruption occurred at all. For this class, **start the 30-minute
clock when the corrupt-row set is quantified** (when the Tier 1 query returns), not when the
report arrives.

**Scope for integrity incidents is not user-count** — it is row-count and time-depth. The
defect amplifies with elapsed time, not traffic.

---

## 2. Escalation — time-boxed gates, not people

This is a solo/small-team project. There is nobody to escalate *to*, so escalation means
**the clock forcing a change of approach**. Proximity to a solution is the least reliable
signal a solo responder has. The clock starts at detection.

**SEV1**

| Gate | Forced action |
|------|---------------|
| **T+0** | Open the log. Check provider status. |
| **T+10** | Any deploy in the last 24h? **Roll back now**, cause unknown. If no recent deploy, skip. |
| **T+30** | Stop root-causing, start containing. Flag-kill the feature if it is one of the seven that can be killed ([Option B](#option-b--feature-flag-kill-switch)). If data is corrupting and you can't stop it, take the feature down — corruption outranks availability. |
| **T+60** | Declare degraded service. Write state, what you ruled out, next hypothesis. Set a resume time and **stop**. Nothing good is written after an hour of solo adrenaline. |

**SEV2** — T+0 log · T+60 smallest safe fix *or* turn the feature off, no third option · T+4h stop for the day · T+72h unresolved → downgrade to a tracked issue.

**SEV3/4** — no live response. GitHub issue, normal work.

Log each gate you pass with a one-line reason. That line *is* the escalation record.

---

## 3. Detection

### What actually exists

| Signal | Status |
|--------|--------|
| Sentry (org `sns-tech-services`, project `companion`) | Wired — [`instrumentation.ts`](../instrumentation.ts), server/edge/client configs |
| Vercel Runtime Logs | Available by default — **the only home for handled errors** |
| Vercel deployment + cron status | Available by default |
| Supabase dashboard logs | Available by default |
| `analytics_events` volume (`/admin/events`) | Exists, business-level signal |
| User feedback inbox (`/admin/feedback`) | Exists, pull-only |
| Sentry error capture | **Verified working** 2026-08-13 (1,411 sessions) |
| Daily data-integrity check ([`/api/cron/data-check`](../app/api/cron/data-check/route.ts), 13:30 UTC) | **The one push-based signal.** Runs 015's repair view and reports to Sentry + a red cron log when it finds anything |
| **Alert routing (anything that pages you)** | **Not configured in-repo** — unverifiable from code; check Sentry's alert rules directly |
| **Uptime / synthetic check** | **Does not exist** |
| **Health endpoint** | **Does not exist** |
| **On-call rotation, status page** | **Do not exist** |

Detection is **almost entirely pull-based**: someone opens a dashboard, or a user
complains. The single exception is the daily data-integrity check, which pushes a Sentry
issue when it finds corrupt rows. Nothing else reaches out to you — there is no uptime
monitor, no health endpoint, and no alert on error *rate*.

> ⚠️ **[`docs/MONITORING.md`](MONITORING.md) is aspirational, and partly wrong.** It is a
> wish list, not a description of production. [Line 41](MONITORING.md#L41) tells you to set
> `SENTRY_DSN`, but every config reads `NEXT_PUBLIC_SENTRY_DSN`
> ([`sentry.server.config.ts:6`](../sentry.server.config.ts#L6)). Its alert rules, Datadog
> dashboard, and Google Analytics sections describe systems that do not exist.
>
> **Verified 2026-08-13: Sentry is working.** The build log shows the
> `@sentry/nextjs` plugin running, and the dashboard (org `sns-tech-services`, project
> `companion`) holds 1,411 sessions and releases tagged with real commit SHAs. The DSN is
> supplied to the build even though it is absent from `vercel env ls` output — see the
> warning below about that command.

> ⚠️ **`vercel env ls` is not a reliable inventory of what a deployment receives.**
> Vercel marketplace integrations (Sentry, Supabase) inject variables that never appear in
> its output. On 2026-08-13 both `NEXT_PUBLIC_SENTRY_DSN` and `SUPABASE_SERVICE_ROLE_KEY`
> were absent from that listing while demonstrably present at build and runtime. **Never
> conclude a variable is missing from that command alone** — confirm by observing behaviour
> (a live probe, a build log, the provider's own dashboard).

### Symptoms by surface

**Time tracking** — "Clock-in failed" toast ([`clock-in-dialog.tsx:60`](../components/timesheet/clock-in-dialog.tsx#L60)); a session that won't stop (clock-out write failed, leaving an open entry whose duration inflates indefinitely). Not incidents: "already have an active session", "once per day", "daily limit reached".

**AI** — "The coach is unavailable right now." = Gemini failure (502). "AI is not configured." = missing `GEMINI_API_KEY` (503, a *config* incident). Truncated chat = the 28s Gemini abort racing the 30s function ceiling. 429 = rate limiting, which is per-warm-instance ([`rate-limit.ts:1-4`](../lib/server/rate-limit.ts#L1-L4)) — inconsistent throttling reports are expected behaviour, not an incident.

**Push** — the realistic symptom is **silence**. Nothing surfaces a failed daily send to anyone.

**Auth** — bounce back to `/auth` after a magic link. Note a site-wide 401 storm is an *env/config* incident, not mass session expiry: `getAuthenticatedUser()` returns `null` both for an invalid session and for missing Supabase env ([`lib/server/auth.ts`](../lib/server/auth.ts)).

**Admin** — a database problem presents as *"I lost my admin access"*, because `isAdminServer()` returns `false` when the `is_admin()` RPC errors. This fails closed, which is correct.

### False-positive check

Run in order.

1. **Is Sentry even reporting?** Check the project's *last-received-event* timestamp, not the issue list. An empty Sentry is equally consistent with a missing DSN. See the warning above.
2. **Separate handled from unhandled.** If the report is "AI is broken" or "I can't clock out", Sentry will be clean *by design* — see blind spot #1. Go to Vercel Runtime Logs and search the route prefix: `[insights]`, `[assistant]`, `[summary]`, `[suggest-task-titles]`, `Auth callback error`.
3. **One user or many?** Filter logs by path and count. A single stale session or ad-blocker is not an incident.
4. **Is it a deploy?** Find a deployment timestamped just before the first bad log line. Cheapest possible rollback decision.
5. **Config or outage?** In this codebase **503 is always a config incident**, never upstream. 502 from `/api/insights` is a genuine Gemini failure.
6. **Is the app serving?** `curl -i https://<prod-domain>/api/summary` with no cookie → expect 401. That proves routing and function boot. **It does not prove Supabase is reachable** — missing Supabase env returns the same 401. There is no endpoint that disambiguates.
7. **Multi-surface reports** (time tracking + auth + admin + cron simultaneously) = Supabase.
8. **Cross-check business signal** — `clock_in`/`clock_out` volume in `/admin/events` vs. the same hour on prior days. A flatline corroborates. **Healthy volume is not an all-clear** (blind spot #4).

---

## 4. Diagnosis

```bash
vercel logs --environment production --level error --since 1h
vercel logs --environment production --query "status:500" -x
vercel logs --environment production -f          # live stream
vercel ls --environment production               # recent deploys
vercel inspect <deployment-url>                  # confirm the commit behind a build
```

For data questions, use the Supabase SQL Editor. The single most valuable query in this
repo is the detector already built into `migrations/015`:

```sql
SELECT count(*) FROM time_entry_repair_candidates;
```

Non-zero = SEV1 integrity incident. See [§5 Option D](#option-d--data-repair).

---

## 5. Remediation

Pick by blast radius.

| Symptom | Option | Time to effect |
|---------|--------|----------------|
| Bad code shipped, broad breakage | **A — Rollback** | ~1 min, no rebuild |
| One of 7 view-linked features broken | **B — Flag kill switch** | User's next page load |
| Dependency / quota / key failure | **C — Dependency** | Varies; key rotation needs a rebuild |
| Wrong data already in Postgres | **D — Reviewed SQL repair** | Manual, gated |
| Daily push failing | **E — Cron** | Next run or manual trigger |

### Option A — Rollback

Replaces `kubectl rollout undo`. Re-aliases the production domain to an earlier build.
Fastest full revert — and for the same reason **it does not rebuild, so it will not pick up
environment-variable changes** (see Option C).

```bash
vercel ls --environment production          # find last known-good
vercel inspect <deployment-url>             # verify the commit
vercel rollback <deployment-url-or-id>      # always pass an explicit target
vercel rollback status growth-companion-sdlc
```

**Dashboard:** Deployments → pick the good build → ⋯ → **Promote to Production** (older UIs: *Instant Rollback*).

**Do not use `git revert && git push` as the SEV1 primary.** [`release-gate.yml`](../.github/workflows/release-gate.yml)
runs typecheck → lint → tests → build → Playwright on every push to `main` with a 20-minute
timeout. That is 5-15 minutes of *continued outage*. Instant-rollback first, then make it
durable in git.

**Then fix `main` — mandatory.** `vercel rollback` does not touch git. `main` still points at
the bad commit, so **the next push redeploys the breakage and silently undoes the rollback.**

```bash
git checkout main && git pull
git checkout -b fix/revert-<incident-id>
git revert <bad-sha>
git push -u origin fix/revert-<incident-id>
gh pr create --base main --title "revert: <incident-id>"
```

Until that merges, treat `main` as frozen.

> 🚫 **Never `git push origin main --force`.** [`RELEASE_STRATEGY.md:150-151`](RELEASE_STRATEGY.md#L150-L151)
> currently documents this as a rollback step. It is wrong and should be deleted from that
> file. Force-pushing `main` under stress turns a bad hour into an unrecoverable repo.

**Migrations do not roll back.** They are applied by hand, forward-only, with no down
scripts ([`MIGRATIONS.md`](MIGRATIONS.md)). A code rollback across a migration boundary is
safe *only* if the old code tolerates the new schema. Check before you click.

### Option B — Feature-flag kill switch

Replaces `kubectl rollout restart`. Ships no code, rebuilds nothing.

**Read this before relying on it — the switch is much narrower than it looks.**

- ✅ **Works for exactly 7 flags**, the ones with a `linkedView`: `TIMESHEET`, `TASKS`, `NOTES`, `GOALS`, `HABITS`, `CALENDAR`, `ADVANCED_ANALYTICS` ([`feature-flags.ts:53-121`](../lib/feature-flags.ts#L53-L121)).
- ❌ **Does nothing for** `AI_ASSISTANT`, `WIDGET`, `PWA`, `PRIORITY_MATRIX`, `TEAM_COLLABORATION`, `EXPORT_FORMATS`. `isFeatureEnabled()` ([`feature-flags.ts:163`](../lib/feature-flags.ts#L163)) has **zero call sites**. The toggle moves, the toast fires, production is unchanged. `<FloatingAssistant />` renders unconditionally at [`app/page.tsx:117`](../app/page.tsx#L117) — **there is no kill switch for the AI assistant.**
- ❌ **Flags gate UI only, never the API.** No route under `app/api/` reads a flag. Disabling `TASKS` hides the view but leaves every task endpoint reachable by direct request. For server-side load, corruption, or an exploitable endpoint, **roll back instead**.

**Steps:** sign in as admin → `/admin/flags` → toggle off. Verify:

```sql
SELECT name, enabled, updated_at, updated_by FROM feature_flags ORDER BY updated_at DESC;
```

**Break-glass if the admin UI is down** (Supabase SQL Editor, service role):

```sql
INSERT INTO feature_flags (name, enabled, updated_at)
VALUES ('HABITS', false, now())
ON CONFLICT (name) DO UPDATE SET enabled = false, updated_at = now();
```

**Propagation:** overrides are fetched **once per page load** ([`lib/slices/ui.ts:34-42`](../lib/slices/ui.ts#L34-L42)) — not polled, no realtime. A user with the tab already open **keeps the broken feature until they reload**. No stale-cache risk (overrides are not persisted to `localStorage`). To stop something *now* for everyone, use Option A.

### Option C — Dependency, quota, key rotation

Replaces `kubectl scale` / HPA. Vercel autoscales; there is no replica count. Capacity
incidents here are always a downstream dependency.

**Gemini** — affects `/api/assistant`, `/api/insights`, `/api/suggest-task-titles`, `/api/summary` together (single provider, no fallback). Cheapest levers first: switch `GEMINI_MODEL` (env-configurable, defaults to `gemini-2.5-flash`); raise quota in Google AI Studio (no deploy, effective next request); rotate the key (needs a rebuild).

**Supabase** — check status page and dashboard for pause/quota/connection exhaustion. Raise the pool size, or terminate a runaway query via `pg_stat_activity` + `pg_terminate_backend(pid)`. **If Supabase is hard-down, no Vercel-side action helps** — the app has no degraded mode and no offline queue. Do not roll back; it will change nothing.

**Key rotation — the rebuild is not optional:**

```bash
vercel env ls
vercel env rm  GEMINI_API_KEY production -y
vercel env add GEMINI_API_KEY production
vercel redeploy <deployment-url-or-id>     # REQUIRED — env vars bake in at build time
```

`vercel rollback` and `vercel promote` do **not** rebuild and will keep using the old value forever. If rotating `SUPABASE_SERVICE_ROLE_KEY`, rotate in Supabase first, then Vercel, then redeploy — and expect `/api/cron/push` to 503 in the window between.

> Project quirk: this repo links via `.vercel/repo.json`, **not** `.vercel/project.json`. Scripts reading the latter will break.

### Option D — Data repair

Rollback fixes code but **never un-writes bad rows**. This is a separate, always-required track.

Follow [`migrations/015_repair_inflated_time_entries.sql`](../migrations/015_repair_inflated_time_entries.sql) exactly. Never hand-run `UPDATE`s against production.

1. Write it as a **numbered migration**, committed and PR-reviewed before it runs anywhere.
2. Header stating background, the exact remediation rule, and a SAFETY block.
3. **Define the affected set once, as a view**, so preview / repair / post-check cannot drift.
4. **STEP 1 — preview, read-only, commented out.** Counts and a row listing. Run alone. Read the output.
5. **STEP 2 — repair in a single transaction**, only after STEP 1 is reviewed. Copy every row you are about to touch into a backup table **first**, with `ON CONFLICT DO NOTHING` so re-runs are safe.
6. **Idempotent** — a second run matches nothing.
7. **Never touch live state.** 015 excludes sessions open under 24h so an in-progress clock-in is never modified. State your equivalent exclusion.
8. **STEP 3 — rollback**, commented out, restoring from the backup table.
9. **Post-check** that must return zero rows.

Execute one step at a time in the Supabase SQL Editor. Take a PITR snapshot before STEP 2.
Record in the log: who ran it, STEP 1 counts, timestamp.

### Option E — Cron (`/api/cron/push`)

One cron: `0 13 * * *` UTC ([`vercel.json`](../vercel.json)).

```bash
vercel logs --environment production --query "/api/cron/push" -x --since 24h
```

| Response | Meaning | Action |
|----------|---------|--------|
| `401` | Bearer mismatch | `CRON_SECRET` rotated without a redeploy → Option C |
| `503` | Missing Supabase/VAPID env | Restore the var, **then redeploy** |
| `{"sent":0}` | **Ambiguous** — nobody due, *or* the Supabase query failed | Verify `push_subscriptions` is non-empty before standing down (blind spot #2) |

Manual re-trigger (idempotent, at most one notification per subscriber):

```bash
curl -sS -H "Authorization: Bearer <CRON_SECRET>" https://<prod-domain>/api/cron/push
```

Read `CRON_SECRET` from Vercel → Settings → Environment Variables. Do **not** use `vercel env pull` — it targets Development and may hand you a different value.

Expired endpoints self-heal: 404/410 responses prune the subscription automatically.

---

## 6. Verification

Replaces dashboard-link checkboxes with things that exist here.

- [ ] The failing user action works end-to-end, performed manually in production
- [ ] Vercel Runtime Logs show no recurrence of the error string for 10 minutes
- [ ] Sentry has no new issues — **and confirm Sentry is actually receiving events** (blind spot #3)
- [ ] `SELECT count(*) FROM time_entry_repair_candidates;` returns 0
- [ ] If a data repair ran: the post-check query returns zero rows, and the backup table exists
- [ ] If a flag was toggled: intended state confirmed in `feature_flags`
- [ ] If rolled back: the revert PR is open or merged, so the next push won't reintroduce it
- [ ] `/admin/events` shows normal `clock_in`/`clock_out` volume
- [ ] `/admin/feedback` refreshed for new reports

---

## 7. Communication

**Inbound — Sentry email alerts are the closest thing to a pager.** Configure the rules in
`MONITORING.md` as **email**; ignore its Slack instructions, which describe an integration
that does not exist.

**Inbound — the feedback inbox** (`/admin/feedback`) is useful for SEV2/SEV3: the `category`
and `page` columns give good triage data. It is **useless for SEV1 and misleadingly so** —
submission is a client-side insert gated on `auth.uid() = user_id`
([`016:28`](../migrations/016_user_feedback.sql#L28)), reachable only by logging in and
navigating to Profile. **The channel fails closed alongside the thing it would report.
An empty inbox during a SEV1 is *no information*, never evidence of health.** It is also
pull-only — nothing notifies you. Refresh it at each decision gate.

**Outbound — there is currently no way to tell users anything.** Verified absent: no
announcements table, no banner/notice component, no server-authored path into the
notification center. Push exists but is not a broadcast channel — it is hardcoded to
task-reminder copy and skips users with no due tasks, so triggering it would send the wrong
message to an arbitrary subset.

Users won't even see a clean error: the service worker is network-first with a cached-shell
fallback, so during an outage returning PWA users get a stale-but-rendering app whose data
calls fail. They read that as "this app is broken", with no explanation available.

**Cheapest fix (one small PR, no new vendor):** add an `INCIDENT_BANNER` flag to
`lib/feature-flags.ts` rendering a fixed generic notice. It inherits the existing admin
toggle UI, the `is_admin()`-gated RPC, and public read — including for signed-out users.
Accept its limits: fixed text, requires Supabase up, applies on next page load. It covers
"app up, feature broken" and "Supabase degraded, Vercel serving". It cannot cover a total
Vercel outage.

**For total outages, accept silence.** A status page is a paid product and a maintenance
obligation for a project with no SLA. Put the effort into time-to-recovery instead.

**Update cadence: none.** The generic 15/30/120-minute status cadence has no audience here;
it converts recovery time into paperwork exactly when recovery time is scarcest. Replaced by
the incident log — append a line when you detect, hypothesize, **change anything in
production**, pass a gate, or observe recovery. The third one pays for the whole practice:
the dominant solo failure is not remembering what you changed, in what order, and which
change actually fixed it.

---

## 8. Post-mortem

**Required** for every SEV1, and any SEV2 that corrupted data or lasted over 2 hours. **Not**
required for SEV3 — requiring one for everything is how a team stops writing them at all.

**Within 72 hours, time-boxed to 45 minutes.** Past that it won't be written and the memory
is gone.

The incident log **is** the timeline — you never transcribe it, you append analysis beneath
it. That is what makes the post-mortem cheap enough to actually get written. After
resolution: branch `incident/YYYY-MM-DD-slug`, commit, PR, merge.

**Structure:** one-sentence impact with numbers · timeline table (from the log) · root cause ·
contributing factors split immediate / underlying / systemic · 5 Whys · what went well · action items.

**Blameless, with one author.** The framing matters *more* when the author caused it, because
self-blame terminates the analysis right before the systemic factors. Concretely: **record
what the system allowed, not what you should have known.** Rewrite every *"I forgot to X"* as
*"nothing required X."* The second sentence has a fix; the first has only a feeling.

**5 Whys stopping rule:** stop when you reach something changeable in this repo or a provider
setting. If a why bottoms out at *"I was tired"*, you are not at the bottom — the next why is
*"what let a tired person do that unchecked?"* That question is where CI gates and schema
constraints come from.

**Storage:** `docs/incidents/YYYY-MM-DD-short-slug.md`. Dated lowercase slugs sort
chronologically and never collide; the `UPPERCASE_SNAKE.md` convention in `docs/` is for
guides you read, not dated records you scan.

**Cut deliberately:** incident commander role, comms lead, severity review board, review
meeting, stakeholder sign-off, executive summary, on-call rotation, status page. All have
zero attendees or zero audience at this scale.

### What makes an action item real

All five must hold, or it is a wish — delete it rather than let it dilute the ones that count.

1. **It has a GitHub issue number**, created before the post-mortem PR merges.
2. **It fits in one PR.** If not, it's a project — write the smallest useful first PR instead.
3. **It states its verification.** Strongest form: *a test that fails against the old code.* [`release-gate.yml`](../.github/workflows/release-gate.yml) runs on every PR and every push to `main`, so a regression test added in the fix PR is enforced forever by machinery that already exists. **This is the highest-value action item type available in this project.**
4. **It closes only** via a merged PR referencing `Closes #N`, or an explicit "accepted risk — not doing" with a reason. Never silently.
5. **It has a 30-day kill date.** Then do it or close it as accepted risk.

**Volume limits matter more than the quality bar:** max 3 items per incident (9 items
reliably produces 0 completed; 3 produces two or three) · **exactly one must improve
*detection*, not the fix** · at most one may be documentation.

```bash
gh label create incident-followup      # once
gh issue list --label incident-followup --state open
```

The action table holds issue number, one-line description, kill date — **and no status
column.** Issue state is the truth; a hand-maintained status column goes stale within a week
and then lies to you.

---

## Known blind spots

Not a to-do list — these are the assumptions this runbook explicitly does **not** make.

1. **Handled errors never reach Sentry.** `Sentry.captureException` appears exactly once in the entire codebase — [`app/global-error.tsx:16`](../app/global-error.tsx#L16), a client-side boundary. **Zero API routes report to Sentry.** Every AI failure, Supabase write failure, and auth-callback failure is a `console.error` visible only in Vercel Runtime Logs. There is no error rate, no trend, no grouping, no deduplication for this app's actual failure modes. A total Gemini outage produces **zero Sentry issues**.

2. ~~**Cron failure is undetectable in the common case.**~~ **Fixed 2026-08-14.** The push route previously discarded Supabase query errors, so a failed read returned `{sent: 0}` with HTTP 200 — a fully broken run showing green. It now surfaces query errors as 500, counts failures, tracks 404/410 pruning separately, and returns `{sent, failed, pruned, subscriptions}` so a zero can be interpreted without a separate SQL query. **Still absent: a dead-man's-switch.** A cron that never fires at all produces no signal, because silence is also what success looks like.

3. **Sentry disables itself silently with no DSN.** `enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN` in all three configs. No warning, build succeeds, app runs normally. **A quiet Sentry would be indistinguishable from a healthy one.** This is a live *risk*, not a live *fault* — Sentry was verified working on 2026-08-13. Check the project's last-received-event timestamp, never the emptiness of the issue list. Note also that `SENTRY_AUTH_TOKEN` is not set, so no release is created and **source maps are never uploaded** — stack traces arrive minified.

4. **Analytics failures are invisible in production.** `trackEvent` logs insert failures only in development and swallows all throws ([`lib/analytics.ts`](../lib/analytics.ts)). The event stream can silently stop — which makes the §3 business-signal cross-check unreliable in the one direction that matters.

5. **10% trace sampling.** For a low-traffic app, a latency regression on a rarely-hit route may produce **zero** sampled transactions. Sentry performance data cannot rule out a slowdown; use Vercel Speed Insights.

6. **No log retention or drain.** Vercel log retention is plan-limited, and Vercel logs are the *only* home for handled errors (#1). **Post-incident forensics beyond the retention window are impossible.**

7. **Rate-limit hits are invisible server-side.** [`rate-limit.ts`](../lib/server/rate-limit.ts) logs nothing, and the limiter is per-warm-instance, so the effective global limit is nondeterministic.

8. **Single region, no comparative signal.** `iad1` only — nothing distinguishes "our app is broken" from "us-east-1 is having a day."

9. **No SLOs.** The targets in `MONITORING.md` have no measurement pipeline, no threshold, and no owner. Do not cite them during an incident.

10. **Supabase is three failure domains in one vendor** — database, auth, *and* the entire authorization layer via RLS. No documented backup/PITR policy exists in this repo.

11. **A permanently red CI gate detects nothing.** The release gate failed on `main` from 2026-07-29 to 2026-08-14 on a single impossible E2E assertion. Every push in that window ran a gate that could not fail any louder than it already was, so a real regression would have been indistinguishable from the standing failure. Treat a red gate as an incident in its own right, not as background noise.

---

## Open follow-ups

Found while writing this runbook, verified, not fixed. Each needs its own issue.

| # | Finding | Sev |
|---|---------|-----|
| 1 | ✅ **RESOLVED 2026-08-14.** `CRON_SECRET` failed open — `if (secret && ...)` meant an unset variable skipped authentication entirely, letting an anonymous GET reach the service-role handler with RLS bypassed. Now returns 401 when the secret is absent, with a regression test verified failing against the old code. | — |
| 2 | ✅ **RESOLVED 2026-08-13.** `analytics_events` accepted forged attribution — [`009:29-31`](../migrations/009_add_analytics_events.sql#L29-L31) was `WITH CHECK (true)` with a caller-supplied `user_id`. Closed by [migration 018](../migrations/018_analytics_events_attribution.sql) and verified by live probe: anonymous insert with a foreign `user_id` now rejects with `42501`, while `user_id IS NULL` telemetry still returns 201. | — |
| 3 | ✅ **RESOLVED 2026-08-14.** `/api/summary` measured open entries with bare `Date.now()` (the bug `dc50cc2` fixed elsewhere) and authenticated with `getSession()` rather than `getUser()`. Now uses `resolveEntryEnd` and the shared `getAuthenticatedUser()`. Kept rather than deleted — it is documented API surface and this runbook's liveness probe. | — |
| 4 | ✅ **RESOLVED 2026-08-14.** `time_entries` had no CHECK constraints. [Migration 019](../migrations/019_time_entry_validity_constraints.sql) adds three, bounding **worked** time (elapsed minus breaks) rather than elapsed — production holds legitimate sessions spanning 29.8h with a ~19.8h unended break. Verified in production: an invalid write now raises `23514`. The unique index on `(user_id, date)` came from [migration 017](../migrations/017_one_time_entry_per_day.sql). | — |
| 5 | ✅ **RESOLVED 2026-08-14.** The force-push rollback is gone from `RELEASE_STRATEGY.md`, replaced with Vercel instant-rollback plus a revert PR, and the danger is called out explicitly so it is not reintroduced. | — |
| 6 | ✅ **RESOLVED 2026-08-14.** `MONITORING.md` now reads `NEXT_PUBLIC_SENTRY_DSN`, carries a banner marking the file aspirational, and matches production's 0.1 trace rate. | — |
| 7 | ✅ **RESOLVED 2026-08-14.** [`/api/cron/data-check`](../app/api/cron/data-check/route.ts) runs 015's repair view daily at 13:30 UTC and reports findings two ways: a Sentry issue (`error` level when an abandoned open session is present, `warning` when candidates are merely over the configured cap) and a non-200 so the Vercel cron log turns red. Silence means clean. | — |
| 8 | ✅ **RESOLVED 2026-08-14.** `/admin` threw on token refresh (Sentry `COMPANION-8/9`) because Supabase writes refreshed cookies from a Server Component render, which Next.js forbids. Wrapped per the documented Supabase pattern. | — |
| 9 | **Add `SENTRY_AUTH_TOKEN`** to Vercel. Confirmed absent in the build log; without it no release is created and **source maps are never uploaded**, so every stack trace arrives minified. | — |
