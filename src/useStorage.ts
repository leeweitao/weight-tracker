import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AppSettings, Phase, SyncStatus, WeightEntry, WeightProject } from './types'
import { useAuth } from './useAuth'
import {
  ensureActiveProject,
  fetchCloudData,
  mergeProjects,
  mergeSettings,
  pushCloudData,
} from './sync'

const LEGACY_ENTRIES_KEY = 'weight-tracker-entries'
const LEGACY_SETTINGS_KEY = 'weight-tracker-settings'
const PROJECTS_KEY = 'weight-tracker-projects'
const SETTINGS_KEY = 'weight-tracker-settings'
const SETTINGS_UPDATED_AT_KEY = 'weight-tracker-settings-updated-at'

const defaultSettings: AppSettings = {
  activeProjectId: '',
  weeksToAverage: 4,
  unit: 'lb',
}

interface LegacySettings {
  phase?: Phase
  weeksToAverage?: number
  unit?: 'lb' | 'kg'
}

function nowIso(): string {
  return new Date().toISOString()
}

function createId(): string {
  return crypto.randomUUID()
}

function defaultProjectName(phase: Phase): string {
  const year = new Date().getFullYear()
  return phase === 'bulking' ? `Bulk ${year}` : `Cutting ${year}`
}

function normalizeProject(project: WeightProject): WeightProject {
  return {
    ...project,
    updatedAt: project.updatedAt ?? project.createdAt,
  }
}

function createProject(name: string, phase: Phase, entries: WeightEntry[] = []): WeightProject {
  const createdAt = nowIso()
  return {
    id: createId(),
    name,
    phase,
    entries,
    createdAt,
    updatedAt: createdAt,
  }
}

function touchProject(project: WeightProject): WeightProject {
  return { ...project, updatedAt: nowIso() }
}

function loadLegacyEntries(): WeightEntry[] {
  try {
    const raw = localStorage.getItem(LEGACY_ENTRIES_KEY)
    return raw ? (JSON.parse(raw) as WeightEntry[]) : []
  } catch {
    return []
  }
}

function loadLegacySettings(): LegacySettings {
  try {
    const raw = localStorage.getItem(LEGACY_SETTINGS_KEY)
    return raw ? (JSON.parse(raw) as LegacySettings) : {}
  } catch {
    return {}
  }
}

function migrateToProjects(): { projects: WeightProject[]; settings: AppSettings } {
  const legacyEntries = loadLegacyEntries()
  const legacySettings = loadLegacySettings()
  const phase = legacySettings.phase ?? 'cutting'

  const migratedProject = createProject(
    defaultProjectName(phase),
    phase,
    [...legacyEntries].sort((a, b) => a.date.localeCompare(b.date)),
  )

  const settings: AppSettings = {
    activeProjectId: migratedProject.id,
    weeksToAverage: legacySettings.weeksToAverage ?? defaultSettings.weeksToAverage,
    unit: legacySettings.unit ?? defaultSettings.unit,
  }

  return { projects: [migratedProject], settings }
}

function loadProjects(): WeightProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY)
    return raw ? (JSON.parse(raw) as WeightProject[]).map(normalizeProject) : []
  } catch {
    return []
  }
}

function loadSettings(projects: WeightProject[]): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...defaultSettings, activeProjectId: projects[0]?.id ?? '' }

    const parsed = { ...defaultSettings, ...(JSON.parse(raw) as AppSettings) }
    return ensureActiveProject(projects, parsed)
  } catch {
    return { ...defaultSettings, activeProjectId: projects[0]?.id ?? '' }
  }
}

function initializeStorage(): { projects: WeightProject[]; settings: AppSettings } {
  const existingProjects = loadProjects()
  if (existingProjects.length > 0) {
    return { projects: existingProjects, settings: loadSettings(existingProjects) }
  }

  const migrated = migrateToProjects()
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(migrated.projects))
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(migrated.settings))
  localStorage.setItem(SETTINGS_UPDATED_AT_KEY, nowIso())
  return migrated
}

