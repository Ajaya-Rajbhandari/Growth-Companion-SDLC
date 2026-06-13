# Release & Feature Management Strategy

## Overview

Growth Companion uses a **feature flag system** with **semantic versioning** for managing feature releases and gradual rollouts.

## Feature Flag System

### How It Works

Features are controlled via `lib/feature-flags.ts`:

```typescript
TIMESHEET: {
  enabled: true,           // Feature is available
  beta: false,             // Not in beta
  rolloutPercentage: 100,  // 100% of users see it
  description: "...",
  linkedView: "timesheet"  // Connected to UI view
}
```

### Rollout Percentages

- **100%**: Feature is live for all users
- **50%**: Feature rolls out to 50% of users (based on user ID hash)
- **10%**: Limited beta testing (internal/early access)
- **0%**: Feature is disabled (under development)

### Current Feature Status

| Feature | Enabled | Rollout | Status |
|---------|---------|---------|--------|
| Timesheet | ✅ | 100% | Live |
| Notes | ✅ | 100% | Live |
| Calendar | ✅ | 100% | Live |
| AI Assistant | ✅ | 100% | Live |
| Widget | ✅ | 100% | Live |
| PWA | ✅ | 100% | Live |
| **Tasks** | ❌ | 0% | **Locked** |
| **Goals** | ❌ | 0% | **Locked** |
| **Habits** | ❌ | 0% | **Locked** |
| Priority Matrix | ✅ | 50% | Beta |
| Advanced Analytics | ❌ | 0% | Beta (planned) |

## Enabling/Disabling Features

### To Enable a Feature

Edit `lib/feature-flags.ts`:

```typescript
TASKS: {
  enabled: true,           // Change from false
  rolloutPercentage: 100,
  linkedView: "tasks"
}
```

Then:
1. Run tests: `npm test`
2. Verify build: `npm run build`
3. Commit: `git commit -am "feat: enable tasks feature"`
4. Push: `git push origin main`

### To Gradually Rollout a Feature

1. **Phase 1 (Internal Testing)**: Set `rolloutPercentage: 10`
   - Test with internal team only
   - Monitor error logs
   
2. **Phase 2 (Early Access)**: Set `rolloutPercentage: 50`
   - Gather user feedback
   - Check performance metrics
   
3. **Phase 3 (Public)**: Set `rolloutPercentage: 100`
   - Full rollout to all users
   - Ongoing monitoring

## Semantic Versioning

Version format: `MAJOR.MINOR.PATCH`

```
v1.0.0 → v1.1.0 → v1.1.1 → v2.0.0
   ↓        ↓        ↓        ↓
Initial   New    Bug fix   Breaking
Release   Feature            Changes
```

### Release Process

1. **Update** `CHANGELOG.md` with new features
2. **Tag** release: `git tag -a v1.1.0 -m "Release 1.1.0"`
3. **Push** tags: `git push origin --tags`
4. **Deploy** to production (Vercel auto-deploys main)
5. **Monitor** error logs for 24 hours

### Version Numbers

- `v1.0.1` = Bug fix (no new features)
- `v1.1.0` = New feature added
- `v2.0.0` = Breaking change (migration required)

## Deployment Environments

### Development
- Local machine
- `npm run dev`
- Test new features before commit

### Staging (Preview)
- Vercel Preview Deployment
- Auto-deployed on PR
- Test before merging to main

### Production
- Vercel Production Deployment
- Auto-deployed from main branch
- Manual approval before pushing to main

## Monitoring & Rollback

### Monitor Production

1. **Error Tracking** (Sentry)
   - Real-time error alerts
   - User impact tracking

2. **Performance** (Vercel Analytics)
   - Build times
   - Runtime performance
   - API response times

3. **Database Health** (Supabase)
   - Query performance
   - Connection limits
   - Migration status

### Rollback Procedure

If critical issues found:

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or revert to specific version
git checkout v1.0.0
git push origin main --force
```

## Feature Roadmap

### v1.0 - MVP (Live ✅)
- [x] Timesheet management
- [x] Note taking
- [x] Calendar view
- [x] AI assistant
- [x] PWA support

### v1.1 - Task Management (Q3 2026)
- [ ] Enable Tasks feature
- [ ] Enable Goals feature
- [ ] Enable Habits feature
- [ ] Integration with timesheet

### v1.2 - Analytics (Q4 2026)
- [ ] Advanced reporting dashboard
- [ ] Custom time reports
- [ ] Goal progress analytics
- [ ] Productivity insights

### v2.0 - Team Collaboration (2027)
- [ ] Team workspaces
- [ ] Shared goals
- [ ] Activity feed
- [ ] SSO/SAML authentication

## Toggling Features for Testing

### Enable All Features Locally

Edit `lib/feature-flags.ts`:

```typescript
export const FEATURE_FLAGS: Record<FeatureName, FeatureFlag> = {
  TASKS: { enabled: true, ... },      // Change to true
  GOALS: { enabled: true, ... },      // Change to true
  HABITS: { enabled: true, ... },     // Change to true
  ...
}
```

Then update `NAV_VIEW_IDS` to include all views:

```typescript
export const NAV_VIEW_IDS: ViewId[] = [
  "dashboard",
  "tasks",      // Add these
  "notes",
  "timesheet",
  "calendar",
  "goals",      // Add these
  "habits",     // Add these
  "profile"
]
```

### Check Feature Status in Code

```typescript
import { isFeatureEnabled } from "@/lib/feature-flags"

if (isFeatureEnabled("TASKS", userId)) {
  // Show tasks feature
}
```

## FAQ

**Q: How do I enable Tasks for testing?**
A: Edit `lib/feature-flags.ts`, set `TASKS: { enabled: true }`, then restart dev server.

**Q: Can users access locked features?**
A: No. Locked views don't appear in navigation and are protected by `isViewEnabled()` checks.

**Q: How long does rollout take?**
A: Depends on % and monitoring. Typical: 10% → 50% → 100% over 2-4 weeks.

**Q: What if a feature has bugs at 50% rollout?**
A: Revert percentage to 10% and fix issues before proceeding.

**Q: How do I create a new feature flag?**
A: Add entry to `FEATURE_FLAGS` object in `lib/feature-flags.ts`.
