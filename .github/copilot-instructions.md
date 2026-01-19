# Copilot Instructions for AI Coding Agents

## Project Overview
- **Framework:** Next.js (TypeScript, App Router)
- **UI:** Modular React components in `components/` (with `ui/` subfolder for reusable primitives)
- **State/Backend:** Uses Supabase (`lib/supabase.ts`) and a custom store (`lib/store.ts`)
- **Styling:** CSS modules and global styles in `styles/` and `app/globals.css`

## Key Architectural Patterns
- **App Directory Routing:** All routes are in `app/` using Next.js App Router conventions. API routes are in `app/api/`.
- **Component Structure:**
  - `components/` contains feature and layout components (e.g., `dashboard-view.tsx`, `sidebar.tsx`).
  - `components/ui/` contains atomic UI primitives (e.g., `button.tsx`, `input.tsx`).
- **Hooks:** Custom React hooks are in `hooks/` (e.g., `use-toast.ts`, `use-mobile.ts`).
- **Lib:** Shared utilities and integrations (e.g., Supabase client, state store) are in `lib/`.

## Developer Workflows
- **Install dependencies:** `pnpm install`
- **Run dev server:** `pnpm dev`
- **Build for production:** `pnpm build`
- **Start production server:** `pnpm start`
- **No explicit test scripts found** (add if/when tests are introduced)

## Project-Specific Conventions
- **UI Pattern:** Prefer composition of primitives from `components/ui/` for new UI elements.
- **State Management:** Use `lib/store.ts` for global state; avoid prop drilling for cross-component state.
- **API Integration:** Use Supabase via `lib/supabase.ts` for backend data access.
- **Styling:** Use `globals.css` for global styles, otherwise prefer co-located CSS or Tailwind (if present).
- **Auth:** Authentication handled in `app/auth/` and `components/auth-provider.tsx`.

## Integration Points
- **Supabase:** All backend data and auth via `lib/supabase.ts`.
- **API routes:** Extend via `app/api/assistant/route.ts` and similar files.

## Examples
- To add a new dashboard feature, create a component in `components/`, use hooks from `hooks/`, and connect to state/store via `lib/store.ts`.
- For new UI controls, add to `components/ui/` and compose in feature components.

## References
- **Routing:** See `app/` for route structure.
- **State:** See `lib/store.ts` for state patterns.
- **Backend:** See `lib/supabase.ts` for data access.
- **UI:** See `components/ui/` for reusable primitives.

---

_If any conventions or workflows are unclear, please request clarification or examples from the maintainers._
