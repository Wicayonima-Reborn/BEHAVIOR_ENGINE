// src/engine/taskGenerator.js
// Generates daily task list from activities + mode

/**
 * Generate tasks for today based on activities and current mode.
 * @param {Array}  activities  - from data.activities
 * @param {'normal'|'lazy'|'focus'} mode
 * @returns {Array} tasks
 */
// ESM
export function generateTasks(activities, mode) {
  if (!activities || activities.length === 0) return []
  const sorted = [...activities].sort((a, b) => b.priority - a.priority)
  const limits = { normal: sorted.length, lazy: Math.max(1, Math.ceil(sorted.length / 2)), focus: sorted.length }
  return sorted.slice(0, limits[mode] ?? sorted.length).map((act, i) => ({
    id:       `task-${Date.now()}-${i}`,
    name:     act.name,
    activity: act.name,
    duration: randInt(mode === 'lazy' ? Math.min(10, act.min) : act.min, mode === 'lazy' ? Math.min(15, act.max) : act.max),
    status:   'pending',
    state:    'idle'
  }))
}

function randInt(min, max) {
  min = Math.max(1, min); max = Math.max(min, max)
  return Math.floor(Math.random() * (max - min + 1)) + min
}