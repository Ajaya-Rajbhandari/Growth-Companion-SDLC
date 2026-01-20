"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { useShallow } from "zustand/react/shallow"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { format, subDays, addDays } from "date-fns"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

export function SeedTestDataButton() {
  const { user } = useAppStore(
    useShallow((state) => ({
      user: state.user,
    })),
  )

  const [isSeeding, setIsSeeding] = useState(false)
  const [progress, setProgress] = useState("")

  const seedTestData = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in first",
        variant: "destructive",
      })
      return
    }

    if (!confirm("This will create a large amount of test data (500 tasks, 300 notes, 200 days of time entries, etc.). Continue?")) {
      return
    }

    setIsSeeding(true)
    setProgress("Starting...")

    try {
      const userId = user.id
      const today = new Date()
      const startDate = subDays(today, 200)

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

      const randomItem = <T,>(array: T[]): T => array[Math.floor(Math.random() * array.length)]
      const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min
      const randomDate = (start: Date, end: Date): Date => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
      const randomBool = (): boolean => Math.random() > 0.5

      const summary: Record<string, number> = {}

      // 1. Seed Time Categories
      setProgress("Creating time categories...")
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
      setProgress("Creating tasks (500)...")
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
        setProgress(`Creating tasks... ${Math.min(i + 100, 500)}/500`)
      }
      summary.tasks = taskIds.length

      // 3. Seed Notes (300 notes)
      setProgress("Creating notes (300)...")
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
          content: `Test note content ${i + 1}. ${'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(randomInt(2, 5))}`,
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
        setProgress(`Creating notes... ${Math.min(i + 100, 300)}/300`)
      }
      summary.notes = noteIds.length

      // 4. Seed Time Entries (200 days)
      setProgress("Creating time entries (200 days, this may take a while)...")
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

          const numBreaks = randomInt(0, 3)
          const breaks: any[] = []
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

          const { data } = await supabase
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

          if (data) entryCount++
        }

        if (dayOffset % 20 === 0) {
          setProgress(`Creating time entries... ${dayOffset}/200 days (${entryCount} entries)`)
        }
      }
      summary.timeEntries = entryCount

      // 5. Seed Goals (20 goals)
      setProgress("Creating goals (20)...")
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
            description: `Goal description for goal ${i + 1}. This is a test goal with progress tracking.`,
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
      setProgress("Creating habits (8)...")
      const habitIds: string[] = []
      for (let i = 0; i < 8; i++) {
        const { data } = await supabase
          .from('habits')
          .insert({
            user_id: userId,
            title: randomItem(habitTitles),
            description: `Daily habit tracking for ${randomItem(habitTitles)}`,
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
      setProgress("Creating habit logs (100 days per habit)...")
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
            notes: randomBool() ? `Completed on ${format(date, 'MMM d')}` : null,
          })

          if (!error) logCount++
        }
      }
      summary.habitLogs = logCount

      setProgress("Complete!")
      
      toast({
        title: "✅ Test data seeded successfully!",
        description: `Created: ${summary.categories} categories, ${summary.tasks} tasks, ${summary.notes} notes, ${summary.timeEntries} time entries, ${summary.goals} goals, ${summary.habits} habits, ${summary.habitLogs} habit logs`,
      })

      // Refresh the app data
      setTimeout(() => {
        window.location.reload()
      }, 2000)

    } catch (error) {
      console.error('Seeding error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to seed test data",
        variant: "destructive",
      })
    } finally {
      setIsSeeding(false)
      setProgress("")
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="p-4 border rounded-lg bg-card">
      <h3 className="text-sm font-semibold mb-2">Test Data Seeding</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Generate comprehensive test data: 500 tasks, 300 notes, 200 days of time entries, goals, habits, and more.
      </p>
      <Button
        onClick={seedTestData}
        disabled={isSeeding}
        variant="outline"
        className="w-full"
      >
        {isSeeding ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {progress || "Seeding..."}
          </>
        ) : (
          "🌱 Seed Test Data"
        )}
      </Button>
      {progress && (
        <p className="text-xs text-muted-foreground mt-2">{progress}</p>
      )}
    </div>
  )
}
