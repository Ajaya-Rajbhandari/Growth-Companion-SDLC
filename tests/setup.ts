import { vi } from "vitest"

// Mock localStorage for Zustand persist middleware (used by useAppStore)
const storage: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storage[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete storage[key]
  }),
  clear: vi.fn(() => {
    Object.keys(storage).forEach((k) => delete storage[k])
  }),
  get length() {
    return Object.keys(storage).length
  },
  key: vi.fn((i: number) => Object.keys(storage)[i] ?? null),
}
vi.stubGlobal("localStorage", localStorageMock)
if (typeof globalThis.window === "undefined") {
  vi.stubGlobal("window", { localStorage: localStorageMock })
}

// Mock Supabase
export const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null,
        })),
        data: [],
        error: null,
      })),
      data: [],
      error: null,
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({
          data: null,
          error: null,
        })),
        data: [],
        error: null,
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: null,
            error: null,
          })),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: null,
        error: null,
      })),
    })),
  })),
  auth: {
    getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
  },
}

// Mock crypto.randomUUID - use spy instead of replacing entire crypto object
if (typeof global.crypto !== "undefined" && global.crypto.randomUUID) {
  vi.spyOn(global.crypto, "randomUUID").mockImplementation(
    () => "test-uuid-" + Math.random().toString(36).substring(7),
  )
} else {
  // If crypto doesn't exist, create it
  Object.defineProperty(global, "crypto", {
    value: {
      randomUUID: vi.fn(() => "test-uuid-" + Math.random().toString(36).substring(7)),
    },
    writable: true,
    configurable: true,
  })
}

// Mock Date
export const mockDate = (dateString: string) => {
  const date = new Date(dateString)
  vi.spyOn(global, "Date").mockImplementation(() => date as any)
  return date
}

// Reset mocks helper
export const resetMocks = () => {
  vi.clearAllMocks()
}
