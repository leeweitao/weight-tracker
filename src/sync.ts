import type { AppSettings, WeightProject } from './types'
import { supabase } from './lib/supabase'

interface CloudProjectRow {
  id: string
  user_id: string
  name: string
  phase: 'bulking' | 'cutting'
  entries: WeightProject['entries']
  created_at: string
  updated_at: string
}

interface CloudSettingsRow {
  user_id: string
  settings: AppSettings
  updated_at: string
}

export interface CloudData {
  projects: WeightProject[]
  settings: AppSettings | null
  settingsUpdatedAt: string | null
}

function rowToProject(row: CloudProjectRow): WeightProject {
  return {
    id: row.id,
    name: row.name,
    phase: row.phase,
    entries: row.entries ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function fetchCloudData(userId: string): Promise<CloudData> {
  if (!supabase) return { projects: [], settings: null, settingsUpdatedAt: null }

  const [projectsResult, settingsResult] = await Promise.all([
    supabase.from('weight_projects').select('*').eq('user_id', userId),
    supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
  ])

  if (projectsResult.error) throw projectsResult.error
  if (settingsResult.error) throw settingsResult.error

  return {
    projects: (projectsResult.data as CloudProjectRow[]).map(rowToProject),
    settings: settingsResult.data ? (settingsResult.data as CloudSettingsRow).settings : null,
    settingsUpdatedAt: settingsResult.data
      ? (settingsResult.data as CloudSettingsRow).updated_at
      : null,
  }
}

export async function pushCloudData(
  userId: string,
  projects: WeightProject[],
  settings: AppSettings,
): Promise<void> {
  if (!supabase) return

  const now = new Date().toISOString()
  const projectRows = projects.map((project) => ({
    id: project.id,
    user_id: userId,
    name: project.name,
    phase: project.phase,
    entries: project.entries,
    created_at: project.createdAt,
    updated_at: project.updatedAt || now,
  }))

  const { data: existingProjects, error: fetchError } = await supabase
    .from('weight_projects')
    .select('id')
    .eq('user_id', userId)

  if (fetchError) throw fetchError

  const localIds = new Set(projects.map((project) => project.id))
  const idsToDelete = (existingProjects ?? [])
    .map((row) => row.id as string)
    .filter((id) => !localIds.has(id))

  if (projectRows.length > 0) {
    const { error: upsertError } = await supabase
      .from('weight_projects')
      .upsert(projectRows, { onConflict: 'id' })

    if (upsertError) throw upsertError
  }

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('weight_projects')
      .delete()
      .in('id', idsToDelete)

    if (deleteError) throw deleteError
  }

  const { error: settingsError } = await supabase.from('user_settings').upsert(
    {
      user_id: userId,
      settings,
      updated_at: now,
    },
    { onConflict: 'user_id' },
  )

  if (settingsError) throw settingsError
}

export function mergeProjects(local: WeightProject[], cloud: WeightProject[]): WeightProject[] {
  const merged = new Map<string, WeightProject>()

  for (const project of local) {
    merged.set(project.id, project)
  }

  for (const cloudProject of cloud) {
    const localProject = merged.get(cloudProject.id)
    if (!localProject) {
      merged.set(cloudProject.id, cloudProject)
      continue
    }

    const localUpdated = localProject.updatedAt || localProject.createdAt
    const cloudUpdated = cloudProject.updatedAt || cloudProject.createdAt
    merged.set(
      cloudProject.id,
      localUpdated >= cloudUpdated ? localProject : cloudProject,
    )
  }

  return [...merged.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function mergeSettings(
  local: AppSettings,
  cloud: AppSettings | null,
  localUpdatedAt: string | null,
  cloudUpdatedAt: string | null,
): AppSettings {
  if (!cloud) return local
  if (!localUpdatedAt) return cloud
  if (!cloudUpdatedAt) return local
  return localUpdatedAt >= cloudUpdatedAt ? local : cloud
}

export function ensureActiveProject(projects: WeightProject[], settings: AppSettings): AppSettings {
  const activeExists = projects.some((project) => project.id === settings.activeProjectId)
  return {
    ...settings,
    activeProjectId: activeExists ? settings.activeProjectId : (projects[0]?.id ?? ''),
  }
}
