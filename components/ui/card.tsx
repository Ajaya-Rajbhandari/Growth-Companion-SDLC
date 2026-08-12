import * as React from 'react'

import { cn } from '@/lib/utils'

type CardDensity = 'default' | 'compact'

/**
 * Density is coordinated through context rather than repeated on every slot.
 *
 * The vertical rhythm lives on `Card` (gap + py) while the horizontal padding
 * lives on `CardHeader`/`CardContent` (px), so a call site that only overrode the
 * slots' padding was still paying the card's 24px gap and 24px py underneath —
 * which is exactly what the timesheet's `!px-*` overrides were fighting, and
 * losing. Declaring it once on the Card keeps both axes in step.
 */
const CardDensityContext = React.createContext<CardDensity>('default')

const cardDensity = {
  default: 'gap-6 py-6',
  compact: 'gap-2 py-2 sm:gap-3 sm:py-3 md:gap-4 md:py-4',
} satisfies Record<CardDensity, string>

const slotDensity = {
  default: 'px-6',
  compact: 'px-2 sm:px-3 md:px-4',
} satisfies Record<CardDensity, string>

function Card({
  className,
  density = 'default',
  ...props
}: React.ComponentProps<'div'> & { density?: CardDensity }) {
  return (
    <CardDensityContext.Provider value={density}>
      <div
        data-slot="card"
        data-density={density}
        className={cn(
          'bg-card text-card-foreground flex flex-col rounded-xl border shadow-sm',
          cardDensity[density],
          className,
        )}
        {...props}
      />
    </CardDensityContext.Provider>
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  const density = React.useContext(CardDensityContext)
  return (
    <div
      data-slot="card-header"
      className={cn(
        '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
        slotDensity[density],
        className,
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  const density = React.useContext(CardDensityContext)
  return (
    <div
      data-slot="card-content"
      className={cn(slotDensity[density], className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  const density = React.useContext(CardDensityContext)
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center [.border-t]:pt-6', slotDensity[density], className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
