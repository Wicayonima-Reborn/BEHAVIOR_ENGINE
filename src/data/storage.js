// src/data/storage.js
// Offline-first local storage layer

// ESM — renderer process only
const KEY = 'be_v2'

const DEFAULTS = {
  activities:  [],
  history:     [],
  tasks:       [],
  habits:      [],
  settings:    { pomodoroDefault: 25, pomodoroLazy: 10, skipThreshold: 3, focusThreshold: 5 },
  streakData:  { streak: 0, lastActiveDate: null, longestStreak: 0 },
  lastReset:   null,
  lastDecay:   null
}

export function loadData() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(DEFAULTS)
    return Object.assign(structuredClone(DEFAULTS), JSON.parse(raw))
  } catch { return structuredClone(DEFAULTS) }
}

export function getTodayStr() {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

export function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}

export function yesterday() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}