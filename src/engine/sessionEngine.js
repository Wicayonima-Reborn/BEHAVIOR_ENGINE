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
// ESM — pure logic, no DOM, no Electron
export function generateSessions(totalMinutes, mode, skipRate) {
  let base = mode === 'lazy' ? 10 : mode === 'focus' ? 30 : 25
  if (skipRate > 0.6) base = 5
  else if (skipRate > 0.4) base = Math.min(base, 10)
  if (totalMinutes <= base) return [totalMinutes]
  const out = []
  let rem = totalMinutes
  while (rem > 0) { const s = Math.min(base, rem); out.push(s); rem -= s }
  return out
}

export function getBreakDuration(completedSessions, mode) {
  if (mode === 'lazy')  return 3
  if (mode === 'focus') return 5
  return completedSessions > 0 && completedSessions % 3 === 0 ? 15 : 5
}

export function calcSkipRate(data) {
  const recent = (data.history || []).slice(-10)
  if (!recent.length) return 0
  return recent.filter(h => h.status === 'skip').length / recent.length
}

export function buildSessionTask(raw, mode, data) {
  const skipRate = calcSkipRate(data)
  const sessions = generateSessions(raw.duration, mode, skipRate)
  return {
    ...raw,
    total: raw.duration,
    sessions,
    currentSession:    0,
    completedSessions: 0,
    mode,
    momentum: raw.momentum ?? 0,
    stats: { completed: 0, skipped: 0, streak: 0 },
    state: 'idle',
    remainingSeconds: sessions[0] * 60
  }
}

export function handleInterrupt(task) {
  const stats = { ...task.stats, skipped: (task.stats?.skipped || 0) + 1 }
  const next  = task.currentSession + 1
  const sessions = task.sessions.map((s, i) =>
    i === next ? Math.max(5, Math.round(s * 0.7)) : s
  )
  const mode = stats.skipped >= 2 ? 'lazy' : task.mode
  return { ...task, stats, sessions, mode }
}

export function handleSessionComplete(task) {
  const stats = {
    completed: (task.stats?.completed || 0) + 1,
    skipped:   task.stats?.skipped   || 0,
    streak:    (task.stats?.streak   || 0) + 1
  }
  const completedSessions = (task.completedSessions || 0) + 1
  const currentSession    = (task.currentSession    || 0) + 1
  let mode     = task.mode
  let sessions = task.sessions

  if (stats.completed >= 3 && mode !== 'focus') {
    mode     = 'focus'
    sessions = sessions.map((s, i) => i >= currentSession ? Math.min(45, Math.round(s * 1.1)) : s)
  }

  if (currentSession >= sessions.length) {
    return { ...task, stats, sessions, completedSessions, currentSession, mode, state: 'done', status: 'done' }
  }

  const breakSecs = getBreakDuration(completedSessions, mode) * 60
  return { ...task, stats, sessions, completedSessions, currentSession, mode, state: 'break', remainingSeconds: breakSecs }
}

export function startNextSession(task) {
  const dur = task.sessions[task.currentSession] || 25
  return { ...task, state: 'running', remainingSeconds: dur * 60 }
}

export function detectResumable(tasks) {
  const t = (tasks || []).find(t =>
    (t.state === 'running' || t.state === 'break') && t.status !== 'done' && t.status !== 'skip'
  )
  if (!t) return null
  return {
    task:         t,
    sessionLabel: `Sesi ${(t.currentSession || 0) + 1} / ${t.sessions?.length || 1}`,
    isBreak:      t.state === 'break'
  }
}

export function getSessionProgress(task) {
  return {
    total:     task.sessions?.length    ?? 1,
    completed: task.completedSessions   ?? 0,
    current:   task.currentSession      ?? 0
  }
}