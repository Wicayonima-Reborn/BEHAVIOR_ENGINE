// src/engine/taskGenerator.js
// Generates daily task list from activities + mode

/**
 * Generate tasks for today based on activities and current mode.
 * @param {Array}  activities  - from data.activities
 * @param {'normal'|'lazy'|'focus'} mode
 * @returns {Array} tasks
 */
export function generateTasks(activities, mode) {
  if (!activities || activities.length === 0) return []

  // Sort by priority descending
  const sorted = [...activities].sort((a, b) => b.priority - a.priority)

  // How many tasks to show per mode
  const limits = { normal: sorted.length, lazy: Math.ceil(sorted.length / 2), focus: sorted.length }
  const limit  = limits[mode] ?? sorted.length
  const selected = sorted.slice(0, limit)

  return selected.map((act, idx) => ({
    id:       `task-${Date.now()}-${idx}`,
    name:     act.name,
    duration: assignDuration(act, mode), // in minutes
    status:   'pending',  // 'pending' | 'done' | 'skip' | 'active'
    activity: act.name
  }))
}

/**
 * Assign duration based on mode and activity min/max.
 */
function assignDuration(activity, mode) {
  const { min = 25, max = 60 } = activity

  if (mode === 'lazy') {
    // Clamp ke range 5–15 menit di lazy mode
    const lazyMax = Math.min(15, max)
    const lazyMin = Math.min(5, min)
    return randInt(lazyMin, lazyMax)
  }

  if (mode === 'focus') {
    // Sedikit lebih panjang dari normal
    const focusMin = Math.round(min * 1.1)
    const focusMax = Math.round(max * 1.1)
    return randInt(focusMin, focusMax)
  }

  return randInt(min, max)
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}