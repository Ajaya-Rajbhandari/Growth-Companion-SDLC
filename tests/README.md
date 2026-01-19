# Test Suite Documentation

This directory contains comprehensive automated tests for the Growth Companion SDLC application.

## Test Structure

```
tests/
├── setup.ts                    # Test setup and mocks
├── store/
│   ├── tasks.test.ts          # Task management tests
│   ├── notes.test.ts           # Notes management tests
│   └── timesheet.test.ts       # Timesheet functionality tests
├── integration/
│   └── timesheet-workflow.test.ts  # End-to-end workflow tests
└── edge-cases/
    └── what-if.test.ts         # Edge cases and "what if" scenarios
```

## Running Tests

### Run all tests
```bash
pnpm test
```

### Run tests in watch mode
```bash
pnpm test:watch
```

### Run specific test file
```bash
pnpm test tests/store/tasks.test.ts
```

### Run tests with coverage
```bash
pnpm test --coverage
```

## Test Categories

### 1. Unit Tests (store/)
- **tasks.test.ts**: Tests for task CRUD operations, validation, edge cases
- **notes.test.ts**: Tests for note CRUD operations, search, filtering
- **timesheet.test.ts**: Tests for clock in/out, breaks, task switching

### 2. Integration Tests (integration/)
- **timesheet-workflow.test.ts**: Complete workflows testing multiple features together

### 3. Edge Case Tests (edge-cases/)
- **what-if.test.ts**: "What if" scenarios covering:
  - Double clock in
  - Clock out when not clocked in
  - Break during break
  - Rapid task switches
  - Network failures
  - Empty states
  - Invalid data
  - Edge case durations

## Test Coverage

### Features Covered:
- ✅ Task Management (CRUD, filtering, validation)
- ✅ Notes Management (CRUD, search, categories)
- ✅ Timesheet (clock in/out, breaks, task switching)
- ✅ Break Management (types, titles, durations)
- ✅ Error Handling
- ✅ Edge Cases
- ✅ Integration Workflows

### Scenarios Tested:
- ✅ Normal operations
- ✅ Error conditions
- ✅ Edge cases
- ✅ Network failures
- ✅ Invalid input
- ✅ Empty states
- ✅ Concurrent operations
- ✅ Data persistence

## Mocking

Tests use mocked Supabase client to avoid requiring actual database connection. All database operations are mocked in `tests/setup.ts`.

## Adding New Tests

1. Create test file in appropriate directory
2. Import necessary utilities from `tests/setup.ts`
3. Mock Supabase using the pattern shown in existing tests
4. Write test cases covering:
   - Happy path
   - Error cases
   - Edge cases
   - "What if" scenarios

## Example Test

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest"
import { useAppStore } from "@/lib/store"

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  },
}))

describe("Feature Tests", () => {
  beforeEach(() => {
    // Reset state
  })

  it("should handle normal case", async () => {
    // Test implementation
  })

  it("should handle error case", async () => {
    // Test error handling
  })
})
```
