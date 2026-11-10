import { useMemo, useState } from 'react'
import { format, parseISO, startOfWeek } from 'date-fns'
import { WeightChart } from './components/WeightChart'
import { CloudSyncPanel } from './components/CloudSyncPanel'
import { useWeightStorage } from './useStorage'
import type { Phase } from './types'
import {
  formatWeightChange,
  getAverageWeeklyChange,
  getEntriesInRange,
  getWeekOverWeekChange,
  getRollingWeeklyAverage,
  getTodayString,
  getWeeklyAverages,
  getWeeklyBreakdown,
} from './utils'
import './index.css'

function App() {
  const {
    projects,
    activeProject,
    entries,
    settings,
    addOrUpdateEntry,
    deleteEntry,
    updateSettings,
    switchProject,
    createProject,
    renameProject,
    updateProjectPhase,
    deleteProject,
    user,
    authLoading,
    isCloudConfigured,
    syncStatus,
    syncError,
    signUp,
    signIn,
    signOut,
    passwordRecovery,
    requestPasswordReset,
    updatePassword,
    dismissPasswordRecovery,
  } = useWeightStorage()

  const [date, setDate] = useState(getTodayString())
  const [weightInput, setWeightInput] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectPhase, setNewProjectPhase] = useState<Phase>('cutting')

  const phase = activeProject?.phase ?? 'cutting'
  const existingToday = entries.find((entry) => entry.date === date)

  const weeklyAverages = useMemo(
    () => getWeeklyAverages(entries, settings.weeksToAverage),
    [entries, settings.weeksToAverage],
  )

  const rollingAverage = useMemo(
    () => getRollingWeeklyAverage(weeklyAverages),
    [weeklyAverages],
  )

  const weekChange = useMemo(
    () => getWeekOverWeekChange(weeklyAverages),
    [weeklyAverages],
  )

  const avgWeeklyChange = useMemo(
    () => getAverageWeeklyChange(weeklyAverages),
    [weeklyAverages],
  )

  const weeklyBreakdown = useMemo(
    () => getWeeklyBreakdown(weeklyAverages),
    [weeklyAverages],
  )

  const rangeEntries = useMemo(
    () => getEntriesInRange(entries, settings.weeksToAverage),
    [entries, settings.weeksToAverage],
  )

  const chartData = useMemo(() => {
    const weekMap = new Map(weeklyAverages.map((week) => [week.weekStart, week.average]))

    return rangeEntries.map((entry) => {
      const weekStart = format(
        startOfWeek(parseISO(entry.date), { weekStartsOn: 1 }),
        'yyyy-MM-dd',
      )
      return {
        date: entry.date,
        weight: entry.weight,
        weeklyAvg: weekMap.get(weekStart) ?? null,
      }
    })
  }, [rangeEntries, weeklyAverages])

  const recentEntries = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14),
    [entries],
  )

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const weight = parseFloat(weightInput)
    if (Number.isNaN(weight) || weight <= 0) return
    addOrUpdateEntry(date, Math.round(weight * 10) / 10)
    setWeightInput('')
  }

  function handleEditEntry(entryDate: string, weight: number) {
    addOrUpdateEntry(entryDate, weight)
  }

  function handleCreateProject(event: React.FormEvent) {
    event.preventDefault()
    const created = createProject(newProjectName, newProjectPhase)
    if (!created) return
    setNewProjectName('')
    setNewProjectPhase('cutting')
    setShowNewProject(false)
  }

  function handleRenameProject() {
    if (!activeProject) return
    const next = prompt('Project name:', activeProject.name)
    if (next == null) return
    renameProject(activeProject.id, next)
  }

  function handleDeleteProject() {
    if (!activeProject || projects.length <= 1) return
    if (!confirm(`Delete project "${activeProject.name}" and all its entries?`)) return
    deleteProject(activeProject.id)
  }

  const goalHint =
    phase === 'bulking'
      ? 'Aim for a slow upward trend week over week.'
      : 'Aim for a slow downward trend week over week.'

  if (!activeProject) {
    return (
      <div className="app">
        <header className="header">
          <h1>Weight Tracker</h1>
          <p className="subtitle">Create a project to start tracking.</p>
        </header>
        <section className="card">
          <button type="button" className="primary-btn" onClick={() => setShowNewProject(true)}>
            Create first project
          </button>
        </section>
      </div>
    )
  }

  return (
    <div className={`app phase-${phase}`}>
      <header className="header">
        <div>
          <h1>Weight Tracker</h1>
          <p className="subtitle">Daily logs, weekly averages, long-term trends.</p>
        </div>
      </header>

      <section className="card project-card">
        <div className="section-header">
          <h2>Project</h2>
          <button type="button" className="text-btn" onClick={() => setShowNewProject((open) => !open)}>
            {showNewProject ? 'Cancel' : '+ New project'}
          </button>
        </div>

        <label className="project-select-label">
          Active project
          <select
            className="project-select"
            value={activeProject.id}
            onChange={(event) => switchProject(event.target.value)}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.phase})
              </option>
            ))}
          </select>
        </label>

        <div className="project-actions">
          <button type="button" className="chip" onClick={handleRenameProject}>
            Rename
          </button>
          {projects.length > 1 && (
            <button type="button" className="chip danger-chip" onClick={handleDeleteProject}>
              Delete project
            </button>
          )}
        </div>

        {showNewProject && (
          <form className="new-project-form" onSubmit={handleCreateProject}>
            <label>
              Project name
              <input
                type="text"
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                placeholder="e.g. Summer Cut 2026"
                required
              />
            </label>
            <label>
              Phase
              <select
                value={newProjectPhase}
                onChange={(event) => setNewProjectPhase(event.target.value as Phase)}
              >
                <option value="cutting">Cutting</option>
                <option value="bulking">Bulking</option>
              </select>
            </label>
            <button type="submit" className="primary-btn">
              Create project
            </button>
          </form>
        )}
      </section>

      <section className="card phase-card">
        <h2>Current phase</h2>
        <div className="phase-toggle" role="group" aria-label="Training phase">
          <button
            type="button"
            className={phase === 'cutting' ? 'active cutting' : ''}
            onClick={() => updateProjectPhase(activeProject.id, 'cutting')}
          >
            Cutting
          </button>
          <button
            type="button"
            className={phase === 'bulking' ? 'active bulking' : ''}
            onClick={() => updateProjectPhase(activeProject.id, 'bulking')}
          >
            Bulking
          </button>
        </div>
        <p className="hint">{goalHint}</p>
      </section>

      <section className="stats-grid">
        <div className="stat card">
          <span className="stat-label">Weekly average</span>
          <span className="stat-value">
            {rollingAverage != null ? `${rollingAverage} ${settings.unit}` : '—'}
          </span>
          <span className="stat-meta">
            Over last {settings.weeksToAverage} week{settings.weeksToAverage === 1 ? '' : 's'}
          </span>
        </div>
        <div className="stat card">
          <span className="stat-label">Latest change</span>
          <span className="stat-value">
            {weekChange != null ? formatWeightChange(weekChange, settings.unit) : '—'}
          </span>
          <span className="stat-meta">This week vs prior week</span>
        </div>
        <div className="stat card">
          <span className="stat-label">Avg weekly change</span>
          <span className="stat-value">
            {avgWeeklyChange != null
              ? `${formatWeightChange(avgWeeklyChange, settings.unit)}/wk`
              : '—'}
          </span>
          <span className="stat-meta">
            Over last {settings.weeksToAverage} week{settings.weeksToAverage === 1 ? '' : 's'}
          </span>
        </div>
        <div className="stat card">
          <span className="stat-label">Entries logged</span>
          <span className="stat-value">{entries.length}</span>
          <span className="stat-meta">In this project</span>
        </div>
      </section>

      <section className="card">
        <h2>Log weight</h2>
        <form className="log-form" onSubmit={handleSubmit}>
          <label>
            Date
            <input type="date" value={date} max={getTodayString()} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Weight ({settings.unit})
            <input
              type="number"
              step="0.1"
              min="1"
              placeholder={existingToday ? String(existingToday.weight) : 'e.g. 175.5'}
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="primary-btn">
            {existingToday ? 'Update entry' : 'Save entry'}
          </button>
        </form>
        <div className="unit-row">
          <span>Unit:</span>
          <button
            type="button"
            className={settings.unit === 'lb' ? 'chip active' : 'chip'}
            onClick={() => updateSettings({ unit: 'lb' })}
          >
            lb
          </button>
          <button
            type="button"
            className={settings.unit === 'kg' ? 'chip active' : 'chip'}
            onClick={() => updateSettings({ unit: 'kg' })}
          >
            kg
          </button>
        </div>
      </section>

      <section className="card">
        <div className="section-header">
          <h2>Trend chart</h2>
          <label className="weeks-control">
            Past
            <input
              type="number"
              min={1}
              max={52}
              value={settings.weeksToAverage}
              onChange={(e) =>
                updateSettings({
                  weeksToAverage: Math.min(52, Math.max(1, Number(e.target.value) || 1)),
                })
              }
            />
            weeks
          </label>
        </div>
        <WeightChart data={chartData} unit={settings.unit} phase={phase} />
      </section>

      {weeklyBreakdown.length > 0 && (
        <section className="card">
          <h2>Weekly breakdown</h2>
          <p className="hint">Week 1 is the oldest week in the selected range. Change is vs the previous week.</p>
          <div className="table-wrap">
            <table className="week-table">
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Started</th>
                  <th>Average</th>
                  <th>Change</th>
                  <th>Days</th>
                </tr>
              </thead>
              <tbody>
                {weeklyBreakdown.map((week) => (
                  <tr key={week.weekStart}>
                    <td>Week {week.weekNumber}</td>
                    <td>{week.weekLabel}</td>
                    <td>
                      {week.average} {settings.unit}
                    </td>
                    <td>
                      {week.changeFromPrevious == null
                        ? '—'
                        : formatWeightChange(week.changeFromPrevious, settings.unit)}
                    </td>
                    <td>{week.entryCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {recentEntries.length > 0 && (
        <section className="card">
          <h2>Recent entries</h2>
          <ul className="entry-list">
            {recentEntries.map((entry) => (
              <li key={entry.date}>
                <span>{format(parseISO(entry.date), 'EEE, MMM d')}</span>
                <span className="entry-actions">
                  <strong>
                    {entry.weight} {settings.unit}
                  </strong>
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => {
                      const next = prompt(`New weight for ${entry.date}:`, String(entry.weight))
                      if (next == null) return
                      const parsed = parseFloat(next)
                      if (!Number.isNaN(parsed) && parsed > 0) handleEditEntry(entry.date, parsed)
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-btn danger"
                    onClick={() => {
                      if (confirm(`Delete entry for ${entry.date}?`)) deleteEntry(entry.date)
                    }}
                  >
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CloudSyncPanel
        isConfigured={isCloudConfigured}
        userEmail={user?.email ?? null}
        authLoading={authLoading}
        passwordRecovery={passwordRecovery}
        syncStatus={syncStatus}
        syncError={syncError}
        onSignIn={signIn}
        onSignUp={signUp}
        onSignOut={signOut}
        onRequestPasswordReset={requestPasswordReset}
        onUpdatePassword={updatePassword}
        onDismissPasswordRecovery={dismissPasswordRecovery}
      />

      <footer className="footer">
        <p>
          Data is saved locally in your browser. Sign in to cloud sync to use the same projects on
          other devices.
        </p>
      </footer>
    </div>
  )
}

export default App
