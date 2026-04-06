// src/engine/behaviorEngine.js
// Main orchestrator: daily reset, mode detection, task generation
// Now integrates session-aware task building

import { loadData, saveData, getTodayStr } from '../data/storage.js'
import { determineMode, updatePriority }    from './adaptiveSystem.js'
import { generateTasks }                    from './taskGenerator.js'
import { buildSessionTask, calcSkipRate }   from './sessionEngine.js'

// ─────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────

/**
 * Bootstrap engine on app start.
 * Handles daily reset, mode, session task building.
 */
export function bootEngine() {
  let data  = loadData()
  const today = getTodayStr()

  if (data.lastReset !== today) {
    const mode  = determineMode(data)
    const raw   = generateTasks(data.activities, mode)
    data.tasks  = raw.map(t => buildSessionTask(t, mode, data))
    data.lastReset = today
    saveData(data)
  }

  const mode  = determineMode(data)
  const tasks = data.tasks || []

  return { data, tasks, mode }
}

// ─────────────────────────────────────────
// RESOLVE TASK (done / skip)
// ─────────────────────────────────────────

/**
 * Mark a task as done or skipped (final resolution).
 * Updates history, priority, persists data.
 */
export function resolveTask(taskId, status) {
  let data  = loadData()
  const task = (data.tasks || []).find(t => t.id === taskId)
  if (!task) return { data, tasks: data.tasks, mode: determineMode(data) }

  data.tasks = data.tasks.map(t =>
    t.id === taskId ? { ...t, status, state: status === 'done' ? 'done' : 'idle' } : t
  )

  data.history.push({
    date:     getTodayStr(),
    taskName: task.name,
    status,
    duration: task.duration
  })

  data.activities = updatePriority(data, task.activity, status)
  saveData(data)

  const mode = determineMode(data)
  return { data, tasks: data.tasks, mode }
}

// ─────────────────────────────────────────
// UPDATE TASK STATE (session progress)
// ─────────────────────────────────────────

/**
 * Persist updated session state for a task.
 * Called by taskView after each session event.
 */
export function updateTaskState(taskId, updatedTask) {
  const data = loadData()
  data.tasks = (data.tasks || []).map(t =>
    t.id === taskId ? { ...t, ...updatedTask } : t
  )
  saveData(data)
  return { data, tasks: data.tasks, mode: determineMode(data) }
}

// ─────────────────────────────────────────
// ACTIVITY MANAGEMENT
// ─────────────────────────────────────────

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

// ─────────────────────────────────────────
// REGENERATE
// ─────────────────────────────────────────

/**
 * Load current state without mutation (for refreshList fallback).
 */
export function loadCurrentState() {
  const data = loadData()
  const mode = determineMode(data)
  return { data, tasks: data.tasks || [], mode }
}

export function regenerateTasks() {
  const data = loadData()
  const mode = determineMode(data)
  const raw  = generateTasks(data.activities, mode)
  data.tasks = raw.map(t => buildSessionTask(t, mode, data))
  saveData(data)
  return { data, tasks: data.tasks, mode }
}