export function useWeightStorage() {
  const { user, loading: authLoading, isConfigured, signUp, signIn, signOut } = useAuth()
  const initial = useMemo(() => initializeStorage(), [])
  const [projects, setProjects] = useState<WeightProject[]>(initial.projects)
  const [settings, setSettings] = useState<AppSettings>(initial.settings)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(isConfigured ? 'idle' : 'offline')
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncReady, setSyncReady] = useState(false)
  const userIdRef = useRef<string | null>(null)

  const activeProject = useMemo(
    () => projects.find((project) => project.id === settings.activeProjectId) ?? projects[0] ?? null,
    [projects, settings.activeProjectId],
  )

  useEffect(() => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
  }, [projects])

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    localStorage.setItem(SETTINGS_UPDATED_AT_KEY, nowIso())
  }, [settings])

  const applyCloudMerge = useCallback(
    (nextProjects: WeightProject[], nextSettings: AppSettings) => {
      setProjects(nextProjects)
      setSettings(nextSettings)
    },
    [],
  )

  useEffect(() => {
    if (!isConfigured) {
      setSyncStatus('offline')
      setSyncReady(false)
      return
    }

    if (authLoading) return

    if (!user) {
      userIdRef.current = null
      setSyncReady(false)
      setSyncStatus('offline')
      setSyncError(null)
      return
    }

    if (userIdRef.current === user.id) return
    userIdRef.current = user.id
    const userId = user.id

    let cancelled = false

    async function pullFromCloud() {
      setSyncStatus('syncing')
      setSyncError(null)
      setSyncReady(false)

      try {
        const cloud = await fetchCloudData(userId)
        if (cancelled) return

        const localProjects = loadProjects()
        const localSettings = loadSettings(localProjects)
        const localSettingsUpdatedAt = localStorage.getItem(SETTINGS_UPDATED_AT_KEY)

        const mergedProjects = mergeProjects(localProjects, cloud.projects)
        const mergedSettings = ensureActiveProject(
          mergedProjects,
          mergeSettings(
            localSettings,
            cloud.settings,
            localSettingsUpdatedAt,
            cloud.settingsUpdatedAt,
          ),
        )

        applyCloudMerge(mergedProjects, mergedSettings)
        await pushCloudData(userId, mergedProjects, mergedSettings)
        if (cancelled) return

        setSyncStatus('synced')
        setSyncReady(true)
      } catch (error) {
        if (cancelled) return
        setSyncStatus('error')
        setSyncError(error instanceof Error ? error.message : 'Sync failed')
        setSyncReady(true)
      }
    }

    pullFromCloud()

    return () => {
      cancelled = true
    }
  }, [user, authLoading, isConfigured, applyCloudMerge])

  useEffect(() => {
    if (!user || !syncReady || !isConfigured) return

    const timer = window.setTimeout(async () => {
      setSyncStatus('syncing')
      setSyncError(null)

      try {
        await pushCloudData(user.id, projects, settings)
        setSyncStatus('synced')
      } catch (error) {
        setSyncStatus('error')
        setSyncError(error instanceof Error ? error.message : 'Sync failed')
      }
    }, 800)

    return () => window.clearTimeout(timer)
  }, [user, syncReady, isConfigured, projects, settings])

  function updateProject(projectId: string, updater: (project: WeightProject) => WeightProject) {
    setProjects((prev) =>
      prev.map((project) =>
        project.id === projectId ? touchProject(updater(project)) : project,
      ),
    )
  }

  function addOrUpdateEntry(date: string, weight: number) {
    if (!activeProject) return

    updateProject(activeProject.id, (project) => {
      const existing = project.entries.findIndex((entry) => entry.date === date)
      const nextEntries =
        existing >= 0
          ? project.entries.map((entry, index) => (index === existing ? { date, weight } : entry))
          : [...project.entries, { date, weight }]

      return {
        ...project,
        entries: nextEntries.sort((a, b) => a.date.localeCompare(b.date)),
      }
    })
  }

  function deleteEntry(date: string) {
    if (!activeProject) return
    updateProject(activeProject.id, (project) => ({
      ...project,
      entries: project.entries.filter((entry) => entry.date !== date),
    }))
  }

  function updateSettings(partial: Partial<AppSettings>) {
    setSettings((prev) => ensureActiveProject(projects, { ...prev, ...partial }))
  }

  function switchProject(projectId: string) {
    if (!projects.some((project) => project.id === projectId)) return
    updateSettings({ activeProjectId: projectId })
  }

  function createProjectAction(name: string, phase: Phase) {
    const trimmed = name.trim()
    if (!trimmed) return null

    const project = createProject(trimmed, phase)
    setProjects((prev) => [...prev, project])
    updateSettings({ activeProjectId: project.id })
    return project
  }

  function renameProject(projectId: string, name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    updateProject(projectId, (project) => ({ ...project, name: trimmed }))
  }

  function updateProjectPhase(projectId: string, phase: Phase) {
    updateProject(projectId, (project) => ({ ...project, phase }))
  }

  function deleteProject(projectId: string) {
    if (projects.length <= 1) return

    setProjects((prev) => {
      const next = prev.filter((project) => project.id !== projectId)
      if (settings.activeProjectId === projectId) {
        setSettings((current) =>
          ensureActiveProject(next, { ...current, activeProjectId: next[0]?.id ?? '' }),
        )
      }
      return next
    })
  }

  return {
    projects,
    activeProject,
    entries: activeProject?.entries ?? [],
    settings,
    addOrUpdateEntry,
    deleteEntry,
    updateSettings,
    switchProject,
    createProject: createProjectAction,
    renameProject,
    updateProjectPhase,
    deleteProject,
    user,
    authLoading,
    isCloudConfigured: isConfigured,
    syncStatus,
    syncError,
    signUp,
    signIn,
    signOut,
  }
}
