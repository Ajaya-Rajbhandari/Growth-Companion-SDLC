# Production Monitoring Guide

This guide covers setting up comprehensive monitoring for Growth Companion in production.

## 1. Error Tracking (Sentry)

### Setup

```bash
npm install @sentry/nextjs
```

### Configure Sentry

Create `sentry.client.config.ts`:

```typescript
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})
```

Create `sentry.server.config.ts`:

```typescript
import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  serverName: process.env.VERCEL_URL || "localhost",
})
```

Update `next.config.mjs`:

```typescript
import { withSentryConfig } from "@sentry/nextjs"

const config = {
  // ... your config
}

export default withSentryConfig(config, {
  org: "your-org",
  project: "growth-companion",
  authToken: process.env.SENTRY_AUTH_TOKEN,
})
```

### Environment Variables

Add to Vercel:
```
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx
```

### Monitor

1. Go to [sentry.io](https://sentry.io)
2. Create project → Select "Next.js"
3. Copy DSN to environment variables
4. Errors automatically reported

---

## 2. Performance Monitoring (Vercel Analytics)

### Built-in (No Setup Required)

Vercel automatically tracks:
- Page load times
- Core Web Vitals (LCP, FID, CLS)
- Request durations
- Function cold starts

### View Analytics

1. Go to Vercel Dashboard → Your Project
2. Click "Analytics" tab
3. Monitor:
   - **Page Response Time** — Should be < 200ms
   - **Function Duration** — Should be < 1s
   - **Largest Contentful Paint (LCP)** — Should be < 2.5s
   - **Cumulative Layout Shift (CLS)** — Should be < 0.1

### Custom Web Vitals

Add to your app for detailed tracking:

```typescript
// lib/analytics.ts
export function reportWebVitals(metric: NextWebVitalsMetric) {
  const { name, value, label } = metric
  
  // Send to analytics
  if (window.gtag) {
    window.gtag.event(name, {
      value: Math.round(value),
      event_category:
        label === "web-vital" ? "Web Vitals" : "Next.js custom metric",
      event_label: metric.id,
      non_interaction: true,
    })
  }
}
```

---

## 3. Database Monitoring (Supabase)

### Check Database Health

1. Go to Supabase Dashboard → Your Project
2. Click "Database" → "Diagnostics"
3. Monitor:
   - **Query Performance** — Slow queries highlighted
   - **Connection Count** — Should be < 20
   - **Replication Lag** — Should be < 1s
   - **Disk Space** — Alert if > 90%

### View Query Logs

```sql
-- Check slow queries (> 100ms)
SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Setup Backups

1. Go to Supabase → Settings → Backups
2. Enable "Automatic Backups"
3. Retention: 30 days (recommended)
4. Test restore procedure monthly

### Monitor Row Count

```sql
-- Get table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 4. API Monitoring

### Rate Limit Tracking

The app already enforces 20 req/min per user. Monitor:

```typescript
// lib/server/rate-limit.ts
// Log when limits hit
if (!rate.allowed) {
  console.warn(`[Rate Limit] User ${userId} hit limit`)
}
```

### API Endpoint Status

Monitor each endpoint:
- `/api/assistant` — AI suggestions (should be < 3s)
- `/api/suggest-task-titles` — Task suggestions (should be < 2s)
- `/api/summary` — Dashboard data (should be < 1s)
- `/api/seed-test-data` — Dev only (should be < 5s)

### Track Failed Requests

```typescript
// In API routes
try {
  // ...
} catch (error) {
  console.error(`[API Error] ${req.url}:`, error)
  Sentry.captureException(error)
}
```

---

## 5. Uptime Monitoring (Recommended: Upstatus/Better Stack)

### Setup (Using Better Stack)

1. Go to [betterstack.com](https://betterstack.com)
2. Create account → Add Monitor
3. Set URL: `https://your-domain.com`
4. Check interval: 5 minutes
5. Alert method: Email

### Monitor These Endpoints

```
https://your-domain.com/                    (main page)
https://your-domain.com/auth                (auth flow)
https://your-domain.com/api/summary         (API health)
https://your-domain.com/widget              (widget)
```

### Alert Thresholds

- Downtime > 1 minute → Alert
- Response time > 5s → Alert
- SSL certificate expires < 7 days → Alert

---

## 6. User Analytics (Google Analytics or Mixpanel)

### Setup Google Analytics

```typescript
// lib/analytics.ts
import { GoogleAnalytics } from '@next/third-parties/google'

export function Analytics() {
  return <GoogleAnalytics gaId="G-XXXXXXX" />
}
```

Add to `app/layout.tsx`:

```typescript
import { Analytics } from "@/lib/analytics"

export default function RootLayout() {
  return (
    <html>
      <head>
        <Analytics />
      </head>
      <body>{/* ... */}</body>
    </html>
  )
}
```

### Track Key Events

```typescript
// When user clocks in
gtag.event('clock_in', {
  category: 'timesheet',
  label: 'user_action',
})

// When user enables feature
gtag.event('feature_enabled', {
  category: 'feature',
  feature_name: 'tasks',
})
```

### View Analytics

1. Go to Google Analytics → Your Property
2. Monitor:
   - Daily Active Users
   - Session duration
   - Feature adoption
   - Pages per session
   - Bounce rate

---

## 7. Daily Monitoring Checklist

### Each Morning (5 min)

```
☐ Check Sentry dashboard
  • Any new errors?
  • Error rate normal?
  • Critical issues?

☐ Check Vercel Analytics
  • Page response time < 200ms?
  • Any 500 errors?
  • CDN cache hit rate?

☐ Check Supabase
  • Database online?
  • No connection issues?
  • Query performance normal?

☐ Check Google Analytics
  • Users active?
  • Normal traffic patterns?
  • Any unusual activity?
```

### Weekly Review (15 min)

```
☐ Review error trends
  • Most common errors?
  • New error patterns?
  • Need to fix anything?

☐ Check performance trends
  • Page speed trending up/down?
  • Core Web Vitals stable?
  • Function durations normal?

☐ Database size check
  • Disk usage < 80%?
  • Query logs clean?
  • Backups running?

☐ User trends
  • User growth rate?
  • Feature adoption rates?
  • Churn indicators?
```

### Monthly Audit (1 hour)

```
☐ Security audit
  • SSL certificate valid?
  • No data leaks reported?
  • Rate limiting working?
  • Auth working properly?

☐ Cost review
  • Vercel costs normal?
  • Supabase usage expected?
  • Sentry quota sufficient?

☐ Dependency updates
  • npm audit clean?
  • Any critical updates?
  • Test after updates?

☐ Backup verification
  • Supabase backup completed?
  • Can restore from backup?
```

---

## 8. Critical Alerts to Set Up

### Sentry Alerts

1. Go to Sentry → Alerts → Create Alert Rule
2. Create alerts for:
   - **Error Rate > 1%** → Email + Slack
   - **New Error Type** → Email
   - **Regex: "TypeError"** → Critical (Slack)
   - **Regex: "database"** → Critical (Slack)

### Vercel Alerts

1. Go to Vercel → Project → Settings → Monitoring
2. Set alerts for:
   - **Response time > 1s** → Alert
   - **Function duration > 5s** → Alert
   - **Error rate > 0.1%** → Alert

### Supabase Alerts

1. Go to Supabase → Settings → Integrations
2. Add Slack integration
3. Set alerts for:
   - Disk usage > 80%
   - Connection count > 20
   - Replication lag > 5s

---

## 9. Dashboard Setup (Optional)

### Create Monitoring Dashboard

Use [Datadog](https://datadog.com) or [New Relic](https://newrelic.com) to centralize all monitoring:

```
+------------------+------------------+------------------+
| Uptime Status    | Error Rate       | Response Time    |
| 99.9% ✅         | 0.02% ✅         | 145ms ✅         |
+------------------+------------------+------------------+
| Active Users     | Page Load Time   | DB Health        |
| 42 today         | 2.1s ✅          | 95% available ✅ |
+------------------+------------------+------------------+
```

---

## 10. What to Do When Issues Occur

### High Error Rate

1. Check Sentry for error type
2. Look at error logs
3. Check user reports
4. Fix in code
5. Deploy with `git push origin main`
6. Monitor in Sentry for next 1 hour

### Slow Response Times

1. Check Vercel Analytics
2. Identify slow endpoint
3. Check database query times
4. Optimize query or code
5. Deploy and test
6. Monitor metrics for improvement

### Database Issues

1. Check Supabase dashboard
2. Look at query logs
3. Check connection count
4. Identify slow queries
5. Add index if needed
6. Monitor connection recovery

### Downtime

1. Check if DNS resolves
2. Check Vercel deployment status
3. Check database connectivity
4. Check error logs
5. Rollback if recent deploy caused it
6. Notify users if > 5 min downtime

---

## Summary

| Tool | Purpose | Cost | Priority |
|------|---------|------|----------|
| **Sentry** | Error tracking | Free tier sufficient | Critical |
| **Vercel Analytics** | Performance | Built-in, free | Critical |
| **Supabase Monitoring** | Database health | Built-in, free | Critical |
| **Google Analytics** | User tracking | Free | High |
| **Better Stack** | Uptime monitoring | $10/month | High |
| **Datadog** | Centralized dashboard | $15/month+ | Medium |

**Start with:** Sentry + Vercel Analytics + Supabase monitoring (all free)
