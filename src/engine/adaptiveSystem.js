// src/engine/adaptiveSystem.js
// Determines mode: 'normal' | 'lazy' | 'focus'
// and adjusts activity priorities based on history

// ESM
import { today, yesterday } from '../data/storage.js'

export function determineMode(data) {
  const recent = recentHistory(data, 3)
  if (recent.length === 0) return 'normal'
  const skipped = recent.filter(h => h.status === 'skip').length
  const done    = recent.filter(h => h.status === 'done').length
  const { skipThreshold = 3, focusThreshold = 5 } = data.settings || {}
  if (skipped >= skipThreshold)  return 'lazy'
  if (done    >= focusThreshold) return 'focus'
  return 'normal'
}

export function updatePriority(data, activityName, status) {
  return data.activities.map(a => {
    if (a.name !== activityName) return a
    let p = a.priority
    if (status === 'done') p = Math.min(5, p + 0.5)
    if (status === 'skip') p = Math.max(1, p - 0.5)
    return { ...a, priority: Math.round(p * 10) / 10 }
  })
}

function recentHistory(data, days) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return (data.history || []).filter(h => new Date(h.date) >= cutoff)
}