import { useAppStore, type TimeEntry } from "@/lib/store"
import { getLocalDateKey, parseLocalDateKey } from "@/lib/utils"
import {
  type ViewPeriod,
  calculateDuration,
  calculateTotalBreakMinutes,
  calculateTotalHours,
  formatDurationHHMMSS,
  formatTime,
  formatTimeHHMMSS,
  getBreakTypeLabel,
  getPeriodLabel,
  groupEntriesByDate,
} from "./helpers"

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.setAttribute("href", url)
  link.setAttribute("download", fileName)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportToCSV(entries: TimeEntry[], viewPeriod: ViewPeriod, selectedDate: Date) {
  const headers = ["Date", "Clock In", "Clock Out", "Break (min)", "Duration (hours)", "Notes"]
  const rows = entries.map((entry) => {
    const duration = calculateDuration(entry.clockIn, entry.clockOut, entry.breakMinutes)
    const hours = entry.clockOut ? (duration.totalMs / (1000 * 60 * 60)).toFixed(2) : "In Progress"
    return [
      entry.date,
      formatTime(entry.clockIn),
      entry.clockOut ? formatTime(entry.clockOut) : "-",
      entry.breakMinutes.toString(),
      hours,
      entry.notes || "",
    ]
  })

  const totalHours = calculateTotalHours(entries)
  const totalBreak = calculateTotalBreakMinutes(entries)
  rows.push([])
  rows.push(["Summary", "", "", "", "", ""])
  rows.push(["Total Hours", "", "", "", totalHours.toFixed(2), ""])
  rows.push(["Total Break", "", "", totalBreak.toString(), "", ""])
  rows.push(["Total Entries", "", "", "", entries.length.toString(), ""])

  const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  downloadBlob(blob, `timesheet-${viewPeriod}-${getLocalDateKey(selectedDate)}.csv`)
}

