// src/engine/adaptiveSystem.js
// Determines mode: 'normal' | 'lazy' | 'focus'
// and adjusts activity priorities based on history

import { getRecentHistory } from '../data/storage.js'

/**
 * Determine current mode based on recent task history.
 * @param {object} data - full app data
 * @returns {'normal'|'lazy'|'focus'}
 */
export function determineMode(data) {
  const { settings } = data
  const recent = getRecentHistory(data, 3) // last 3 days

  if (recent.length === 0) return 'normal'

  const skipped = recent.filter(h => h.status === 'skip').length
  const done    = recent.filter(h => h.status === 'done').length

  if (skipped >= settings.skipThreshold)  return 'lazy'
  if (done   >= settings.focusThreshold)  return 'focus'
  return 'normal'
}

/**
 * Update activity priority based on recent performance.
 * Called after each task completion or skip.
 * @param {object} data
 * @param {string} activityName
 * @param {'done'|'skip'} status
 * @returns updated activities array
 */
export function updatePriority(data, activityName, status) {
  return data.activities.map(act => {
    if (act.name !== activityName) return act
    let priority = act.priority

    if (status === 'done') priority = Math.min(5, priority + 0.5)
    if (status === 'skip') priority = Math.max(1, priority - 0.5)

    return { ...act, priority: Math.round(priority * 10) / 10 }
  })
}