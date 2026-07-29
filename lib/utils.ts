import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Habit, HabitLog } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseLocalDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Capitalize the first letter of each whitespace-separated word. */
export function capitalizeName(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Resolve a display name from a Supabase user: prefer the stored full name,
 * otherwise derive it from the email prefix, capitalized. Falls back to "User".
 */
export function deriveDisplayName(fullName?: string | null, email?: string | null): string {
  const source = fullName?.trim() || email?.split('@')[0] || 'User'
  return capitalizeName(source)
}

export interface HabitDayProgress {
  habit: Habit
  count: number
  target: number
  isCompleted: boolean
}

/**
 * Per-habit progress for a single day. A habit is only complete once the logged
 * count reaches its target — the mere existence of a log is not completion, since
 * a habit with targetCount 3 can be logged once and still be unfinished.
 */
export function summarizeHabitProgress(
  habits: Habit[],
  habitLogs: HabitLog[],
  dateKey: string,
): HabitDayProgress[] {
  const counts = new Map<string, number>()
  for (const log of habitLogs) {
    if (log.date !== dateKey) continue
    counts.set(log.habitId, (counts.get(log.habitId) || 0) + (log.count || 0))
  }
  return habits.map((habit) => {
    const target = Math.max(1, habit.targetCount || 1)
    const count = counts.get(habit.id) || 0
    return { habit, count, target, isCompleted: count >= target }
  })
}
