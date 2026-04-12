// src/engine/behaviorEngine.js
// Main orchestrator: daily reset, mode detection, task generation
// Now integrates session-aware task building

// ESM orchestrator
import { loadData, saveData, today }    from '../data/storage.js'
import { determineMode, updatePriority } from './adaptiveSystem.js'
import { generateTasks }                 from './taskGenerator.js'
import { buildSessionTask }              from './sessionEngine.js'
import { applyDailyDecay, recordStreakActivity } from './momentumEngine.js'

export function bootEngine() {
  let data = loadData()
  data     = applyDailyDecay(data)

  if (data.lastReset !== today()) {
    const mode  = determineMode(data)
    const raw   = generateTasks(data.activities, mode)
    data.tasks  = raw.map(t => buildSessionTask(t, mode, data))
    data.lastReset = today()
    saveData(data)
  }

  const mode  = determineMode(data)
  return { data, tasks: data.tasks || [], mode }
}

export function loadCurrentState() {
  const data = loadData()
  return { data, tasks: data.tasks || [], mode: determineMode(data) }
}

export function updateTaskState(taskId, patch) {
  const data = loadData()
  data.tasks = (data.tasks || []).map(t => t.id === taskId ? { ...t, ...patch } : t)
  saveData(data)
  return loadCurrentState()
}

export function resolveTask(taskId, status) {
  const data = loadData()
  const task = (data.tasks || []).find(t => t.id === taskId)
  if (!task) return loadCurrentState()

  data.tasks = data.tasks.map(t =>
    t.id === taskId ? { ...t, status, state: status === 'done' ? 'done' : 'idle' } : t
  )
  data.history.push({ date: today(), taskName: task.name, status, duration: task.duration })
  data.activities = updatePriority(data, task.activity || task.name, status)

  if (status === 'done') {
    const updated = recordStreakActivity(data)
    Object.assign(data, updated)
  }

  saveData(data)
  return loadCurrentState()
}

export function regenerateTasks() {
  const data = loadData()
  const mode = determineMode(data)
  const raw  = generateTasks(data.activities, mode)
  data.tasks = raw.map(t => buildSessionTask(t, mode, data))
  saveData(data)
  return loadCurrentState()
}

export function saveActivity(activity) {
  const data = loadData()
  const idx  = data.activities.findIndex(a => a.name === activity.name)
  if (idx >= 0) data.activities[idx] = activity
  else data.activities.push(activity)
  saveData(data)
  return data
}

export function deleteActivity(name) {
  const data = loadData()
  data.activities = data.activities.filter(a => a.name !== name)
  saveData(data)
  return data
}