// ESM — session state machine + timestamp-based timer
import { loadData, saveData, today }       from '../data/storage.js'
import { buildSessionTask, handleInterrupt,
         handleSessionComplete, startNextSession } from './sessionEngine.js'
import { updateMomentum }                  from './momentumEngine.js'
import { updatePriority }                  from './adaptiveSystem.js'
import { determineMode }                   from './adaptiveSystem.js'
import { recordStreakActivity }            from './momentumEngine.js'

const TRANSITION_MS = 1200

export function createSessionController() {
  let handle       = null
  let activeId     = null
  let lastTick     = 0

  // UI callbacks — set via window.__BE_UI__ at runtime
  const ui = () => window.__BE_UI__ || {}

  // ── PUBLIC API ────────────────────────────────────────

  function start(taskId, mini) {
    _clear()
    const data = loadData()
    const mode = determineMode(data)
    let task   = (data.tasks || []).find(t => t.id === taskId)
    if (!task) return

    if (!task.sessions?.length) task = buildSessionTask(task, mode, data)
    if (mini && task.sessions[task.currentSession] > 5) {
      task = { ...task, sessions: task.sessions.map((s, i) => i === task.currentSession ? 5 : s) }
    }

    activeId = taskId
    const live = { ...task, state: 'running', remainingSeconds: task.sessions[task.currentSession] * 60 }
    _persist(live)
    ui().onStateChange?.(live)
    _tick(live)
  }

  function resume(taskId) {
    _clear()
    const data = loadData()
    const task = (data.tasks || []).find(t => t.id === taskId)
    if (!task) return
    activeId = taskId
    ui().onStateChange?.(task)
    _tick(task)
  }

  function restore(task) {
    _clear()
    activeId = task.id
    _tick(task)
  }

  function interrupt() {
    _clear()
    const task = _activeTask()
    if (!task) return
    const updated = { ...handleInterrupt(task), state: 'idle', momentum: updateMomentum(task.momentum ?? 0, 'interrupt') }
    _persist(updated)
    activeId = null
  }

  function completeEarly() {
    _clear()
    const task = _activeTask()
    if (task) _sessionDone(task)
  }

  function skipBreak() {
    _clear()
    const task = _activeTask()
    if (!task) return
    const next = startNextSession(task)
    _persist(next)
    ui().onStateChange?.(next)
    _tick(next)
  }

  function abandon(taskId) {
    _clear()
    _resolve(taskId, 'skip')
    activeId = null
  }

  function skipTask(taskId) {
    _clear()
    _resolve(taskId, 'skip')
    if (activeId === taskId) activeId = null
  }

  function reset(taskId) {
    _clear()
    const data = loadData()
    const mode = determineMode(data)
    const task = (data.tasks || []).find(t => t.id === taskId)
    if (!task) return
    const fresh = buildSessionTask(task, mode, data)
    _persist(fresh)
    if (activeId === taskId) activeId = null
  }

  // ── TICK ENGINE ────────────────────────────────────────

  function _tick(initial) {
    let current = { ...initial }
    lastTick = Date.now()

    handle = setInterval(() => {
      const now     = Date.now()
      const elapsed = Math.floor((now - lastTick) / 1000)
      if (elapsed < 1) return
      lastTick = now

      current = { ...current, remainingSeconds: Math.max(0, (current.remainingSeconds ?? 0) - elapsed) }

      if (current.remainingSeconds <= 0) {
        clearInterval(handle); handle = null
        if (current.state === 'running') {
          _sessionDone(current)
        } else if (current.state === 'break') {
          const next = startNextSession(current)
          _persist(next)
          ui().onStateChange?.(next)
          _tick(next)
        }
        return
      }

      // Persist every 5s for resume accuracy
      if (current.remainingSeconds % 5 === 0) _persist(current)
      ui().onTick?.(current)
    }, 1000)
  }

  function _sessionDone(task) {
    let updated = handleSessionComplete(task)
    updated = { ...updated, momentum: updateMomentum(task.momentum ?? 0, 'complete') }

    if (updated.state === 'done') {
      _resolve(task.id, 'done')
      ui().onTaskDone?.(updated)
      activeId = null
      return
    }

    ui().onSessionComplete?.(updated)

    // Transition pause
    const transitioning = { ...updated, state: 'transition' }
    _persist(transitioning)
    ui().onStateChange?.(transitioning)

    setTimeout(() => {
      _persist(updated)
      ui().onStateChange?.(updated)
      _tick(updated)
    }, TRANSITION_MS)
  }

  // ── HELPERS ────────────────────────────────────────────

  function _activeTask() {
    if (!activeId) return null
    return (loadData().tasks || []).find(t => t.id === activeId) || null
  }

  function _persist(task) {
    const data = loadData()
    data.tasks = (data.tasks || []).map(t => t.id === task.id ? { ...t, ...task } : t)
    saveData(data)
  }

  function _resolve(taskId, status) {
    const data = loadData()
    const task = (data.tasks || []).find(t => t.id === taskId)
    if (!task) return
    data.tasks = data.tasks.map(t =>
      t.id === taskId ? { ...t, status, state: status === 'done' ? 'done' : 'idle' } : t
    )
    data.history.push({ date: today(), taskName: task.name, status, duration: task.duration })
    data.activities = updatePriority(data, task.activity || task.name, status)
    if (status === 'done') Object.assign(data, recordStreakActivity(data))
    saveData(data)
  }

  function _clear() {
    if (handle) { clearInterval(handle); handle = null }
  }

  return { start, resume, restore, interrupt, completeEarly, skipBreak, abandon, skipTask, reset }
}