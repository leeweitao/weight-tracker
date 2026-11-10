import {
  eachWeekOfInterval,
  endOfWeek,
  format,
  isWithinInterval,
  parseISO,
  startOfWeek,
  subWeeks,
} from 'date-fns'
import type { WeightEntry, WeeklyAverage } from './types'

export function formatDateLabel(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d')
}

export function getWeeklyAverages(
  entries: WeightEntry[],
  numWeeks: number,
): WeeklyAverage[] {
  if (entries.length === 0 || numWeeks < 1) return []

  const now = new Date()
  const rangeStart = startOfWeek(subWeeks(now, numWeeks - 1), { weekStartsOn: 1 })
  const weeks = eachWeekOfInterval({ start: rangeStart, end: now }, { weekStartsOn: 1 })

  return weeks
    .map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
      const weekEntries = entries.filter((entry) => {
        const date = parseISO(entry.date)
        return isWithinInterval(date, { start: weekStart, end: weekEnd })
      })

      if (weekEntries.length === 0) return null

      const average =
        weekEntries.reduce((sum, entry) => sum + entry.weight, 0) / weekEntries.length

      return {
        weekStart: format(weekStart, 'yyyy-MM-dd'),
        weekLabel: format(weekStart, 'MMM d'),
        average: Math.round(average * 10) / 10,
        entryCount: weekEntries.length,
      }
    })
    .filter((week): week is WeeklyAverage => week !== null)
}

export function getRollingWeeklyAverage(weeklyAverages: WeeklyAverage[]): number | null {
  if (weeklyAverages.length === 0) return null
  const sum = weeklyAverages.reduce((total, week) => total + week.average, 0)
  return Math.round((sum / weeklyAverages.length) * 10) / 10
}

export function getEntriesInRange(entries: WeightEntry[], numWeeks: number): WeightEntry[] {
  const cutoff = subWeeks(new Date(), numWeeks)
  return entries
    .filter((entry) => parseISO(entry.date) >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function getWeekOverWeekChange(weeklyAverages: WeeklyAverage[]): number | null {
  if (weeklyAverages.length < 2) return null
  const latest = weeklyAverages[weeklyAverages.length - 1].average
  const previous = weeklyAverages[weeklyAverages.length - 2].average
  return Math.round((latest - previous) * 10) / 10
}

export function getAverageWeeklyChange(weeklyAverages: WeeklyAverage[]): number | null {
  if (weeklyAverages.length < 2) return null
  const first = weeklyAverages[0].average
  const latest = weeklyAverages[weeklyAverages.length - 1].average
  const weekGaps = weeklyAverages.length - 1
  return Math.round(((latest - first) / weekGaps) * 10) / 10
}

export function formatWeightChange(value: number, unit: string): string {
  return `${value >= 0 ? '+' : ''}${value} ${unit}`
}

export interface WeeklyHistoryRow {
  weekStart: string
  weekLabel: string
  weekNumber: number
  average: number | null
  entryCount: number
  changeFromPrevious: number | null
}

export function getWeeklyHistory(entries: WeightEntry[], today = new Date()): WeeklyHistoryRow[] {
  if (entries.length === 0) return []

  const firstEntryDate = entries.reduce(
    (earliest, entry) => (entry.date < earliest ? entry.date : earliest),
    entries[0].date,
  )
  const firstWeek = startOfWeek(parseISO(firstEntryDate), { weekStartsOn: 1 })
  const currentWeek = startOfWeek(today, { weekStartsOn: 1 })
  const entriesByWeek = new Map<string, WeightEntry[]>()

  for (const entry of entries) {
    const weekStart = format(startOfWeek(parseISO(entry.date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekEntries = entriesByWeek.get(weekStart) ?? []
    weekEntries.push(entry)
    entriesByWeek.set(weekStart, weekEntries)
  }

  return eachWeekOfInterval({ start: firstWeek, end: currentWeek }, { weekStartsOn: 1 }).map(
    (weekStart, weekNumber) => {
      const weekStartKey = format(weekStart, 'yyyy-MM-dd')
      const weekEntries = entriesByWeek.get(weekStartKey) ?? []
      const average =
        weekEntries.length === 0
          ? null
          : Math.round(
              (weekEntries.reduce((sum, entry) => sum + entry.weight, 0) / weekEntries.length) * 10,
            ) / 10
      const previousWeek =
        weekNumber > 0
          ? entriesByWeek.get(format(subWeeks(weekStart, 1), 'yyyy-MM-dd'))
          : undefined
      const previousAverage = previousWeek?.length
        ? previousWeek.reduce((sum, entry) => sum + entry.weight, 0) / previousWeek.length
        : null

      return {
        weekStart: weekStartKey,
        weekLabel: format(weekStart, 'MMM d, yyyy'),
        weekNumber,
        average,
        entryCount: weekEntries.length,
        changeFromPrevious:
          average == null || previousAverage == null
            ? null
            : Math.round((average - previousAverage) * 10) / 10,
      }
    },
  )
}
