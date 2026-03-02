'use client'

import { Moon } from 'lucide-react'
import type { DayHours } from '@/services/restaurant.service'


export interface ScheduleEntry {
  day: string
  openTime: string   // "HH:MM", empty when closed
  closeTime: string  // "HH:MM", empty when closed
  closed: boolean
}

// ── Conversion helpers ──────────────────────────────────────────────────────

export function dayHoursToEntry(dh: DayHours): ScheduleEntry {
  const isClosed = !!dh.closed || !dh.hours || dh.hours.toLowerCase() === 'fermé'
  if (isClosed) return { day: dh.day, openTime: '', closeTime: '', closed: true }
  const parts = dh.hours.split('-').map((x) => x.trim())
  return {
    day: dh.day,
    openTime: parts[0] ?? '',
    closeTime: parts[1] ?? '',
    closed: false,
  }
}

export function entryToDayHours(entry: ScheduleEntry): DayHours {
  if (entry.closed) return { day: entry.day, hours: 'Fermé', closed: true }
  return {
    day: entry.day,
    hours: `${entry.openTime} - ${entry.closeTime}`,
    closed: false,
  }
}

/** True when the closing time rolls over to the next calendar day. */
function closesNextDay(openTime: string, closeTime: string): boolean {
  if (!openTime || !closeTime) return false
  return closeTime < openTime
}

/** True when the entry has both times filled in. */
export function isEntryValid(entry: ScheduleEntry): boolean {
  if (entry.closed) return true
  return entry.openTime.length === 5 && entry.closeTime.length === 5
}

// ── Component ───────────────────────────────────────────────────────────────

interface ScheduleEditorProps {
  value: ScheduleEntry[]
  onChange: (entries: ScheduleEntry[]) => void
}

export function ScheduleEditor({ value, onChange }: ScheduleEditorProps) {
  function update(index: number, patch: Partial<ScheduleEntry>) {
    const next = value.map((entry, i) =>
      i === index ? { ...entry, ...patch } : entry
    )
    onChange(next)
  }

  return (
    <div className="rounded-lg border border-input overflow-hidden">
      {/* Header */}
      <div className="hidden sm:grid sm:grid-cols-[120px_1fr_1fr_auto] gap-3 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
        <span>Jour</span>
        <span>Ouverture</span>
        <span>Fermeture</span>
        <span className="w-16 text-center">Fermé</span>
      </div>

      {value.map((entry, index) => {
        const isNextDay = !entry.closed && closesNextDay(entry.openTime, entry.closeTime)
        const missing = !entry.closed && (
          (entry.openTime && !entry.closeTime) || (!entry.openTime && entry.closeTime)
        )

        return (
          <div
            key={entry.day}
            className={`grid grid-cols-[120px_1fr_1fr_auto] items-center gap-3 px-4 py-3 border-t border-input first:border-t-0 transition-colors ${
              entry.closed ? 'bg-muted/30' : ''
            }`}
          >
            {/* Day name */}
            <span className={`text-sm font-medium ${entry.closed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
              {entry.day}
            </span>

            {/* Open time */}
            <div>
              <input
                type="time"
                value={entry.openTime}
                disabled={entry.closed}
                onChange={(e) => update(index, { openTime: e.target.value })}
                className={`w-full h-9 rounded-md border px-3 py-1 text-sm bg-background transition-colors
                  focus:outline-none focus:ring-2 focus:ring-primary
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-muted
                  ${missing && !entry.openTime ? 'border-destructive' : 'border-input'}`}
              />
            </div>

            {/* Close time + next-day badge */}
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={entry.closeTime}
                disabled={entry.closed}
                onChange={(e) => update(index, { closeTime: e.target.value })}
                className={`w-full h-9 rounded-md border px-3 py-1 text-sm bg-background transition-colors
                  focus:outline-none focus:ring-2 focus:ring-primary
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-muted
                  ${missing && !entry.closeTime ? 'border-destructive' : 'border-input'}`}
              />
              {isNextDay && (
                <span
                  title="Ferme le lendemain"
                  className="shrink-0 flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                >
                  <Moon className="h-3 w-3" />
                  <span className="hidden sm:inline">+1j</span>
                </span>
              )}
            </div>

            {/* Closed toggle */}
            <div className="flex justify-center w-16">
              <button
                type="button"
                role="switch"
                aria-checked={entry.closed}
                onClick={() =>
                  update(index, {
                    closed: !entry.closed,
                    openTime: entry.closed ? '' : entry.openTime,
                    closeTime: entry.closed ? '' : entry.closeTime,
                  })
                }
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
                  ${entry.closed ? 'bg-destructive/70' : 'bg-input'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform
                    ${entry.closed ? 'translate-x-4' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
