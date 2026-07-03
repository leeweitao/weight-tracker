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
