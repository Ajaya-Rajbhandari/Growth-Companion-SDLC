import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Placeholder for the Timesheet screen while the initial fetch is in flight.
 *
 * The screen previously went from blank straight to fully populated. The worst of
 * that is the history card, whose height depends entirely on how many entries the
 * selected period holds — everything below it jumped when the data landed. These
 * blocks are sized to the real components so the arrival is a fill rather than a
 * reflow.
 *
 * aria-busy plus a single status message keeps it to one announcement, rather
 * than a screen reader walking a tree of meaningless empty boxes.
 */
export function TimesheetSkeleton() {
  return (
    <div className="space-y-2 sm:space-y-3" aria-busy="true">
      <span role="status" className="sr-only">
        Loading your timesheet.
      </span>

      <div aria-hidden="true" className="space-y-2 sm:space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-11 w-28" />
        </div>

        {/* Session card — the clock-in form and the active session are within a
            few pixels of each other in height, so one block covers both. */}
        <Card density="compact">
          <CardHeader>
            <Skeleton className="h-5 w-44" />
            <Skeleton className="mt-1 h-3 w-full max-w-md" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-12 w-full sm:h-10" />
            <Skeleton className="h-12 w-full sm:h-10" />
            <Skeleton className="h-14 w-full sm:h-12" />
          </CardContent>
        </Card>

        {/* Today's timeline */}
        <Card density="compact">
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>

        {/* Stats: the 4-up grid, then the 2-up */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} density="compact">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="size-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* History — the tallest block, and the one that used to shift the page */}
        <Card density="compact">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-6 w-24 rounded-lg" />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Skeleton className="h-11 w-24" />
              <Skeleton className="h-11 flex-1" />
              <Skeleton className="h-11 w-24" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full sm:h-12" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
