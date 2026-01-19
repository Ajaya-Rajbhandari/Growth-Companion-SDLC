# Comprehensive Test Script - Growth Companion SDLC

This document provides a step-by-step test script for all features of the application. Follow each section in order and verify all expected behaviors.

## Prerequisites
- Application is running (local or production)
- User is logged in
- Browser console is open to check for errors
- Network tab is open to verify API calls

---

## 1. DASHBOARD TESTING

### 1.1 Navigation to Dashboard
- [ ] Click on "Dashboard" in the sidebar (or mobile menu)
- [ ] Verify dashboard view loads without errors
- [ ] Check that URL reflects the dashboard view

### 1.2 Dashboard Statistics Display
- [ ] Verify "Today" card shows:
  - [ ] Total hours worked today
  - [ ] Number of sessions
  - [ ] Calendar icon is visible
- [ ] Verify "This Week" card shows:
  - [ ] Total hours worked this week
  - [ ] Number of sessions
  - [ ] Calendar icon is visible
- [ ] Verify "Total Breaks" card shows:
  - [ ] Total break minutes
  - [ ] Break icon is visible
- [ ] Verify "Tasks Completed" card shows:
  - [ ] Number of completed tasks
  - [ ] Checkmark icon is visible

### 1.3 Weekly Activity Summary
- [ ] Verify weekly activity chart/graph is displayed
- [ ] Check that data points correspond to actual work sessions
- [ ] Verify dates are correctly labeled
- [ ] Check that hours are accurately represented

### 1.4 Productivity Metrics
- [ ] Verify productivity rate is displayed (if applicable)
- [ ] Check task completion percentage
- [ ] Verify notes count is accurate
- [ ] Check time entries summary matches actual data

### 1.5 Dashboard Responsiveness
- [ ] Resize browser window to mobile size
- [ ] Verify all cards stack properly
- [ ] Check that charts/graphs are responsive
- [ ] Verify no horizontal scrolling

---

## 2. TASKS TESTING

### 2.1 Navigation to Tasks
- [ ] Click on "Tasks" in the sidebar
- [ ] Verify tasks view loads without errors
- [ ] Check that existing tasks are displayed

