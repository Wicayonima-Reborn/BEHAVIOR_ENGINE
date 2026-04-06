// src/engine/sessionEngine.js
// Adaptive session generator + state machine + resume system

import { loadData, saveData, getTodayStr } from '../data/storage.js'

// ─────────────────────────────────────────
// SESSION GENERATOR
// ─────────────────────────────────────────

/**
 * Generate adaptive sessions.
 * @param {number} totalMinutes
 * @param {'normal'|'lazy'|'focus'} mode
 * @param {{ skipRate: number }} userState
 * @returns {number[]}
 */
export function generateSessions(totalMinutes, mode, userState = { skipRate: 0 }) {
  let baseSize = 25
  if (mode === 'lazy')  baseSize = 10
  if (mode === 'focus') baseSize = 30

  // Heavy skipper → shrink aggressively
  if (userState.skipRate > 0.6) baseSize = 5
  else if (userState.skipRate > 0.4) baseSize = Math.min(baseSize, 10)

  // Edge: very short task
  if (totalMinutes <= baseSize) return [totalMinutes]

  const sessions = []
  let remaining = totalMinutes
  while (remaining > 0) {
    const size = Math.min(baseSize, remaining)
    sessions.push(size)
    remaining -= size
  }
  return sessions
}

// ─────────────────────────────────────────
// BREAK DURATION
// ─────────────────────────────────────────

/**
 * @param {number} completedSessions
 * @param {'normal'|'lazy'|'focus'} mode
 * @returns {number} minutes
 */
export function getBreakDuration(completedSessions, mode) {
  if (mode === 'lazy')  return 3
  if (mode === 'focus') return 5
  if (completedSessions > 0 && completedSessions % 3 === 0) return 15
  return 5
}

// ─────────────────────────────────────────
// SKIP RATE
// ─────────────────────────────────────────

export function calcSkipRate(data) {
  const recent = (data.history || []).slice(-10)
  if (recent.length === 0) return 0
  const skipped = recent.filter(h => h.status === 'skip').length
  return skipped / recent.length
}

// ─────────────────────────────────────────
// BUILD SESSION TASK
// ─────────────────────────────────────────

/**
 * Enrich a raw task with full session state.
 */
export function buildSessionTask(task, mode, data) {
  const skipRate = calcSkipRate(data)
  const sessions = generateSessions(task.duration, mode, { skipRate })

  return {
    ...task,
    total:             task.duration,
    sessions,
    currentSession:    0,
    completedSessions: 0,
    mode,
    stats: { completed: 0, skipped: 0, streak: 0 },
    state:            'idle',
    remainingSeconds: sessions[0] * 60
  }
}

// ─────────────────────────────────────────
// STATE TRANSITIONS
// ─────────────────────────────────────────

/** User interrupted / stopped mid-session */
export function handleInterrupt(task) {
  const updated = {
    ...task,
    stats: { ...task.stats, skipped: task.stats.skipped + 1 }
  }

  // Shrink next session by 30%
  const nextIdx = task.currentSession + 1
  if (nextIdx < updated.sessions.length) {
    updated.sessions = updated.sessions.map((s, i) =>
      i === nextIdx ? Math.max(5, Math.round(s * 0.7)) : s
    )
  }

  // Auto-downgrade mode
  if (updated.stats.skipped >= 2 && updated.mode !== 'lazy') {
    updated.mode = 'lazy'
  }

  return updated
}

/** Session timer completed naturally */
export function handleSessionComplete(task) {
  const updated = {
    ...task,
    stats: {
      ...task.stats,
      completed: task.stats.completed + 1,
      streak:    task.stats.streak    + 1
    },
    completedSessions: task.completedSessions + 1,
    currentSession:    task.currentSession    + 1
  }

  // Auto-upgrade mode on streak
  if (updated.stats.completed >= 3 && updated.mode !== 'focus') {
    updated.mode = 'focus'
    // Grow remaining sessions slightly
    const next = updated.currentSession
    updated.sessions = updated.sessions.map((s, i) =>
      i >= next ? Math.min(45, Math.round(s * 1.1)) : s
    )
  }

  // All sessions done?
  if (updated.currentSession >= updated.sessions.length) {
    return { ...updated, state: 'done', status: 'done' }
  }

  // Go to break
  const breakSecs = getBreakDuration(updated.completedSessions, updated.mode) * 60
  return { ...updated, state: 'break', remainingSeconds: breakSecs }
}

/** Break over → start next running session */
export function startNextSession(task) {
  const dur = task.sessions[task.currentSession] || 25
  return {
    ...task,
    state:            'running',
    remainingSeconds: dur * 60
  }
}

// ─────────────────────────────────────────
// RESUME DETECTION
// ─────────────────────────────────────────

/**
 * Check if any task has an in-progress session state.
 * Returns task + resume info or null.
 */
export function detectResumable(tasks) {
  const t = (tasks || []).find(t =>
    (t.state === 'running' || t.state === 'break') &&
    t.status !== 'done' && t.status !== 'skip'
  )
  if (!t) return null

  return {
    task: t,
    sessionLabel: `Sesi ${t.currentSession + 1} / ${t.sessions?.length || 1}`,
    isBreak: t.state === 'break'
  }
}

// ─────────────────────────────────────────
// PERSIST
// ─────────────────────────────────────────

export function saveSessionState(taskId, patch) {
  const data = loadData()
  data.tasks = (data.tasks || []).map(t =>
    t.id === taskId ? { ...t, ...patch } : t
  )
  saveData(data)
}

// ─────────────────────────────────────────
// PROGRESS HELPER
// ─────────────────────────────────────────

export function getSessionProgress(task) {
  return {
    total:     task.sessions?.length    ?? 1,
    completed: task.completedSessions   ?? 0,
    current:   task.currentSession      ?? 0
  }
}