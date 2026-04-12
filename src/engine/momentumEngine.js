// ESM — momentum + streak, no DOM, no Electron
import { today, yesterday } from '../data/storage.js'

export function updateMomentum(current, event) {
  const delta = { complete: 0.8, interrupt: -0.4, skip: -0.6, decay: -0.2 }[event] ?? 0
  return Math.min(5, Math.max(0, parseFloat((current + delta).toFixed(2))))
}

export function getStreakState(data) {
  const sd = data.streakData || {}
  if (!sd.streak) return 'none'
  if (sd.lastActiveDate === today())     return 'active'
  if (sd.lastActiveDate === yesterday()) return 'fragile'
  return 'none'
}

export function recordStreakActivity(data) {
  const sd = data.streakData || { streak: 0, lastActiveDate: null, longestStreak: 0 }
  let streak = sd.streak
  if      (sd.lastActiveDate === today())     { /* already done */ }
  else if (sd.lastActiveDate === yesterday()) { streak++ }
  else                                        { streak = 1 }
  return {
    ...data,
    streakData: { streak, lastActiveDate: today(), longestStreak: Math.max(streak, sd.longestStreak || 0) }
  }
}

export function applyDailyDecay(data) {
  if (data.lastDecay === today()) return data
  const tasks = (data.tasks || []).map(t => ({
    ...t, momentum: updateMomentum(t.momentum ?? 0, 'decay')
  }))
  return { ...data, tasks, lastDecay: today() }
}