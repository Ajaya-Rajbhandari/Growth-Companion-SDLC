# Feature Audit

This document summarizes feature components in `components/` and how they are used.

## Core Views
- `components/dashboard-view.tsx` - Productivity overview with stats, insights, and weekly summaries.
- `components/tasks-view.tsx` - Task CRUD, priority filtering, and completion tracking.
- `components/notes-view.tsx` - Notes CRUD with categories, tags, search, and formatting.
- `components/timesheet-view.tsx` - Clock in/out, breaks, exports, and time entry history.
- `components/profile-view.tsx` - Account details, edit profile name, and sign-out.

## Navigation and Layout
- `components/sidebar.tsx` - Primary desktop navigation.
- `components/mobile-header.tsx` - Mobile navigation header and actions.
- `components/chat-history-sidebar.tsx` - Chat session listing for the assistant.

## Assistant and Onboarding
- `components/floating-assistant.tsx` - AI chat bubble with tool actions (tasks, notes, timesheet).
- `components/onboarding-modal.tsx` - Guided onboarding walkthrough.
- `components/break-mode-panel.tsx` - Active break UI and countdown display.

## Providers
- `components/auth-provider.tsx` - Supabase auth session tracking and initial data load.
- `components/theme-provider.tsx` - Theme integration and client-side theme state.

## UI Primitives
Reusable primitives live under `components/ui/`. These are composed by the feature components for layout, controls, and feedback patterns.

