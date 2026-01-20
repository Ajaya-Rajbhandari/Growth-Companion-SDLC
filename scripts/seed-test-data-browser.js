/**
 * Browser-based Test Data Seeding Script
 * 
 * This script can be run directly in the browser console after logging in.
 * It uses the existing Supabase client from the app.
 * 
 * Usage:
 * 1. Log in to the app
 * 2. Open browser console (F12)
 * 3. Copy and paste this entire script
 * 4. Press Enter to run
 * 
 * OR use the API route: /api/seed-test-data
 */

(async function seedTestData() {
  console.log('🌱 Starting test data seeding...\n')

  // Import date-fns functions (if available) or use native Date
  const format = (date, formatStr) => {
    const d = new Date(date)
    if (formatStr === 'yyyy-MM-dd') {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }
    if (formatStr.includes('MMM')) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
    }
    return d.toLocaleDateString()
  }

  const subDays = (date, days) => {
    const result = new Date(date)
    result.setDate(result.getDate() - days)
    return result
  }

  const addDays = (date, days) => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  }

  // Get Supabase client from window or use fetch to API
  const supabaseUrl = process?.env?.NEXT_PUBLIC_SUPABASE_URL || window?.location?.origin
  const supabase = window.__SUPABASE_CLIENT__ || null

  if (!supabase) {
    console.error('❌ Supabase client not found!')
    console.log('💡 Trying to use API route instead...')
    
    // Try using API route
    try {
      const response = await fetch('/api/seed-test-data', { method: 'POST' })
      const result = await response.json()
      if (result.success) {
        console.log('✅ Seeding completed via API route!')
        console.log(result.summary)
      } else {
        console.error('❌ Seeding failed:', result.error)
      }
    } catch (error) {
      console.error('❌ API route not available. Please use the Node.js script instead.')
      console.error('   Run: npm run seed')
    }
    return
  }

  // Get current user
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session?.user) {
    console.error('❌ Not authenticated! Please log in first.')
    return
  }

  const userId = session.user.id
  console.log(`✅ Authenticated as: ${session.user.email}`)
  console.log(`📊 User ID: ${userId}\n`)

  const today = new Date()
  const startDate = subDays(today, 200)
  
  console.log(`📅 Generating data from ${format(startDate, 'MMM d, yyyy')} to ${format(today, 'MMM d, yyyy')}\n`)

  // Sample data arrays
  const taskTitles = [
    'Review project requirements', 'Implement user authentication', 'Design database schema',
    'Write unit tests', 'Fix bug in payment flow', 'Update documentation',
    'Code review for PR #123', 'Deploy to staging', 'Optimize database queries',
    'Refactor legacy code', 'Add error handling', 'Implement caching layer',
    'Update dependencies', 'Create API endpoints', 'Design UI mockups',
    'Write integration tests', 'Performance optimization', 'Security audit',
    'Add logging', 'Setup CI/CD pipeline',
  ]

  const noteTitles = [
    'Meeting notes - Sprint Planning', 'Ideas for new features', 'Technical decisions',
    'Client feedback', 'Research findings', 'Architecture notes',
    'Performance metrics', 'Security considerations', 'Team discussion points',
    'Project roadmap', 'Bug investigation', 'Code review notes',
    'Deployment checklist', 'Database migration plan', 'API design decisions',
  ]

  const noteCategories = ['work', 'personal', 'ideas', 'meeting', 'other']
  const noteTags = ['urgent', 'important', 'follow-up', 'research', 'design', 'backend', 'frontend', 'devops']
  const workTitles = [
    'Frontend development', 'Backend API work', 'Database optimization',
    'Code review', 'Testing and QA', 'Documentation',
    'Bug fixes', 'Feature implementation', 'Performance tuning', 'Security updates',
  ]

  const goalTitles = [
    'Complete project milestone', 'Improve code quality', 'Learn new technology',
    'Increase productivity', 'Reduce technical debt', 'Enhance user experience',
    'Optimize performance', 'Improve test coverage',
  ]

  const habitTitles = [
    'Daily exercise', 'Morning meditation', 'Read for 30 minutes',
    'Practice coding', 'Write in journal', 'Drink 8 glasses of water',
    'Take breaks every hour', 'Review daily goals',
  ]

  const categoryNames = [
    'Development', 'Meetings', 'Research', 'Code Review',
    'Documentation', 'Testing', 'Planning', 'Debugging',
  ]

  const categoryColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  ]

  // Helper functions
  const randomItem = (array) => array[Math.floor(Math.random() * array.length)]
  const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
  const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  const randomBool = () => Math.random() > 0.5

  try {
    // 1. Seed Time Categories
    console.log('📁 Creating time categories...')
    const categoryIds = []
    for (let i = 0; i < categoryNames.length; i++) {
      const { data, error } = await supabase
        .from('time_categories')
        .insert({
          user_id: userId,
          name: categoryNames[i],
          color: categoryColors[i],
        })
        .select()
        .single()

      if (error && !error.message.includes('duplicate')) {
        console.error(`  ❌ Error creating category ${categoryNames[i]}:`, error.message)
      } else if (data) {
        categoryIds.push(data.id)
        console.log(`  ✅ Created category: ${categoryNames[i]}`)
      }
    }
    console.log(`✅ Created ${categoryIds.length} categories\n`)

    // 2. Seed Tasks (500 tasks)
    console.log('📝 Creating tasks...')
    const taskIds = []
    const tasksToInsert = []
    
    for (let i = 0; i < 500; i++) {
      const dueDate = randomDate(startDate, addDays(today, 30))
      const createdDate = randomDate(startDate, today)
      const completed = randomBool() && createdDate < today
      
      tasksToInsert.push({
        user_id: userId,
        title: `${randomItem(taskTitles)} ${i + 1}`,
        completed,
        priority: randomItem(['low', 'medium', 'high']),
        urgency: randomItem(['low', 'medium', 'high']),
        due_date: randomBool() ? format(dueDate, 'yyyy-MM-dd') : null,
        created_at: createdDate.toISOString(),
      })
    }

    // Insert in batches of 100
    for (let i = 0; i < tasksToInsert.length; i += 100) {
      const batch = tasksToInsert.slice(i, i + 100)
      const { data, error } = await supabase
        .from('tasks')
        .insert(batch)
        .select()

      if (error) {
        console.error(`  ❌ Error creating tasks batch ${i / 100 + 1}:`, error.message)
      } else if (data) {
        taskIds.push(...data.map(t => t.id))
        console.log(`  ✅ Created batch ${i / 100 + 1}: ${data.length} tasks`)
      }
    }
    console.log(`✅ Created ${taskIds.length} tasks\n`)

    // 3. Seed Notes (300 notes)
    console.log('📄 Creating notes...')
    const noteIds = []
    const notesToInsert = []
    
    for (let i = 0; i < 300; i++) {
      const createdDate = randomDate(startDate, today)
      const updatedDate = randomBool() ? randomDate(createdDate, today) : createdDate
      
      const numTags = randomInt(0, 3)
      const tags = []
      for (let j = 0; j < numTags; j++) {
        tags.push(randomItem(noteTags))
      }

      notesToInsert.push({
        user_id: userId,
        title: `${randomItem(noteTitles)} ${i + 1}`,
        content: `This is a test note created on ${format(createdDate, 'MMM d, yyyy')}. ${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(randomInt(2, 5))}`,
        category: randomItem(noteCategories),
        tags: [...new Set(tags)],
        created_at: createdDate.toISOString(),
        updated_at: updatedDate.toISOString(),
      })
    }

    // Insert in batches of 100
    for (let i = 0; i < notesToInsert.length; i += 100) {
      const batch = notesToInsert.slice(i, i + 100)
      const { data, error } = await supabase
        .from('notes')
        .insert(batch)
        .select()

      if (error) {
        console.error(`  ❌ Error creating notes batch ${i / 100 + 1}:`, error.message)
      } else if (data) {
        noteIds.push(...data.map(n => n.id))
        console.log(`  ✅ Created batch ${i / 100 + 1}: ${data.length} notes`)
      }
    }
    console.log(`✅ Created ${noteIds.length} notes\n`)

    // 4. Seed Time Entries (200 days)
    console.log('⏰ Creating time entries (this may take a while)...')
    let entryCount = 0

    for (let dayOffset = 0; dayOffset < 200; dayOffset++) {
      const date = subDays(today, dayOffset)
      const dateStr = format(date, 'yyyy-MM-dd')
      
      if (date.getDay() === 0 || date.getDay() === 6) {
        if (Math.random() > 0.3) continue
      } else {
        if (Math.random() > 0.9) continue
      }

      const sessionsPerDay = randomInt(1, 3)
      
      for (let session = 0; session < sessionsPerDay; session++) {
        const clockInHour = randomInt(8, 14)
        const clockInMinute = randomInt(0, 59)
        const clockIn = new Date(date)
        clockIn.setHours(clockInHour, clockInMinute, 0, 0)
        
        const workHours = randomInt(1, 8)
        const clockOut = new Date(clockIn.getTime() + workHours * 60 * 60 * 1000)
        
        const numBreaks = randomInt(0, 3)
        const breaks = []
        let totalBreakMinutes = 0
        
        for (let b = 0; b < numBreaks; b++) {
          const breakStart = new Date(clockIn.getTime() + (b + 1) * (workHours * 60 * 60 * 1000) / (numBreaks + 1))
          const breakDuration = randomInt(5, 30)
          const breakEnd = new Date(breakStart.getTime() + breakDuration * 60 * 1000)
          
          breaks.push({
            id: crypto.randomUUID(),
            startTime: breakStart.toISOString(),
            endTime: breakEnd.toISOString(),
            durationMinutes: breakDuration,
            type: randomItem(['short', 'lunch', 'custom']),
            title: randomItem(['Coffee break', 'Lunch', 'Short break', 'Phone call']),
          })
          
          totalBreakMinutes += breakDuration
        }

        const { data, error } = await supabase
          .from('time_entries')
          .insert({
            user_id: userId,
            date: dateStr,
            clock_in: clockIn.toISOString(),
            clock_out: clockOut.toISOString(),
            title: randomItem(workTitles),
            break_minutes: totalBreakMinutes,
            breaks,
            category: categoryIds.length > 0 ? randomItem(categoryIds) : null,
          })
          .select()
          .single()

        if (error) {
          console.error(`  ❌ Error creating time entry for ${dateStr}:`, error.message)
        } else if (data) {
          entryCount++
        }
      }

      if (dayOffset % 50 === 0) {
        console.log(`  ✅ Processed ${dayOffset} days, created ${entryCount} entries...`)
      }
    }
    console.log(`✅ Created ${entryCount} time entries\n`)

    // 5. Seed Goals (20 goals)
    console.log('🎯 Creating goals...')
    const goalIds = []
    
    for (let i = 0; i < 20; i++) {
      const createdDate = randomDate(startDate, today)
      const targetDate = randomDate(today, addDays(today, 90))
      const status = randomItem(['active', 'completed', 'paused', 'cancelled'])
      const progress = status === 'completed' ? 100 : status === 'paused' ? randomInt(20, 60) : randomInt(0, 90)
      
      const milestones = []
      const numMilestones = randomInt(0, 5)
      for (let j = 0; j < numMilestones; j++) {
        milestones.push({
          id: crypto.randomUUID(),
          title: `Milestone ${j + 1}`,
          completed: randomBool(),
          targetDate: format(randomDate(today, targetDate), 'yyyy-MM-dd'),
        })
      }

      const { data, error } = await supabase
        .from('goals')
        .insert({
          user_id: userId,
          title: `${randomItem(goalTitles)} ${i + 1}`,
          description: `Goal description for goal ${i + 1}.`,
          target_date: format(targetDate, 'yyyy-MM-dd'),
          progress,
          status,
          category: randomItem(['Career', 'Health', 'Learning', 'Personal', 'Work']),
          milestones,
          created_at: createdDate.toISOString(),
          updated_at: createdDate.toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error(`  ❌ Error creating goal ${i + 1}:`, error.message)
      } else if (data) {
        goalIds.push(data.id)
      }
    }
    console.log(`✅ Created ${goalIds.length} goals\n`)

    // 6. Seed Habits (8 habits)
    console.log('🔥 Creating habits...')
    const habitIds = []
    
    for (let i = 0; i < 8; i++) {
      const { data, error } = await supabase
        .from('habits')
        .insert({
          user_id: userId,
          title: randomItem(habitTitles),
          description: `Daily habit tracking`,
          frequency: randomItem(['daily', 'weekly', 'custom']),
          target_count: randomInt(1, 5),
          color: randomItem(categoryColors),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error(`  ❌ Error creating habit ${i + 1}:`, error.message)
      } else if (data) {
        habitIds.push(data.id)
      }
    }
    console.log(`✅ Created ${habitIds.length} habits\n`)

    // 7. Seed Habit Logs
    console.log('📊 Creating habit logs...')
    let logCount = 0
    
    for (const habitId of habitIds) {
      for (let dayOffset = 0; dayOffset < 100; dayOffset++) {
        const date = subDays(today, dayOffset)
        const dateStr = format(date, 'yyyy-MM-dd')
        
        if (Math.random() > 0.7) continue
        
        const { error } = await supabase
          .from('habit_logs')
          .insert({
            habit_id: habitId,
            user_id: userId,
            date: dateStr,
            count: randomInt(1, 3),
            notes: randomBool() ? `Completed on ${format(date, 'MMM d')}` : null,
          })

        if (error && !error.message.includes('duplicate')) {
          console.error(`  ❌ Error creating habit log:`, error.message)
        } else {
          logCount++
        }
      }
    }
    console.log(`✅ Created ${logCount} habit logs\n`)

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ Test data seeding completed!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`📁 Time Categories: ${categoryIds.length}`)
    console.log(`📝 Tasks: ${taskIds.length}`)
    console.log(`📄 Notes: ${noteIds.length}`)
    console.log(`⏰ Time Entries: ${entryCount}`)
    console.log(`🎯 Goals: ${goalIds.length}`)
    console.log(`🔥 Habits: ${habitIds.length}`)
    console.log(`📊 Habit Logs: ${logCount}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n🎉 All test data has been seeded!')
    console.log('   Refresh your app to see the data.')

  } catch (error) {
    console.error('❌ Fatal error during seeding:', error)
  }
})()
