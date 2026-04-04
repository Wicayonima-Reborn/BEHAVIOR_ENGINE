// src/engine/behaviorEngine.js
// Main orchestrator: daily reset, mode determination, task generation

import { loadData, saveData, getTodayStr } from '../data/storage.js'
import { determineMode, updatePriority }    from './adaptiveSystem.js'
import { generateTasks }                    from './taskGenerator.js'

/**
 * Bootstrap the engine on app start.
 * Handles daily reset, mode detection, task generation.
 * @returns {{ data, tasks, mode }}
 */
export function bootEngine() {
  let data  = loadData()
  const today = getTodayStr()

  // Daily reset: regenerate tasks if date has changed
  if (data.lastReset !== today) {
    data.tasks     = generateTasks(data.activities, determineMode(data))
    data.lastReset = today
    saveData(data)
  }

  const mode  = determineMode(data)
  const tasks = data.tasks || []

  return { data, tasks, mode }
}

/**
 * Mark a task as done or skipped.
 * Updates history, priority, persists data.
 * @param {string} taskId
 * @param {'done'|'skip'} status
 * @returns {{ data, tasks, mode }}
 */
export function resolveTask(taskId, status) {
  let data  = loadData()
  const task = (data.tasks || []).find(t => t.id === taskId)
  if (!task) return { data, tasks: data.tasks, mode: determineMode(data) }

  // Update task status
  data.tasks = data.tasks.map(t => t.id === taskId ? { ...t, status } : t)

  // Append to history
  data.history.push({
    date:     getTodayStr(),
    taskName: task.name,
    status,
    duration: task.duration
  })

  // Recalculate priority
  data.activities = updatePriority(data, task.activity, status)

  saveData(data)
  const mode = determineMode(data)
  return { data, tasks: data.tasks, mode }
}

/**
 * Save a new activity (from settings).
 */
export function saveActivity(activity) {
  const data = loadData()
  const exists = data.activities.findIndex(a => a.name === activity.name)
  if (exists >= 0) {
    data.activities[exists] = activity
  } else {
    data.activities.push(activity)
  }
  saveData(data)
  return data
}

/**
 * Delete an activity by name.
 */
export function deleteActivity(name) {
  const data = loadData()
  data.activities = data.activities.filter(a => a.name !== name)
  saveData(data)
  return data
}

/**
 * Force-regenerate today's tasks (manual refresh).
 */
export function regenerateTasks() {
  const data  = loadData()
  const mode  = determineMode(data)
  data.tasks  = generateTasks(data.activities, mode)
  saveData(data)
  return { data, tasks: data.tasks, mode }
}