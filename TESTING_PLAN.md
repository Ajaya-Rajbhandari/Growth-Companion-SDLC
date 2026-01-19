# Testing Plan for Growth Companion SDLC

## Features to Test

### 1. **Authentication** ✅
- [ ] Google OAuth login
- [ ] Auth callback handling
- [ ] Session persistence
- [ ] Sign out functionality

### 2. **Dashboard View**
- [ ] Profile display
- [ ] Weekly activity stats
- [ ] Productivity rates
- [ ] Task completion percentages
- [ ] Notes count
- [ ] Time entries summary
- [ ] Charts and visualizations

### 3. **Tasks Management**
- [ ] Create new task
- [ ] Edit task
- [ ] Delete task
- [ ] Mark task as complete/incomplete
- [ ] Set task priority (low/medium/high)
- [ ] Set due date
- [ ] Filter tasks by priority
- [ ] Filter tasks by completion status

### 4. **Notes Management**
- [ ] Create new note
- [ ] Edit note
- [ ] Delete note
- [ ] Search notes
- [ ] Filter by category (work, personal, ideas, meeting, other)
- [ ] Add/remove tags
- [ ] Format text (bold, italic, code)

### 5. **Timesheet Management**
- [ ] Clock in with task description
- [ ] Clock out
- [ ] Start break (fixed, lunch, custom duration)
- [ ] End break
- [ ] View today's hours
- [ ] View weekly hours
- [ ] View time entry history
- [ ] Export timesheet data
- [ ] Save work templates
- [ ] Use saved templates

### 6. **AI Assistant (Floating Assistant)**
- [ ] Open/close chat bubble
- [ ] Send messages
- [ ] Receive AI responses
- [ ] Create task via AI
- [ ] Create note via AI
- [ ] Clock in/out via AI
- [ ] Start/end break via AI
- [ ] Get timesheet status via AI
- [ ] Get app summary via AI
- [ ] Chat history persistence

### 7. **Profile Management**
- [ ] View profile information
- [ ] Edit name
- [ ] View email
- [ ] View account creation date
- [ ] Sign out

### 8. **Onboarding**
- [ ] Onboarding modal display
- [ ] Step-by-step walkthrough
- [ ] Skip onboarding
- [ ] Complete onboarding

### 9. **Theme & UI**
- [ ] Dark/light mode toggle
- [ ] Theme persistence
- [ ] Responsive design (mobile/desktop)
- [ ] Sidebar navigation
- [ ] Mobile header

### 10. **Data Persistence**
- [ ] Tasks saved to Supabase
- [ ] Notes saved to Supabase
- [ ] Time entries saved to Supabase
- [ ] Chat sessions saved to Supabase
- [ ] User preferences saved

## Testing Checklist

### Before Testing
- [ ] Environment variables set (.env file)
- [ ] Dependencies installed (`pnpm install`)
- [ ] Supabase project configured
- [ ] Google OAuth configured in Supabase
- [ ] OpenAI API key configured

### During Testing
- [ ] Test each feature systematically
- [ ] Document any bugs or issues
- [ ] Test edge cases
- [ ] Test error handling
- [ ] Verify data persistence

### After Testing
- [ ] Document findings
- [ ] Create issues for bugs
- [ ] Note feature improvements
- [ ] Verify all features work in production

## Known Issues to Check
- [ ] Check if Supabase tables are created
- [ ] Verify API routes are working
- [ ] Check for console errors
- [ ] Verify authentication flow
- [ ] Test data sync between client and server
