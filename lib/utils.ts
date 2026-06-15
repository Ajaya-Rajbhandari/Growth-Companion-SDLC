import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

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
