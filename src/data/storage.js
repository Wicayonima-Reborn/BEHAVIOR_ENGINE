// src/data/storage.js
// Offline-first local storage layer

const STORAGE_KEY = 'behavior_engine_v1'

const DEFAULT_DATA = {
  activities: [],
  history: [],     // [{ date, taskName, status: 'done'|'skip', duration }]
  settings: {
    pomodoroDefault: 25,
    pomodoroLazy: 10,
    skipThreshold: 3,   // skip berturut-turut → lazy mode
    focusThreshold: 5   // done berturut-turut → focus mode
  },
  lastReset: null  // ISO date string
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_DATA)
    return { ...structuredClone(DEFAULT_DATA), ...JSON.parse(raw) }
  } catch {
    return structuredClone(DEFAULT_DATA)
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function resetData() {
  localStorage.removeItem(STORAGE_KEY)
  return structuredClone(DEFAULT_DATA)
}

// Helpers
export function getTodayStr() {
  return new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
}

export function getRecentHistory(data, days = 7) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return data.history.filter(h => new Date(h.date) >= cutoff)
}