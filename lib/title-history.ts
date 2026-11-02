import type { TimeEntry } from "./types"

// Task titles the user has already typed, so the clock-in and switch-task fields
// can offer them back instead of making the user type them again.
//
// Derived entirely from `timeEntries`, which is loaded at login: no table, no
// write, and it keeps working when Gemini is down. A day is one entry whose
// `title` is only the *last* task of that day; every task switched away from is
// in `subtasks[]`, so both are read — the subtasks are most of what was typed.

export interface TitleSuggestion {
  title: string
  count: number
  lastUsed: string
  /** Category of the session this title opened, if any. */
  category?: string
}

const DAY_MS = 86_400_000

/** Lowercase, punctuation-insensitive key, so "Code review" and "code review." merge. */
export function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
}

export function buildTitleHistory(entries: TimeEntry[], now: Date = new Date()): TitleSuggestion[] {
  const byKey = new Map<string, TitleSuggestion>()

  const add = (raw: string | undefined, at: string, category?: string) => {
    const title = raw?.trim()
    if (!title) return
    const key = normalizeTitle(title)
    if (!key) return
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, { title, count: 1, lastUsed: at, category })
      return
    }
    existing.count += 1
    // Compare as instants: subtask times are `toISOString()` ("…Z") while
    // Postgres returns `clock_in` as "+00:00", so string order is unreliable.
    if (Date.parse(at) >= Date.parse(existing.lastUsed)) {
      // Show the spelling the user typed most recently.
      existing.title = title
      existing.lastUsed = at
      if (category) existing.category = category
    } else if (!existing.category && category) {
      existing.category = category
    }
  }

  for (const entry of entries) {
    const subtasks = entry.subtasks ?? []
    // The session's category was chosen at clock-in, for the session's first task.
    // Later switches don't pick their own, so only that first title earns it.
    subtasks.forEach((sub, i) => add(sub.title, sub.clockIn, i === 0 ? entry.category : undefined))
    const lastStart = subtasks.length > 0 ? subtasks[subtasks.length - 1].clockOut : undefined
    add(entry.title, lastStart || entry.clockIn, subtasks.length === 0 ? entry.category : undefined)
  }

  // Frequency decayed by recency: a title used often last month still ranks, but
  // this week's work outranks it. Ties go to the more recent title.
  const score = (s: TitleSuggestion) => {
    const ageWeeks = Math.max(0, now.getTime() - Date.parse(s.lastUsed)) / DAY_MS / 7
    return s.count / (1 + ageWeeks)
  }
  return [...byKey.values()].sort(
    (a, b) => score(b) - score(a) || Date.parse(b.lastUsed) - Date.parse(a.lastUsed),
  )
}

/**
 * Ranked history filtered by what is typed. Titles starting with the query come
 * first, then titles with a word starting with it, then any other contains-match.
 * A title equal to the query is dropped — it's already in the field.
 */
export function matchTitleHistory(
  history: TitleSuggestion[],
  query: string,
  { limit = 6, exclude = [] }: { limit?: number; exclude?: (string | undefined)[] } = {},
): TitleSuggestion[] {
  const q = normalizeTitle(query)
  const skip = new Set(exclude.filter((t): t is string => !!t).map(normalizeTitle))
  if (q) skip.add(q)

  const candidates = history.filter((s) => !skip.has(normalizeTitle(s.title)))
  if (!q) return candidates.slice(0, limit)

  const starts: TitleSuggestion[] = []
  const wordStarts: TitleSuggestion[] = []
  const contains: TitleSuggestion[] = []
  for (const s of candidates) {
    const key = normalizeTitle(s.title)
    if (key.startsWith(q)) starts.push(s)
    else if (key.includes(` ${q}`)) wordStarts.push(s)
    else if (key.includes(q)) contains.push(s)
  }
  return [...starts, ...wordStarts, ...contains].slice(0, limit)
}
