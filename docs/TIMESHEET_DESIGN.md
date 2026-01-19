# Timesheet Design Specification

## Overview
A proper timesheet should track work sessions with the ability to switch between tasks within a single session, maintaining a complete audit trail.

## Data Structure

### Time Entry (Main Session)
```typescript
{
  id: UUID
  date: "2026-01-19"
  clockIn: "2026-01-19T08:35:00Z"
  clockOut: "2026-01-19T17:00:00Z" | null (if in progress)
  title: "Current task name" // The most recent task
  breakMinutes: 30
  breaks: BreakPeriod[]
  notes: "Optional notes"
  subtasks: Subtask[] // All tasks worked on during this session
  user_id: UUID
}
```

### Subtask (Task Switch)
```typescript
{
  id: UUID
  title: "Task name"
  clockIn: "2026-01-19T08:35:00Z" // When this task started
  clockOut: "2026-01-19T10:08:00Z" // When switched away from this task
}
```

## Workflow

### Scenario 1: Simple Session (No Task Switches)
1. User clocks in at 8:35 AM with "Working on AI agent stack"
2. User clocks out at 10:08 AM
3. **Result**: Single entry with:
   - title: "Working on AI agent stack"
   - clockIn: 8:35 AM
   - clockOut: 10:08 AM
   - subtasks: [] (empty)

### Scenario 2: Task Switch During Session
1. User clocks in at 8:35 AM with "Working on AI agent stack"
2. At 10:08 AM, user switches to "Debugging frontend"
3. User clocks out at 5:00 PM
4. **Result**: Single entry with:
   - title: "Debugging frontend" (most recent task)
   - clockIn: 8:35 AM (session start)
   - clockOut: 5:00 PM (session end)
   - subtasks: [
       {
         title: "Working on AI agent stack",
         clockIn: "8:35 AM",
         clockOut: "10:08 AM"
       }
     ]

### Scenario 3: Multiple Task Switches
1. User clocks in at 8:35 AM with "Task A"
2. At 9:00 AM, switches to "Task B"
3. At 10:00 AM, switches to "Task C"
4. User clocks out at 11:00 AM
5. **Result**: Single entry with:
   - title: "Task C" (most recent)
   - clockIn: 8:35 AM
   - clockOut: 11:00 AM
   - subtasks: [
       { title: "Task A", clockIn: "8:35 AM", clockOut: "9:00 AM" },
       { title: "Task B", clockIn: "9:00 AM", clockOut: "10:00 AM" }
     ]

## Time History Display

### Table View Structure
```
| Task Description          | Clock In | Clock Out | Duration | Breaks | Actions |
|---------------------------|----------|-----------|----------|--------|---------|
| 🟢 Debugging frontend     | 10:09 AM | In Progress | 0h 2m  | 0m     | ...     |
|   └─ Working on AI...     | 08:35 AM | 10:08 AM  | 1h 33m   |        |         |
|                           |          |           |          |        |         |
| 🟢 Working on AI agent... | 08:35 AM | 10:08 AM  | 1h 33m   | 0m     | ...     |
```

### Key Display Rules:
1. **Current Entry (In Progress)**:
   - Show main task title (most recent)
   - Show "In Progress" badge
   - Show current duration
   - Expandable section showing all previous tasks (subtasks)

2. **Completed Entries**:
   - Show main task title (final task)
   - Show full clock in/out times
   - Show total duration
   - Expandable section showing all tasks worked on (subtasks)

3. **Subtask Display**:
   - Indented under main entry
   - Show task title
   - Show start and end times
   - Show duration for that specific task
   - Use bullet points or tree structure

## Implementation Requirements

### 1. switchTask Function
- Must update the database entry immediately (not just local state)
- Create subtask entry for previous task with proper timestamps
- Update current entry title to new task
- Update current entry clockIn to current time (for new task)
- Persist subtasks array to database

### 2. Database Updates
- When switching tasks, immediately update the time_entries table
- Store subtasks as JSON array in the database
- Ensure atomic updates (transaction if possible)

### 3. Time History Rendering
- Display main entry with current/most recent task
- Show expandable subtasks section
- Calculate and display individual task durations
- Show proper indentation/hierarchy

### 4. Current Entry Display
- Show current task title
- Show session start time (original clockIn)
- Show time worked on current task
- Show expandable list of previous tasks in this session

## Edge Cases

1. **Switching before any task title set**: 
   - If currentEntry has no title, just update title (no subtask created)

2. **Switching multiple times quickly**:
   - Each switch creates a new subtask
   - Previous subtasks are preserved

3. **Clock out after switch**:
   - Final entry should have all subtasks
   - Main title is the most recent task

4. **Break during task switch**:
   - Breaks are session-level, not task-level
   - Break time applies to entire session