### 2.2 Create New Task
- [ ] Click "Add Task" or "+" button
- [ ] Enter task title: "Test Task - High Priority"
- [ ] Set priority to "High"
- [ ] Set due date (today's date)
- [ ] Click "Create" or "Save"
- [ ] Verify task appears in the task list
- [ ] Verify task is marked as incomplete (unchecked)
- [ ] Check that task appears in "High Priority" filter

### 2.3 Edit Task
- [ ] Click on the edit icon/pencil for the created task
- [ ] Change title to "Test Task - Updated"
- [ ] Change priority to "Medium"
- [ ] Update due date
- [ ] Save changes
- [ ] Verify task updates in the list
- [ ] Verify task moves to "Medium Priority" filter

### 2.4 Complete/Uncomplete Task
- [ ] Click checkbox next to a task
- [ ] Verify task is marked as completed (checked)
- [ ] Verify task moves to "Completed" section
- [ ] Click checkbox again
- [ ] Verify task is marked as incomplete
- [ ] Verify task moves back to active tasks

### 2.5 Delete Task
- [ ] Click delete icon/button for a task
- [ ] Confirm deletion (if confirmation dialog appears)
- [ ] Verify task is removed from the list
- [ ] Verify task count updates

### 2.6 Filter Tasks by Priority
- [ ] Click "All" filter - verify all tasks shown
- [ ] Click "High" filter - verify only high priority tasks shown
- [ ] Click "Medium" filter - verify only medium priority tasks shown
- [ ] Click "Low" filter - verify only low priority tasks shown
- [ ] Verify filter state persists when switching views

### 2.7 Filter Tasks by Status
- [ ] Click "Active" filter - verify only incomplete tasks shown
- [ ] Click "Completed" filter - verify only completed tasks shown
- [ ] Verify filter combinations work (e.g., High + Active)

### 2.8 Task Search (if available)
- [ ] Enter search term in search box
- [ ] Verify tasks filter in real-time
- [ ] Clear search - verify all tasks shown again

### 2.9 Tasks Responsiveness
- [ ] Resize to mobile view
- [ ] Verify task list is scrollable
- [ ] Check that filters are accessible
- [ ] Verify add task button is visible

---

## 3. NOTES TESTING

### 3.1 Navigation to Notes
- [ ] Click on "Notes" in the sidebar
- [ ] Verify notes view loads without errors
- [ ] Check that existing notes are displayed

### 3.2 Create New Note
- [ ] Click "Add Note" or "+" button
- [ ] Enter note title: "Test Meeting Notes"
- [ ] Enter note content: "This is a test note with some content"
- [ ] Select category: "Meeting"
- [ ] Add tags: "test", "meeting"
- [ ] Click "Save" or "Create"
- [ ] Verify note appears in the notes list
- [ ] Verify note shows correct category badge
- [ ] Verify tags are displayed

### 3.3 Edit Note
- [ ] Click on a note to open/edit
- [ ] Modify the title
- [ ] Modify the content
- [ ] Change category to "Work"
- [ ] Add/remove tags
- [ ] Save changes
- [ ] Verify note updates in the list
- [ ] Verify updated timestamp changes

### 3.4 Delete Note
- [ ] Click delete icon/button for a note
- [ ] Confirm deletion (if confirmation dialog appears)
- [ ] Verify note is removed from the list
- [ ] Verify note count updates

### 3.5 Search Notes
- [ ] Enter search term in search box
- [ ] Verify notes filter in real-time by title/content
- [ ] Clear search - verify all notes shown again
- [ ] Test search with special characters

### 3.6 Filter Notes by Category
- [ ] Click "All" - verify all notes shown
- [ ] Click "Work" - verify only work notes shown
- [ ] Click "Personal" - verify only personal notes shown
- [ ] Click "Ideas" - verify only ideas notes shown
- [ ] Click "Meeting" - verify only meeting notes shown
- [ ] Click "Other" - verify only other notes shown

### 3.7 Note Formatting (if available)
- [ ] Create/edit a note
- [ ] Test bold formatting (if available)
- [ ] Test italic formatting (if available)
- [ ] Test code formatting (if available)
- [ ] Verify formatting persists after save

### 3.8 Tags Management
- [ ] Create note with multiple tags
- [ ] Verify tags are displayed as badges
- [ ] Click on a tag - verify filtering by tag works
- [ ] Edit note and remove a tag
- [ ] Verify tag is removed from display

### 3.9 Notes Responsiveness
- [ ] Resize to mobile view
- [ ] Verify note list is scrollable
- [ ] Check that search and filters are accessible
- [ ] Verify note editor is usable on mobile

---

## 4. TIMESHEET TESTING

### 4.1 Navigation to Timesheet
- [ ] Click on "Timesheet" in the sidebar
- [ ] Verify timesheet view loads without errors
- [ ] Check that time history is displayed (if any exists)

### 4.2 Clock In
- [ ] Verify "Start Your Work Day" card is visible (if not clocked in)
- [ ] Enter task description: "Working on test features"
- [ ] Click "Clock In" button
- [ ] Verify success toast notification appears
- [ ] Verify card changes to "In Progress" status
- [ ] Verify green indicator dot appears
- [ ] Verify elapsed time starts counting
- [ ] Verify "Working since [time]" is displayed
- [ ] Check that entry appears in time history immediately

### 4.3 Edit Current Task
- [ ] While clocked in, click "Edit Task" button
- [ ] Enter new task title: "Updated task description"
- [ ] Click "Update Task"
- [ ] Verify task title updates in the current entry card
- [ ] Verify task title updates in time history

### 4.4 Switch Task
- [ ] While clocked in, click "Switch Task" button
- [ ] Enter new task title: "New task after switch"
- [ ] Click "Switch Task"
- [ ] Verify previous task is saved as subtask
- [ ] Verify current task updates to new title
- [ ] Verify subtask appears in "Previous tasks in this session"
- [ ] Verify subtask shows correct start and end times
- [ ] Verify time history updates immediately

### 4.5 Take Break - Short Break
- [ ] While clocked in, click "Take Break" button
- [ ] Select "Short (15m)" break type
- [ ] Optionally add break title: "Coffee break"
- [ ] Click "Start Break"
- [ ] Verify break panel appears
- [ ] Verify break countdown/timer is displayed
- [ ] Verify "Break in progress" message is shown
- [ ] Verify work activities are paused
- [ ] Click "Resume Work" button
- [ ] Verify break ends
- [ ] Verify break is recorded in breaks list
- [ ] Verify break shows correct type and title (if provided)
- [ ] Verify break duration is calculated correctly

### 4.6 Take Break - Lunch Break
- [ ] Click "Take Break" button
- [ ] Select "Lunch (60m)" break type
- [ ] Add break title: "Lunch with team"
- [ ] Click "Start Break"
- [ ] Verify break starts with 60-minute duration
- [ ] End break after a few seconds (for testing)
- [ ] Verify break is saved with title "Lunch with team"

### 4.7 Take Break - Custom Break
- [ ] Click "Take Break" button
- [ ] Select "Custom" break type
- [ ] Enter duration: "30" minutes
- [ ] Add break title: "Personal break"
- [ ] Click "Start Break"
- [ ] Verify custom break starts
- [ ] End break
- [ ] Verify break is saved with custom duration and title
- [ ] Verify break badge shows "Personal break" instead of "Custom"

### 4.8 Edit Break Title
- [ ] Find a break in the current entry's "Breaks taken" section
- [ ] Click on the break badge
- [ ] Verify edit dialog opens
- [ ] Change break title to "Updated break title"
- [ ] Click "Save"
- [ ] Verify break title updates in the display
- [ ] Verify badge shows new title
- [ ] Clear title and save - verify badge shows "Custom"

### 4.9 Manual Break Entry
- [ ] While clocked in, find "Add Break" or similar option
- [ ] Enter break duration: "15" minutes
- [ ] Click "Add Break"
- [ ] Verify break is added to breaks list
- [ ] Verify break time is added to total break minutes

### 4.10 Clock Out
- [ ] While clocked in, click "Clock Out" button
- [ ] Verify success toast notification
- [ ] Verify entry is marked as completed in time history
- [ ] Verify total duration is calculated correctly
- [ ] Verify break time is included in calculation
- [ ] Verify entry shows correct clock in and clock out times

### 4.11 Time History View - Daily
- [ ] Select "Daily" view period
- [ ] Verify entries are grouped by date
- [ ] Verify each entry shows:
  - [ ] Task description
  - [ ] Clock in time
  - [ ] Clock out time (or "In Progress")
  - [ ] Duration
  - [ ] Breaks with types and titles
  - [ ] Subtasks (if task was switched)
- [ ] Verify subtasks show correct start/end times
- [ ] Verify break badges show titles when available

### 4.12 Time History View - Weekly
- [ ] Select "Weekly" view period
- [ ] Verify entries are grouped by week
- [ ] Verify weekly totals are displayed
- [ ] Verify all entries are visible
- [ ] Verify breaks are displayed correctly

### 4.13 Time History View - Monthly
- [ ] Select "Monthly" view period
- [ ] Verify entries are grouped by month
- [ ] Verify monthly summaries are displayed
- [ ] Verify navigation works (Previous/Next)

### 4.14 Time History View - Yearly
- [ ] Select "Yearly" view period
- [ ] Verify entries are grouped by year
- [ ] Verify yearly summaries are displayed

### 4.15 Export Timesheet - CSV
- [ ] Click export dropdown
- [ ] Select "Export as CSV"
- [ ] Verify CSV file downloads
- [ ] Open CSV file
- [ ] Verify all entries are included
- [ ] Verify break information is included
- [ ] Verify data is correctly formatted

### 4.16 Export Timesheet - JSON
- [ ] Click export dropdown
- [ ] Select "Export as JSON"
- [ ] Verify JSON file downloads
- [ ] Open JSON file
- [ ] Verify all data is included
- [ ] Verify structure is valid JSON
- [ ] Verify break titles are included

### 4.17 Export Timesheet - Excel
- [ ] Click export dropdown
- [ ] Select "Export as Excel"
- [ ] Verify Excel file downloads
- [ ] Open Excel file
- [ ] Verify "Summary" sheet exists
- [ ] Verify "Detailed Entries" sheet exists
- [ ] Verify "Break Details" sheet exists
- [ ] Check "Break Details" sheet:
  - [ ] Verify break titles are shown (not just "Custom")
  - [ ] Verify all break information is correct
  - [ ] Verify dates and times are accurate
- [ ] Verify "Daily Summary" sheet exists (if applicable)

### 4.18 Work Templates
- [ ] While clocked in, click "Save as Template"
- [ ] Enter template name: "Morning Development"
- [ ] Click "Save Template"
- [ ] Verify template is saved
- [ ] Clock out
- [ ] Click "Clock In"
- [ ] Verify saved templates appear
- [ ] Click on a template
- [ ] Verify template task description is pre-filled
- [ ] Clock in with template
- [ ] Verify entry uses template description

### 4.19 Timesheet Responsiveness
- [ ] Resize to mobile view
- [ ] Verify time history table is scrollable
- [ ] Verify clock in/out buttons are accessible
- [ ] Verify break controls are usable
- [ ] Verify export options are accessible

---

## 5. PROFILE TESTING

### 5.1 Navigation to Profile
- [ ] Click on "Profile" in the sidebar
- [ ] Verify profile view loads without errors

### 5.2 View Profile Information
- [ ] Verify user name is displayed
- [ ] Verify user email is displayed
- [ ] Verify account creation date is displayed (if available)
- [ ] Verify profile picture/avatar is displayed (if available)

### 5.3 Edit Profile Name
- [ ] Click "Edit" button or pencil icon next to name
- [ ] Enter new name: "Test User Updated"
- [ ] Click "Save" or "Update"
- [ ] Verify success notification appears
- [ ] Verify name updates in profile view
- [ ] Verify name updates in sidebar/header
- [ ] Refresh page - verify name persists

### 5.4 Sign Out
- [ ] Click "Sign Out" button
- [ ] Verify confirmation dialog (if applicable)
- [ ] Confirm sign out
- [ ] Verify redirect to auth page
- [ ] Verify session is cleared
- [ ] Verify cannot access protected routes

### 5.5 Profile Responsiveness
- [ ] Resize to mobile view
- [ ] Verify profile information is readable
- [ ] Verify edit controls are accessible
- [ ] Verify sign out button is visible

---

## 6. AI CHAT (FLOATING ASSISTANT) TESTING

### 6.1 Open/Close Chat
- [ ] Verify floating chat bubble is visible in bottom right
- [ ] Click on chat bubble
- [ ] Verify chat window opens
- [ ] Verify chat history is displayed (if any)
- [ ] Click close button or outside chat
- [ ] Verify chat window closes

### 6.2 Basic Chat Interaction
- [ ] Open chat
- [ ] Send message: "Hello"
- [ ] Verify message appears in chat
- [ ] Verify AI response is received
- [ ] Verify response is streamed (if applicable)
- [ ] Verify chat history persists after closing/reopening

### 6.3 Create Task via AI
- [ ] Open chat
- [ ] Send: "Create a task called 'Test AI Task' with high priority"
- [ ] Verify AI confirms task creation
- [ ] Verify task appears in Tasks view
- [ ] Verify task has correct title and priority
- [ ] Go to Tasks view and verify task exists

### 6.4 Create Note via AI
- [ ] Open chat
- [ ] Send: "Create a note titled 'AI Test Note' with content 'This note was created by AI'"
- [ ] Verify AI confirms note creation
- [ ] Verify note appears in Notes view
- [ ] Verify note has correct title and content
- [ ] Go to Notes view and verify note exists

### 6.5 Clock In via AI
- [ ] Ensure not currently clocked in
- [ ] Open chat
- [ ] Send: "Clock me in for 'Working on AI features'"
- [ ] Verify AI confirms clock in
- [ ] Verify timesheet shows "In Progress" status
- [ ] Verify task description is set correctly
- [ ] Go to Timesheet view and verify entry

### 6.6 Clock Out via AI
- [ ] Ensure currently clocked in
- [ ] Open chat
- [ ] Send: "Clock me out"
- [ ] Verify AI confirms clock out
- [ ] Verify timesheet shows entry as completed
- [ ] Verify entry appears in time history

### 6.7 Start Break via AI
- [ ] Ensure currently clocked in
- [ ] Open chat
- [ ] Send: "Start a 15 minute break"
- [ ] Verify AI confirms break started
- [ ] Verify break panel appears
- [ ] Verify break timer is running
- [ ] Send: "End my break"
- [ ] Verify break ends
- [ ] Verify break is recorded

### 6.8 Switch Task via AI
- [ ] Ensure currently clocked in
- [ ] Open chat
- [ ] Send: "Switch task to 'New task from AI'"
- [ ] Verify AI confirms task switch
- [ ] Verify current task updates
- [ ] Verify previous task is saved as subtask
- [ ] Verify subtask appears in "Previous tasks in this session"
- [ ] Verify time history updates immediately

### 6.9 Get Timesheet Status via AI
- [ ] Open chat
- [ ] Send: "What's my timesheet status?"
- [ ] Verify AI provides current status
- [ ] Verify information is accurate:
  - [ ] Current task (if clocked in)
  - [ ] Elapsed time
  - [ ] Break information
  - [ ] Today's hours

### 6.10 Get App Summary via AI
- [ ] Open chat
- [ ] Send: "Give me a summary of my work"
- [ ] Verify AI provides summary
- [ ] Verify summary includes:
  - [ ] Task completion stats
  - [ ] Notes count
  - [ ] Time worked
  - [ ] Recent activities

### 6.11 Chat History Persistence
- [ ] Open chat
- [ ] Send several messages
- [ ] Close chat
- [ ] Reopen chat
- [ ] Verify previous messages are displayed
- [ ] Verify chat history is maintained across sessions

### 6.12 Chat Error Handling
- [ ] Open chat
- [ ] Send invalid command: "Do something impossible"
- [ ] Verify AI handles error gracefully
- [ ] Verify error message is clear
- [ ] Verify chat continues to work after error

### 6.13 Chat Responsiveness
- [ ] Resize to mobile view
- [ ] Verify chat bubble is accessible
- [ ] Verify chat window is usable on mobile
- [ ] Verify keyboard doesn't cover input
- [ ] Verify messages are readable

---

## 7. INTEGRATION TESTING

### 7.1 Cross-Feature Integration
- [ ] Create task via AI, then complete it in Tasks view
- [ ] Create note via AI, then edit it in Notes view
- [ ] Clock in via AI, then switch task manually
- [ ] Take break manually, then check status via AI
- [ ] Verify all changes sync across views

### 7.2 Data Persistence
- [ ] Create tasks, notes, time entries
- [ ] Refresh page
- [ ] Verify all data persists
- [ ] Log out and log back in
- [ ] Verify all data is still present

### 7.3 Navigation Flow
- [ ] Navigate: Dashboard → Tasks → Notes → Timesheet → Profile
- [ ] Verify each view loads correctly
- [ ] Verify active view indicator updates in sidebar
- [ ] Use browser back/forward buttons
- [ ] Verify navigation state is maintained

---

## 8. ERROR HANDLING & EDGE CASES

### 8.1 Network Errors
- [ ] Disconnect internet
- [ ] Try to create a task
- [ ] Verify error message is displayed
- [ ] Reconnect internet
- [ ] Verify app recovers gracefully

### 8.2 Invalid Input
- [ ] Try to create task with empty title
- [ ] Verify validation error
- [ ] Try to clock in with very long task description
- [ ] Verify it handles correctly
- [ ] Try to add break with invalid duration
- [ ] Verify validation works

### 8.3 Concurrent Operations
- [ ] Open app in two browser tabs
- [ ] Create task in tab 1
- [ ] Verify task appears in tab 2 (or refresh needed)
- [ ] Clock in in tab 1
- [ ] Verify status in tab 2

### 8.4 Time Edge Cases
- [ ] Clock in at 11:59 PM
- [ ] Verify it handles day transition correctly
- [ ] Take break that spans midnight
- [ ] Verify break is recorded correctly

---

## 9. PERFORMANCE TESTING

### 9.1 Large Data Sets
- [ ] Create 50+ tasks
- [ ] Verify list performance is acceptable
- [ ] Create 50+ notes
- [ ] Verify search/filter performance
- [ ] Create 30+ time entries
- [ ] Verify time history loads quickly

### 9.2 Export Performance
- [ ] With large dataset, export to Excel
- [ ] Verify export completes in reasonable time
- [ ] Verify file is not corrupted
- [ ] Verify all data is included

---

## 10. ACCESSIBILITY TESTING

### 10.1 Keyboard Navigation
- [ ] Navigate entire app using only keyboard
- [ ] Verify all interactive elements are accessible
- [ ] Verify focus indicators are visible
- [ ] Verify tab order is logical

### 10.2 Screen Reader (if applicable)
- [ ] Test with screen reader
- [ ] Verify all content is announced
- [ ] Verify buttons have labels
- [ ] Verify form inputs have labels

---

## TEST COMPLETION CHECKLIST

- [ ] All Dashboard tests passed
- [ ] All Tasks tests passed
- [ ] All Notes tests passed
- [ ] All Timesheet tests passed
- [ ] All Profile tests passed
- [ ] All AI Chat tests passed
- [ ] All Integration tests passed
- [ ] All Error Handling tests passed
- [ ] All Performance tests passed
- [ ] All Accessibility tests passed

---

## NOTES & ISSUES

Document any issues found during testing:

### Issue 1:
- **Feature:** 
- **Description:** 
- **Steps to Reproduce:** 
- **Expected:** 
- **Actual:** 
- **Severity:** (Critical/High/Medium/Low)

### Issue 2:
- **Feature:** 
- **Description:** 
- **Steps to Reproduce:** 
- **Expected:** 
- **Actual:** 
- **Severity:** 

---

## TEST EXECUTION LOG

| Date | Tester | Section | Status | Notes |
|------|--------|---------|--------|-------|
|      |        |         |        |       |

---

**Test Script Version:** 1.0  
**Last Updated:** 2026-01-19  
**Application Version:** [Current Version]