export function exportToJSON(entries: TimeEntry[], viewPeriod: ViewPeriod, selectedDate: Date) {
  const exportData = {
    period: viewPeriod,
    periodLabel: getPeriodLabel(selectedDate, viewPeriod),
    exportDate: new Date().toISOString(),
    summary: {
      totalHours: calculateTotalHours(entries).toFixed(2),
      totalBreakMinutes: calculateTotalBreakMinutes(entries),
      totalEntries: entries.length,
    },
    entries: entries.map((entry) => {
      const duration = calculateDuration(entry.clockIn, entry.clockOut, entry.breakMinutes)
      return {
        ...entry,
        durationHours: entry.clockOut ? (duration.totalMs / (1000 * 60 * 60)).toFixed(2) : null,
      }
    }),
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
  downloadBlob(blob, `timesheet-${viewPeriod}-${getLocalDateKey(selectedDate)}.json`)
}

export async function exportToExcel(entries: TimeEntry[], viewPeriod: ViewPeriod, selectedDate: Date) {
  const ExcelJS = await import("exceljs")
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Growth Companion"
  workbook.created = new Date()

  const addWorksheet = (name: string, rows: (string | number | null)[][], widths: number[]) => {
    const worksheet = workbook.addWorksheet(name)
    worksheet.addRows(rows)
    worksheet.columns = widths.map((width) => ({ width }))
    worksheet.getRow(1).font = { bold: true }
    return worksheet
  }

  // Get user info
  const userName = useAppStore.getState().user?.name || "Unknown"
  const userEmail = useAppStore.getState().user?.email || ""

  // ===== SHEET 1: Summary =====
  const summaryData = [
    ["TIMESHEET REPORT"],
    [],
    ["Employee Name:", userName],
    ["Email:", userEmail],
    ["Report Period:", getPeriodLabel(selectedDate, viewPeriod)],
    ["View Type:", viewPeriod.charAt(0).toUpperCase() + viewPeriod.slice(1)],
    ["Generated On:", new Date().toLocaleString()],
    [],
    ["SUMMARY STATISTICS"],
    [],
    ["Total Work Hours:", `${calculateTotalHours(entries).toFixed(2)} hours`],
    ["Total Break Time:", `${calculateTotalBreakMinutes(entries)} minutes`],
    ["Total Sessions:", entries.length],
    [
      "Average Hours/Session:",
      entries.length > 0
        ? `${(calculateTotalHours(entries) / entries.length).toFixed(2)} hours`
        : "N/A",
    ],
  ]

  addWorksheet("Summary", summaryData, [20, 40])

  // ===== SHEET 2: Daily Log (Date | Day | Task Type | Start | End | Time) — one row per segment, end of row N = start of row N+1 =====
  const dailyLogHeaders = ["Date", "Day", "Task Type", "Start", "End", "Time"]
  const dailyLogRows: (string | number)[][] = []
  const groupedByDate = groupEntriesByDate(entries)
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => a.localeCompare(b))

  for (const dateKey of sortedDates) {
    const dateEntries = groupedByDate[dateKey]
    const segments: { start: string; end: string; title: string }[] = []

    for (const entry of dateEntries) {
      if (entry.subtasks && entry.subtasks.length > 0) {
        for (const sub of entry.subtasks) {
          if (sub.clockOut) {
            segments.push({ start: sub.clockIn, end: sub.clockOut, title: sub.title })
          }
        }
        if (entry.clockOut) {
          const lastEnd = entry.subtasks[entry.subtasks.length - 1].clockOut
          segments.push({
            start: lastEnd || entry.clockIn,
            end: entry.clockOut,
            title: entry.title || "Work",
          })
        }
      } else {
        if (entry.clockOut) {
          segments.push({
            start: entry.clockIn,
            end: entry.clockOut,
            title: entry.title || "Work",
          })
        }
      }
      ;(entry.breaks || []).forEach((brk) => {
        if (brk.endTime) {
          segments.push({
            start: brk.startTime,
            end: brk.endTime,
            title: getBreakTypeLabel(brk.type, brk.title),
          })
        }
      })
    }

    segments.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

    const dateObj = parseLocalDateKey(dateKey)
    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" })
    const dateFormatted = `${dateObj.getMonth() + 1}-${dateObj.getDate()}-${dateObj.getFullYear()}`
    let dayTotalMs = 0

    segments.forEach((seg, idx) => {
      const startMs = new Date(seg.start).getTime()
      const endMs = new Date(seg.end).getTime()
      const durationMs = endMs - startMs
      dayTotalMs += durationMs
      const durationStr = formatDurationHHMMSS(durationMs)
      dailyLogRows.push([
        idx === 0 ? dateFormatted : "",
        idx === 0 ? dayName : "",
        seg.title,
        formatTimeHHMMSS(seg.start),
        formatTimeHHMMSS(seg.end),
        durationStr,
      ])
    })

    if (segments.length > 0) {
      dailyLogRows.push(["", "", "", "", "Total", formatDurationHHMMSS(dayTotalMs)])
    }
  }

  if (dailyLogRows.length === 0) {
    dailyLogRows.push(["No time entries for this period", "", "", "", "", ""])
  }

  addWorksheet("Daily Log", [dailyLogHeaders, ...dailyLogRows], [12, 10, 40, 10, 10, 10])

  // ===== SHEET 3: Detailed Entries =====
  const detailHeaders = [
    "Date",
    "Day",
    "Task/Project",
    "Clock In",
    "Clock Out",
    "Break Time (min)",
    "Work Duration",
    "Status",
    "Notes",
  ]

  const detailRows = entries.map((entry) => {
    const date = parseLocalDateKey(entry.date)
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" })
    const duration = calculateDuration(entry.clockIn, entry.clockOut, entry.breakMinutes)
    const hours = entry.clockOut
      ? `${Math.floor(duration.totalMs / (1000 * 60 * 60))}h ${Math.floor((duration.totalMs % (1000 * 60 * 60)) / (1000 * 60))}m`
      : "-"

    return [
      entry.date,
      dayName,
      entry.title || "No title",
      formatTime(entry.clockIn),
      entry.clockOut ? formatTime(entry.clockOut) : "-",
      entry.breakMinutes || 0,
      hours,
      entry.clockOut ? "Completed" : "In Progress",
      entry.notes || "",
    ]
  })

  // Add totals row
  detailRows.push([])
  detailRows.push([
    "TOTALS",
    "",
    "",
    "",
    "",
    calculateTotalBreakMinutes(entries),
    `${calculateTotalHours(entries).toFixed(2)} hours`,
    "",
    "",
  ])

  addWorksheet("Detailed Entries", [detailHeaders, ...detailRows], [12, 12, 30, 12, 12, 15, 15, 12, 30])

  // ===== SHEET 4: Break Details =====
  const breakHeaders = ["Date", "Task", "Break Type", "Start Time", "End Time", "Duration (min)"]
  const breakRows: (string | number)[][] = []

  entries.forEach((entry) => {
    if (entry.breaks && entry.breaks.length > 0) {
      entry.breaks.forEach((brk) => {
        const duration = brk.endTime
          ? Math.round((new Date(brk.endTime).getTime() - new Date(brk.startTime).getTime()) / (1000 * 60))
          : brk.durationMinutes || 0

        breakRows.push([
          entry.date,
          entry.title || "No title",
          getBreakTypeLabel(brk.type, brk.title),
          formatTime(brk.startTime),
          brk.endTime ? formatTime(brk.endTime) : "Ongoing",
          duration,
        ])
      })
    }
  })

  if (breakRows.length === 0) {
    breakRows.push(["No breaks recorded for this period", "", "", "", "", ""])
  }

  addWorksheet("Break Details", [breakHeaders, ...breakRows], [12, 30, 12, 12, 12, 15])

  // ===== SHEET 5: Daily Summary =====
  const dailySummaryHeaders = ["Date", "Day", "Total Hours", "Total Breaks (min)", "Sessions", "Tasks Completed"]
  const dailySummaryRows = Object.entries(groupedByDate).map(([date, dateEntries]) => {
    const dateObj = parseLocalDateKey(date)
    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" })
    const totalHours = calculateTotalHours(dateEntries)
    const totalBreaks = dateEntries.reduce((sum, e) => sum + (e.breakMinutes || 0), 0)
    const completedTasks = dateEntries.filter((e) => e.clockOut).length

    return [date, dayName, `${totalHours.toFixed(2)}`, totalBreaks, dateEntries.length, completedTasks]
  })

  addWorksheet("Daily Summary", [dailySummaryHeaders, ...dailySummaryRows], [12, 12, 12, 18, 10, 15])

  // ===== SHEET 6: Subtasks (if any) =====
  const subtaskHeaders = ["Date", "Main Task", "Subtask", "Start Time", "End Time", "Duration"]
  const subtaskRows: (string | number)[][] = []

  entries.forEach((entry) => {
    if (entry.subtasks && entry.subtasks.length > 0) {
      entry.subtasks.forEach((sub) => {
        const duration = sub.clockOut
          ? Math.round((new Date(sub.clockOut).getTime() - new Date(sub.clockIn).getTime()) / (1000 * 60))
          : 0

        subtaskRows.push([
          entry.date,
          entry.title || "No title",
          sub.title,
          formatTime(sub.clockIn),
          sub.clockOut ? formatTime(sub.clockOut) : "In Progress",
          `${Math.floor(duration / 60)}h ${duration % 60}m`,
        ])
      })
    }
  })

  if (subtaskRows.length === 0) {
    subtaskRows.push(["No subtasks recorded for this period", "", "", "", "", ""])
  }

  addWorksheet("Subtasks", [subtaskHeaders, ...subtaskRows], [12, 25, 25, 12, 12, 12])

  const fileName = `timesheet-${viewPeriod}-${getLocalDateKey(selectedDate)}.xlsx`
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  downloadBlob(blob, fileName)
}
