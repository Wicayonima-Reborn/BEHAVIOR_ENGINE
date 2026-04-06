// src/engine/sessionEngine.js
// Adaptive session generator + state machine
// Task ≠ Execution. Task = tujuan. Session = sesi kecil adaptif.

import { loadData, saveData, getTodayStr } from '../data/storage.js'

// ─────────────────────────────────────────
// SESSION GENERATOR
// ─────────────────────────────────────────

/**
 * Generate adaptive sessions from task total duration.
 * @param {number} totalMinutes
 * @param {'normal'|'lazy'|'focus'} mode
 * @param {{ skipRate: number }} userState
 * @returns {number[]} array of session durations (minutes)
 */
export function generateSessions(totalMinutes, mode, userState = { skipRate: 0 }) {
  let baseSize = 25
  if (mode === 'lazy')  baseSize = 10
  if (mode === 'focus') baseSize = 30

  // Adapt dari skip rate
  if (userState.skipRate > 0.5) baseSize = 5

  // Edge case: sangat kecil
  if (totalMinutes <= 10) return [totalMinutes]

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
// BREAK SYSTEM
// ─────────────────────────────────────────

/**
 * Smart break duration based on session count + mode.
 * @param {number} completedSessions
 * @param {'normal'|'lazy'|'focus'} mode
 * @returns {number} break duration in minutes
 */
export function getBreakDuration(completedSessions, mode) {
  if (mode === 'lazy') return 3
  if (completedSessions > 0 && completedSessions % 3 === 0) return 15
  return 5
}

// ─────────────────────────────────────────
// SKIP RATE CALCULATOR
// ─────────────────────────────────────────

/**
 * Calculate skip rate from recent history.
 * @param {object} data
 * @returns {number} 0.0 – 1.0
 */
export function calcSkipRate(data) {
  const recent = (data.history || []).slice(-10)
  if (recent.length === 0) return 0
  const skipped = recent.filter(h => h.status === 'skip').length
  return skipped / recent.length
}

// ─────────────────────────────────────────
// TASK SESSION STATE — build / get / save
// ─────────────────────────────────────────

/**
 * Build a fresh session-aware task object.
 * @param {object} task - raw task from taskGenerator
 * @param {'normal'|'lazy'|'focus'} mode
 * @param {object} data - full app data
 * @returns {object} enriched task with session state
 */
export function buildSessionTask(task, mode, data) {
  const skipRate = calcSkipRate(data)
  const sessions = generateSessions(task.duration, mode, { skipRate })

  return {
    ...task,
    total:              task.duration,
    sessions,
    currentSession:     0,
    completedSessions:  0,
    mode,
    stats: {
      completed: 0,
      skipped:   0,
      streak:    0
    },
    state: 'idle',  // idle | running | break | done
    remainingSeconds: sessions[0] * 60
  }
}

/**
 * Persist session state for a single task.
 */
export function saveSessionState(taskId, sessionState) {
  const data = loadData()
  if (!data.tasks) return
  data.tasks = data.tasks.map(t =>
    t.id === taskId ? { ...t, ...sessionState } : t
  )
  saveData(data)
}

/**
 * Load session state for a task.
 */
export function loadSessionState(taskId) {
  const data = loadData()
  return (data.tasks || []).find(t => t.id === taskId) || null
}

// ─────────────────────────────────────────
// MID-SESSION ADAPTATION
// ─────────────────────────────────────────

/**
 * Shrink remaining sessions after an interrupt/skip.
 * @param {object} task
 * @returns {object} updated task
 */
export function handleInterrupt(task) {
  const updated = { ...task }
  updated.stats = { ...task.stats, skipped: task.stats.skipped + 1 }

  // Shrink next session if possible
  const nextIdx = task.currentSession + 1
  if (nextIdx < updated.sessions.length) {
    updated.sessions = updated.sessions.map((s, i) =>
      i === nextIdx ? Math.max(5, Math.round(s * 0.7)) : s
    )
  }

  // Switch to lazy if skipped >= 2
  if (updated.stats.skipped >= 2) {
    updated.mode = 'lazy'
  }

  return updated
}

/**
 * Grow next session after consistent completion.
 * @param {object} task
 * @returns {object} updated task
 */
export function handleSessionComplete(task) {
  const updated = { ...task }
  updated.stats = {
    ...task.stats,
    completed: task.stats.completed + 1,
    streak:    task.stats.streak    + 1
  }

  // Switch to focus if completed >= 3
  if (updated.stats.completed >= 3) {
    updated.mode = 'focus'
    // Grow next sessions slightly
    const nextIdx = task.currentSession + 1
    if (nextIdx < updated.sessions.length) {
      updated.sessions = updated.sessions.map((s, i) =>
        i >= nextIdx ? Math.min(45, Math.round(s * 1.1)) : s
      )
    }
  }

  updated.completedSessions = task.completedSessions + 1
  updated.currentSession    = task.currentSession    + 1

  // Check if all sessions done
  if (updated.currentSession >= updated.sessions.length) {
    updated.state  = 'done'
    updated.status = 'done'
  } else {
    updated.state             = 'break'
    updated.remainingSeconds  = getBreakDuration(updated.completedSessions, updated.mode) * 60
  }

  return updated
}

/**
 * Transition from break → next running session.
 */
export function startNextSession(task) {
  const nextDuration = task.sessions[task.currentSession]
  return {
    ...task,
    state:            'running',
    remainingSeconds: nextDuration * 60
  }
}

/**
 * Get progress bar segments for UI.
 * @param {object} task
 * @returns {{ total: number, completed: number, current: number }}
 */
export function getSessionProgress(task) {
  return {
    total:     task.sessions?.length    || 1,
    completed: task.completedSessions   || 0,
    current:   task.currentSession      || 0
  }
}