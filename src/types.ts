export type Phase = 'bulking' | 'cutting'

export interface WeightEntry {
  date: string
  weight: number
}

export interface WeightProject {
  id: string
  name: string
  phase: Phase
  entries: WeightEntry[]
  createdAt: string
  updatedAt: string
}

export interface AppSettings {
  activeProjectId: string
  weeksToAverage: number
  unit: 'lb' | 'kg'
}

export interface WeeklyAverage {
  weekStart: string
  weekLabel: string
  average: number
  entryCount: number
}

export type SyncStatus = 'offline' | 'idle' | 'syncing' | 'synced' | 'error'
