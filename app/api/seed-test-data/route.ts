import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { format, subDays, addDays } from 'date-fns'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export async function POST(request: NextRequest) {
  try {
    // Get auth token from request
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    })

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id
    const today = new Date()
    const startDate = subDays(today, 200)

    // Sample data
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

    const randomItem = <T,>(array: T[]): T => array[Math.floor(Math.random() * array.length)]
    const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min
    const randomDate = (start: Date, end: Date): Date => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
    const randomBool = (): boolean => Math.random() > 0.5

    const summary: Record<string, number> = {}

    // 1. Seed Time Categories
    const categoryIds: string[] = []
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

      if (!error && data) {
        categoryIds.push(data.id)
      }
    }
    summary.categories = categoryIds.length

    // 2. Seed Tasks (500 tasks)
    const taskIds: string[] = []
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

    for (let i = 0; i < tasksToInsert.length; i += 100) {
      const batch = tasksToInsert.slice(i, i + 100)
      const { data } = await supabase.from('tasks').insert(batch).select()
      if (data) taskIds.push(...data.map(t => t.id))
    }
    summary.tasks = taskIds.length

    // 3. Seed Notes (300 notes)
    const noteIds: string[] = []
    const notesToInsert = []
    
    for (let i = 0; i < 300; i++) {
      const createdDate = randomDate(startDate, today)
      const updatedDate = randomBool() ? randomDate(createdDate, today) : createdDate
      const numTags = randomInt(0, 3)
      const tags = Array.from({ length: numTags }, () => randomItem(noteTags))

      notesToInsert.push({
        user_id: userId,
        title: `${randomItem(noteTitles)} ${i + 1}`,
        content: `Test note content ${i + 1}. ${'Lorem ipsum dolor sit amet. '.repeat(randomInt(2, 5))}`,
        category: randomItem(noteCategories),
        tags: [...new Set(tags)],
        created_at: createdDate.toISOString(),
        updated_at: updatedDate.toISOString(),
      })
    }

    for (let i = 0; i < notesToInsert.length; i += 100) {
      const batch = notesToInsert.slice(i, i + 100)
      const { data } = await supabase.from('notes').insert(batch).select()
      if (data) noteIds.push(...data.map(n => n.id))
    }
    summary.notes = noteIds.length

    // 4. Seed Time Entries (200 days)
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
        const clockIn = new Date(date)
        clockIn.setHours(clockInHour, randomInt(0, 59), 0, 0)
        const workHours = randomInt(1, 8)
        const clockOut = new Date(clockIn.getTime() + workHours * 60 * 60 * 1000)

        const { data } = await supabase
          .from('time_entries')
          .insert({
            user_id: userId,
            date: dateStr,
            clock_in: clockIn.toISOString(),
            clock_out: clockOut.toISOString(),
            title: randomItem(workTitles),
            break_minutes: randomInt(0, 60),
            breaks: [],
            category: categoryIds.length > 0 ? randomItem(categoryIds) : null,
          })
          .select()
          .single()

        if (data) entryCount++
      }
    }
    summary.timeEntries = entryCount

    // 5. Seed Goals (20 goals)
    const goalIds: string[] = []
    for (let i = 0; i < 20; i++) {
      const createdDate = randomDate(startDate, today)
      const targetDate = randomDate(today, addDays(today, 90))
      const status = randomItem(['active', 'completed', 'paused', 'cancelled'])
      const progress = status === 'completed' ? 100 : status === 'paused' ? randomInt(20, 60) : randomInt(0, 90)
      
      const milestones = Array.from({ length: randomInt(0, 5) }, (_, j) => ({
        id: crypto.randomUUID(),
        title: `Milestone ${j + 1}`,
        completed: randomBool(),
        targetDate: format(randomDate(today, targetDate), 'yyyy-MM-dd'),
      }))

      const { data } = await supabase
        .from('goals')
        .insert({
          user_id: userId,
          title: `${randomItem(goalTitles)} ${i + 1}`,
          description: `Goal description ${i + 1}`,
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

      if (data) goalIds.push(data.id)
    }
    summary.goals = goalIds.length

    // 6. Seed Habits (8 habits)
    const habitIds: string[] = []
    for (let i = 0; i < 8; i++) {
      const { data } = await supabase
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

      if (data) habitIds.push(data.id)
    }
    summary.habits = habitIds.length

    // 7. Seed Habit Logs
    let logCount = 0
    for (const habitId of habitIds) {
      for (let dayOffset = 0; dayOffset < 100; dayOffset++) {
        const date = subDays(today, dayOffset)
        const dateStr = format(date, 'yyyy-MM-dd')
        if (Math.random() > 0.7) continue

        const { error } = await supabase.from('habit_logs').insert({
          habit_id: habitId,
          user_id: userId,
          date: dateStr,
          count: randomInt(1, 3),
        })

        if (!error) logCount++
      }
    }
    summary.habitLogs = logCount

    return NextResponse.json({
      success: true,
      summary,
      message: 'Test data seeded successfully!',
    })
  } catch (error) {
    console.error('Seeding error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
