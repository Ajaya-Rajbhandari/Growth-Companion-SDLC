# AI Chat Enhancements Testing Guide

This document provides a comprehensive testing checklist for all the AI chat enhancements that have been implemented.

## Prerequisites

1. **Database Setup**: Ensure you've run the migration for feedback feature:
   ```sql
   -- Run migrations/005_add_ai_analytics.sql in Supabase SQL Editor
   ```

2. **Test Data**: Make sure you have some test data:
   - At least 5-10 tasks (some completed, some pending)
   - A few notes
   - 2-3 goals (at least one active)
   - 2-3 habits
   - Some time entries

## Testing Checklist

### 1. Expanded AI Tools

#### Goals Management
- [ ] **Create Goal**: Ask "Create a goal to learn TypeScript in 3 months"
- [ ] **Update Goal**: Ask "Update my goal progress to 50%"
- [ ] **Delete Goal**: Ask "Delete my [goal name] goal"
- [ ] **Get Goals Summary**: Ask "Show me the progress on my active goals"
- [ ] **Update Goal Progress**: Ask "Set my [goal name] progress to 75%"

#### Habits Management
- [ ] **Create Habit**: Ask "Create a habit to meditate daily"
- [ ] **Log Habit**: Ask "Log my morning meditation for today"
- [ ] **Update Habit**: Ask "Update my meditation habit"
- [ ] **Delete Habit**: Ask "Delete my [habit name] habit"
- [ ] **Get Habits Summary**: Ask "Show me my habits summary"

#### Enhanced Task Management
- [ ] **Update Task**: Ask "Update my task [task name] to high priority"
- [ ] **Delete Task**: Ask "Delete my task [task name]"
- [ ] **Complete Task**: Ask "Mark my task [task name] as complete"

#### Enhanced Note Management
- [ ] **Update Note**: Ask "Update my note [note title]"
- [ ] **Delete Note**: Ask "Delete my note [note title]"

#### Calendar Integration
- [ ] **Get Calendar Events**: Ask "What events do I have today?"
- [ ] **Get Calendar Events (Date Range)**: Ask "Show me events for this week"

### 2. Rich Message Formatting

- [ ] **Markdown Rendering**: Check if AI responses with:
  - [ ] Bold text (**text**)
  - [ ] Italic text (*text*)
  - [ ] Lists (bulleted and numbered)
  - [ ] Code blocks
  - [ ] Headings

### 3. Feedback Mechanism

- [ ] **Positive Feedback**: Click thumbs up on an AI response
  - [ ] Verify feedback is recorded
  - [ ] Check toast notification appears
- [ ] **Negative Feedback**: Click thumbs down on an AI response
  - [ ] Verify feedback is recorded
  - [ ] Check toast notification appears
- [ ] **Change Feedback**: Click different feedback button
  - [ ] Verify feedback is updated (not duplicated)
- [ ] **Remove Feedback**: Click same feedback button again
  - [ ] Verify feedback is removed

### 4. Interactive Elements

- [ ] **Copy Message**: Click copy icon on AI response
  - [ ] Verify message is copied to clipboard
  - [ ] Check toast notification appears
- [ ] **Regenerate Response**: Click regenerate icon
  - [ ] Verify new response is generated
  - [ ] Check that previous response is replaced

### 5. Context-Aware Suggestions

- [ ] **Time-Based Suggestions**: Check suggestions at different times:
  - [ ] Morning (6 AM - 12 PM): Should suggest planning/clock in
  - [ ] Afternoon (12 PM - 6 PM): Should suggest break reminders
  - [ ] Evening (6 PM+): Should suggest daily summary
- [ ] **State-Based Suggestions**: 
  - [ ] With pending tasks: Should suggest task prioritization
  - [ ] With active goals: Should suggest goal progress check
  - [ ] With habits: Should suggest habit logging
  - [ ] When clocked in: Should suggest break reminders

### 6. Enhanced Context Awareness

- [ ] **Get App Summary**: Ask "Give me a summary of my tasks, notes, and time tracked for today"
  - [ ] Verify it includes goals and habits
- [ ] **Get Goals Summary**: Ask "Show me my goals summary"
  - [ ] Verify it shows active goals, progress, milestones
- [ ] **Get Habits Summary**: Ask "Show me my habits summary"
  - [ ] Verify it shows habits, streaks, completion rates
- [ ] **Get Calendar Events**: Ask "What's on my calendar today?"
  - [ ] Verify it shows tasks, time entries, goals, habits

### 7. Error Handling

- [ ] **Network Error**: Simulate network failure
  - [ ] Verify user-friendly error message
- [ ] **Invalid Input**: Try invalid commands
  - [ ] Verify clear error messages
- [ ] **Table Not Found**: If migration not run, verify helpful error message

### 8. Tool Result Display

- [ ] **Summary Cards**: Verify summary tools display results in cards:
  - [ ] Goals summary card
  - [ ] Habits summary card
  - [ ] Calendar events card
  - [ ] Timesheet status card
  - [ ] Daily summary card

### 9. Multi-Step Operations

- [ ] **Complex Queries**: Try queries that might trigger multiple tools:
  - [ ] "Plan my week" (might create tasks, set goals)
  - [ ] "Help me organize my work" (might use multiple tools)

## Test Scenarios

### Scenario 1: Complete Goal Management Workflow
1. Create a new goal via AI
2. Check goals summary
3. Update goal progress
4. View goal details
5. Delete the goal

### Scenario 2: Habit Tracking Workflow
1. Create a habit via AI
2. Log the habit for today
3. Check habits summary
4. Update the habit
5. Delete the habit

### Scenario 3: Task Management Workflow
1. Create a task via AI
2. Update task priority
3. Complete the task
4. Delete the task

### Scenario 4: Daily Planning Workflow
1. Ask for daily summary in the morning
2. Create tasks for the day
3. Clock in via AI
4. Check timesheet status
5. Ask for summary in the evening

## Expected Behaviors

### Tool Execution
- All tools should execute without errors
- Tool results should be displayed in formatted cards
- AI should reference tool results in its responses

### UI/UX
- Markdown should render correctly
- Feedback buttons should be responsive
- Copy/regenerate buttons should work smoothly
- Suggestions should be contextually relevant

### Error Handling
- Errors should be user-friendly
- Network errors should provide actionable guidance
- Invalid operations should show clear messages

## Known Issues to Watch For

1. **Feedback Table**: If migration not run, feedback will fail gracefully
2. **Session ID**: Invalid session IDs are handled (ignored)
3. **Empty Results**: Summary tools handle empty data gracefully

## Performance Checks

- [ ] Response time: Should be < 5 seconds for simple queries
- [ ] Streaming: Responses should stream smoothly
- [ ] No lag: UI should remain responsive during AI processing

## Browser Compatibility

Test on:
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (if available)
- [ ] Mobile browsers

## Notes

- All tool results are displayed in cards below the AI message
- Feedback is stored in the database (requires migration)
- Suggestions update based on app state and time of day
- Markdown rendering supports most common formatting
