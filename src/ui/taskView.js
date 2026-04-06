// src/ui/taskView.js  — Behavior Engine V2
// Single Focus · Focus Atmosphere · Resume · Micro Feedback · Decision Simplification

import { resolveTask, updateTaskState }           from '../engine/behaviorEngine.js'
import { handleInterrupt, handleSessionComplete,
         startNextSession, getSessionProgress,
         getBreakDuration, detectResumable }       from '../engine/sessionEngine.js'
import { getFeynmanPrompt }                        from '../engine/mentalEngine.js'

// ─────────────────────────────────────────
// MODULE STATE
// ─────────────────────────────────────────

let timerInterval   = null
let antiResistTimer = null
let activeTaskId    = null
let _tasks          = []
let _mode           = 'normal'
let _onUpdate       = null
let _container      = null

const ANTI_RESIST_DELAY = 12000 // 12 sec before CTA

// Entry mental trigger per mode
const ENTRY_TONE = {
  normal : (dur) => `Fokus sesi ini aja. Cuma ${dur} menit.`,
  lazy   : (dur) => `Cuma ${dur} menit. Serius.`,
  focus  : (dur) => `${dur} menit. Zona aktif. Jangan buang momentum.`
}

// Break tone
const BREAK_TONE = {
  normal: 'Istirahat bentar. Jangan kabur.',
  lazy:   'Istirahat 3 menit. Oke, santai.',
  focus:  'Recharge sebentar. Lanjut lagi.'
}

// Completion micro-feedback
const DONE_LINES = [
  'Good. Lanjut dikit lagi.',
  'Satu sesi beres. Streak terjaga.',
  'Lu tetap jalan walau dikit.',
  'Progress tetap progress.',
  'Solid. Satu lagi?'
]

// ─────────────────────────────────────────
// RENDER ENTRY
// ─────────────────────────────────────────

export function renderTaskView(container, { tasks, mode }, onUpdate) {
  _tasks = tasks; _mode = mode; _onUpdate = onUpdate; _container = container

  const resumable = detectResumable(tasks)

  container.innerHTML = `
    <!-- Resume Banner -->
    <div class="resume-banner" id="resume-banner" style="display:none;"></div>

    <!-- Session Spotlight (hidden until active) -->
    <div class="spotlight-overlay" id="spotlight-overlay" style="display:none;"></div>

    <div class="tv-header">
      <h2 class="tv-title">Tasks</h2>
      <button class="btn btn-ghost btn-sm" id="btn-regenerate">↺ Refresh</button>
    </div>

    <!-- Micro Feedback Toast -->
    <div class="micro-toast" id="micro-toast"></div>

    <!-- Task List -->
    <div id="task-list-wrap">
      ${tasks.length === 0
        ? `<div class="card"><p class="empty-state">Belum ada task. Tambah aktivitas di <strong>Settings</strong>.</p></div>`
        : `<ul class="task-list" id="task-list">
            ${tasks.map(t => taskCardHTML(t)).join('')}
          </ul>`
      }
    </div>

    <!-- Feynman Modal -->
    <div class="feynman-overlay" id="feynman-overlay" style="display:none;">
      <div class="feynman-modal card anim-scale-in">
        <p class="feynman-label">✦ Feynman Check</p>
        <p class="feynman-text" id="feynman-text"></p>
        <div class="feynman-actions">
          <button class="btn btn-primary" id="feynman-close">Oke, ngerti 👍</button>
          <button class="btn btn-ghost"   id="feynman-skip">Lewati</button>
        </div>
      </div>
    </div>
  `

  injectStyles()
  bindGlobalEvents(container, tasks, mode, onUpdate)

  // Show resume banner if needed
  if (resumable) showResumeBanner(container, resumable, tasks, mode, onUpdate)
}

// ─────────────────────────────────────────
// TASK CARD HTML
// ─────────────────────────────────────────

function taskCardHTML(t) {
  const prog   = getSessionProgress(t)
  const isDone = t.state === 'done'  || t.status === 'done'
  const isSkip = t.status === 'skip'
  const isRun  = t.state === 'running'
  const isBrk  = t.state === 'break'
  const isDead = isDone || isSkip
  const taskMode = t.mode || 'normal'

  // Session segment blocks
  const segs = (t.sessions || [{ _: t.duration }]).map((_, i) => {
    const cls = i < prog.completed ? 'seg-done'
              : i === prog.current && isRun ? 'seg-active' : ''
    return `<div class="seg ${cls}"></div>`
  }).join('')

  // Current session duration label
  const curDur = t.sessions?.[prog.current] ?? t.duration

  return `
    <li class="task-card ${isDone ? 'tc-done' : ''} ${isRun || isBrk ? 'tc-active' : ''} ${isSkip ? 'tc-skip' : ''}"
        data-id="${t.id}" id="tc-${t.id}">

      <div class="tc-top">
        <div class="tc-check ${isDone ? 'checked' : ''}">${isDone ? '✓' : ''}</div>
        <div class="tc-info">
          <span class="tc-name">${t.name}</span>
          <div class="tc-meta-row">
            <span class="tc-total">${t.total ?? t.duration} mnt</span>
            ${t.sessions?.length > 1 ? `<span class="tc-segs-label">${prog.completed}/${prog.total} sesi</span>` : ''}
            <span class="tc-mode-chip chip-${taskMode}">${taskMode}</span>
          </div>
        </div>
        <div class="tc-status">
          ${isRun  ? `<span class="chip chip-run">● Running</span>` : ''}
          ${isBrk  ? `<span class="chip chip-break">☕ Break</span>` : ''}
          ${isDone ? `<span class="chip chip-done">✓ Done</span>` : ''}
          ${isSkip ? `<span class="chip chip-skip">Skip</span>` : ''}
        </div>
      </div>

      <!-- Segment progress bar -->
      ${t.sessions?.length > 1 || isRun || isBrk
        ? `<div class="seg-bar">${segs}</div>` : ''}

      <!-- Action buttons (only when idle & not dead) -->
      ${!isDead && !isRun && !isBrk ? `
        <div class="tc-actions">
          <button class="btn btn-primary tc-btn-start" data-action="start-full" data-id="${t.id}">
            ▶ Mulai ${curDur}m
          </button>
          ${curDur > 5 ? `
            <button class="btn btn-soft tc-btn-mini" data-action="start-mini" data-id="${t.id}">
              ▶ Mulai 5m aja
            </button>` : ''}
          <button class="btn btn-ghost tc-btn-skip" data-action="skip" data-id="${t.id}">Skip</button>
        </div>
      ` : ''}
    </li>
  `
}

// ─────────────────────────────────────────
// GLOBAL EVENT BINDING
// ─────────────────────────────────────────

function bindGlobalEvents(container, tasks, mode, onUpdate) {
  container.querySelector('#task-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]')
    if (!btn) return
    const { action, id } = btn.dataset
    const task = _tasks.find(t => t.id === id)
    if (!task) return

    if (action === 'start-full') startSession(task, false)
    if (action === 'start-mini') startSession(task, true)
    if (action === 'skip')       doSkipTask(id)
  })

  container.querySelector('#btn-regenerate')?.addEventListener('click', () => {
    clearAll()
    const { regenerateTasks } = window.__BE_ENGINE__ || {}
    if (regenerateTasks) _onUpdate(regenerateTasks())
  })

  container.querySelector('#feynman-close')?.addEventListener('click', hideFeynman)
  container.querySelector('#feynman-skip')?.addEventListener('click',  hideFeynman)
}

// ─────────────────────────────────────────
// SESSION START
// ─────────────────────────────────────────

function startSession(rawTask, miniMode) {
  clearAll()
  activeTaskId = rawTask.id

  // Build or reuse session task
  let task = { ...rawTask }
  if (!task.sessions || task.sessions.length === 0) {
    task.sessions          = [task.duration]
    task.currentSession    = 0
    task.completedSessions = 0
    task.stats             = { completed: 0, skipped: 0, streak: 0 }
    task.remainingSeconds  = task.duration * 60
  }

  // Mini mode: override first session to 5 min
  if (miniMode && task.sessions[task.currentSession] > 5) {
    task.sessions = [...task.sessions]
    task.sessions[task.currentSession] = 5
    task.remainingSeconds = 5 * 60
  }

  task.state = 'running'
  silentPersist(task)
  activateSpotlight(task)
  runTimer(task)
}

// ─────────────────────────────────────────
// SPOTLIGHT / FOCUS ATMOSPHERE
// ─────────────────────────────────────────

function activateSpotlight(task) {
  // Dim sidebar
  document.querySelector('#sidebar')?.classList.add('session-active')
  document.querySelector('#main-panel')?.classList.add('session-active')

  // Set mode atmosphere on body
  document.body.className = `mode-${task.mode || _mode}`

  // Render spotlight panel
  const overlay = _container.querySelector('#spotlight-overlay')
  if (!overlay) return

  overlay.style.display = 'block'
  overlay.classList.add('anim-scale-in')
  renderSpotlight(task)

  // Dim other task cards
  dimOtherCards(task.id)

  // Start anti-resist timer (while idle, before timer starts it's cleared)
  startAntiResist(task)
}

function deactivateSpotlight() {
  document.querySelector('#sidebar')?.classList.remove('session-active')
  document.querySelector('#main-panel')?.classList.remove('session-active')
  document.body.className = `mode-${_mode}`

  const overlay = _container?.querySelector('#spotlight-overlay')
  if (overlay) overlay.style.display = 'none'

  // Un-dim all cards
  _container?.querySelectorAll('.task-card').forEach(c => {
    c.style.opacity = '1'
    c.style.filter  = ''
  })
}

function dimOtherCards(activeId) {
  _container?.querySelectorAll('.task-card').forEach(c => {
    if (c.dataset.id !== activeId) {
      c.style.opacity = '0.3'
      c.style.filter  = 'blur(1px)'
    }
  })
}

// ─────────────────────────────────────────
// SPOTLIGHT RENDER
// ─────────────────────────────────────────

function renderSpotlight(task) {
  const overlay = _container?.querySelector('#spotlight-overlay')
  if (!overlay) return

  const prog     = getSessionProgress(task)
  const isBreak  = task.state === 'break'
  const taskMode = task.mode || _mode
  const isRunning = task.state === 'running'

  const tone = isBreak
    ? BREAK_TONE[taskMode] || BREAK_TONE.normal
    : (ENTRY_TONE[taskMode] || ENTRY_TONE.normal)(task.sessions?.[prog.current] ?? task.duration)

  const segs = (task.sessions || []).map((_, i) => {
    const cls = i < prog.completed ? 'sp-seg-done'
              : i === prog.current && isRunning ? 'sp-seg-active' : ''
    return `<div class="sp-seg ${cls}"></div>`
  }).join('')

  overlay.innerHTML = `
    <div class="sp-card card glow-active anim-scale-in">

      <!-- Header -->
      <div class="sp-header">
        <span class="sp-task-name">${task.name}</span>
        <span class="sp-state-chip ${isBreak ? 'chip-break' : 'chip-run'}">
          ${isBreak ? '☕ Break' : `Sesi ${prog.current + 1} / ${prog.total}`}
        </span>
      </div>

      <!-- Tone / entry trigger -->
      <p class="sp-tone">${tone}</p>

      <!-- Segment bar -->
      <div class="sp-seg-bar">${segs}</div>

      <!-- BIG TIMER -->
      <div class="sp-timer ${isBreak ? 'timer-break' : 'timer-run'}" id="sp-timer">
        ${formatTime(task.remainingSeconds ?? (task.sessions?.[prog.current] ?? task.duration) * 60)}
      </div>

      <!-- Sub label -->
      <div class="sp-sub" id="sp-sub">
        ${isBreak
          ? `Break ${getBreakDuration(task.completedSessions, taskMode)} mnt`
          : `${task.sessions?.[prog.current] ?? task.duration} mnt · ${taskMode} mode`}
      </div>

      <!-- Anti-resist CTA -->
      <div class="anti-resist" id="anti-resist" style="display:none;">
        <span>Mulai 5 menit aja dulu.</span>
        <button class="btn btn-primary btn-sm" id="ar-start">Mulai Sekarang</button>
      </div>

      <!-- Controls -->
      <div class="sp-controls">
        ${isBreak ? `
          <button class="btn btn-primary" id="sp-skip-break">Lewati Break →</button>
        ` : `
          <button class="btn btn-success" id="sp-done-early">✓ Selesai Lebih Awal</button>
          <button class="btn btn-ghost"   id="sp-stop">✕ Stop Sesi</button>
        `}
      </div>

      <!-- Abandon (secondary, small) -->
      <div class="sp-abandon">
        <button class="btn btn-danger" id="sp-abandon">Abandon Task</button>
      </div>
    </div>
  `

  bindSpotlightEvents(task)
}

function updateTimerOnly(secs) {
  const el = _container?.querySelector('#sp-timer')
  if (el) el.textContent = formatTime(secs)
}

// ─────────────────────────────────────────
// SPOTLIGHT EVENT BINDING
// ─────────────────────────────────────────

function bindSpotlightEvents(task) {
  const c = _container

  // Break: skip break
  c.querySelector('#sp-skip-break')?.addEventListener('click', () => {
    clearAll()
    const next = startNextSession(task)
    silentPersist(next)
    renderSpotlight(next)
    runTimer(next)
  })

  // Done early
  c.querySelector('#sp-done-early')?.addEventListener('click', () => {
    clearAll()
    let updated = handleSessionComplete(task)
    silentPersist(updated)

    if (updated.state === 'done') {
      finishTask(updated)
    } else {
      showMicroFeedback(updated.stats.completed)
      renderSpotlight(updated)
      runTimer(updated)
    }
  })

  // Stop session (interrupt)
  c.querySelector('#sp-stop')?.addEventListener('click', () => {
    clearAll()
    const updated = { ...handleInterrupt(task), state: 'idle' }
    silentPersist(updated)
    deactivateSpotlight()
    activeTaskId = null
    refreshList()
  })

  // Abandon task
  c.querySelector('#sp-abandon')?.addEventListener('click', () => {
    clearAll()
    activeTaskId = null
    deactivateSpotlight()
    const state = resolveTask(task.id, 'skip')
    _onUpdate(state)
  })

  // Anti-resist start now
  c.querySelector('#ar-start')?.addEventListener('click', () => {
    c.querySelector('#anti-resist').style.display = 'none'
    // just reinforce — timer is already running
  })
}

// ─────────────────────────────────────────
// TIMER ENGINE
// ─────────────────────────────────────────

function runTimer(task) {
  clearInterval(timerInterval)
  let current = { ...task }

  timerInterval = setInterval(() => {
    current = { ...current, remainingSeconds: (current.remainingSeconds ?? 0) - 1 }

    if (current.remainingSeconds <= 0) {
      clearInterval(timerInterval)

      if (current.state === 'running') {
        let updated = handleSessionComplete(current)
        silentPersist(updated)

        if (updated.state === 'done') {
          finishTask(updated)
          return
        }

        showMicroFeedback(updated.stats.completed)
        renderSpotlight(updated)
        runTimer(updated)

      } else if (current.state === 'break') {
        const next = startNextSession(current)
        silentPersist(next)
        renderSpotlight(next)
        runTimer(next)
      }
      return
    }

    updateTimerOnly(current.remainingSeconds)
    syncOverlay(current)   // push to overlay window
  }, 1000)
}

// ─────────────────────────────────────────
// FINISH TASK
// ─────────────────────────────────────────

function finishTask(task) {
  activeTaskId = null
  syncOverlay({ state: 'done', taskName: task.name })  // signal overlay to hide
  deactivateSpotlight()
  const state = resolveTask(task.id, 'done')
  _onUpdate(state)
  showFeynman(task.name)
}

// ─────────────────────────────────────────
// RESUME BANNER
// ─────────────────────────────────────────

function showResumeBanner(container, resumable, tasks, mode, onUpdate) {
  const banner = container.querySelector('#resume-banner')
  if (!banner) return

  const { task, sessionLabel, isBreak } = resumable

  banner.style.display = 'block'
  banner.innerHTML = `
    <div class="resume-inner anim-fade-down">
      <div class="resume-info">
        <span class="resume-icon">${isBreak ? '☕' : '⏸'}</span>
        <div>
          <span class="resume-task">${task.name}</span>
          <span class="resume-sub">Berhenti di ${sessionLabel}${isBreak ? ' · Break' : ''}</span>
        </div>
      </div>
      <div class="resume-actions">
        <button class="btn btn-primary btn-sm" id="btn-resume">Resume →</button>
        <button class="btn btn-ghost   btn-sm" id="btn-reset-resume">Reset</button>
      </div>
    </div>
  `

  banner.querySelector('#btn-resume')?.addEventListener('click', () => {
    banner.style.display = 'none'
    startSession(task, false)
  })

  banner.querySelector('#btn-reset-resume')?.addEventListener('click', () => {
    banner.style.display = 'none'
    // Reset task state to idle
    const reset = { ...task, state: 'idle', currentSession: 0, completedSessions: 0, remainingSeconds: task.sessions?.[0] * 60 }
    silentPersist(reset)
    refreshList()
  })
}

// ─────────────────────────────────────────
// ANTI-RESISTANCE
// ─────────────────────────────────────────

function startAntiResist(task) {
  clearTimeout(antiResistTimer)
  antiResistTimer = setTimeout(() => {
    const el = _container?.querySelector('#anti-resist')
    if (el && task.state !== 'running') {
      el.style.display = 'flex'
      el.classList.add('ar-visible')
    }
  }, ANTI_RESIST_DELAY)
}

// ─────────────────────────────────────────
// MICRO FEEDBACK TOAST
// ─────────────────────────────────────────

function showMicroFeedback(sessionsDone) {
  const toast = _container?.querySelector('#micro-toast')
  if (!toast) return

  const line = DONE_LINES[Math.floor(Math.random() * DONE_LINES.length)]
  toast.textContent = `+1 sesi · ${line}`
  toast.classList.add('toast-show')

  setTimeout(() => toast.classList.remove('toast-show'), 3000)
}

// ─────────────────────────────────────────
// FEYNMAN
// ─────────────────────────────────────────

function showFeynman(taskName) {
  const overlay = _container?.querySelector('#feynman-overlay')
  const text    = _container?.querySelector('#feynman-text')
  if (!overlay || !text) return
  text.textContent = getFeynmanPrompt(taskName)
  overlay.style.display = 'flex'
}

function hideFeynman() {
  const overlay = _container?.querySelector('#feynman-overlay')
  if (overlay) overlay.style.display = 'none'
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function doSkipTask(taskId) {
  clearAll()
  activeTaskId = null
  const state = resolveTask(taskId, 'skip')
  _onUpdate(state)
}

function silentPersist(task) {
  const { updateTaskState } = window.__BE_ENGINE__ || {}
  if (updateTaskState) updateTaskState(task.id, task)
}

function refreshList() {
  const { loadCurrentState } = window.__BE_ENGINE__ || {}
  if (loadCurrentState) _onUpdate(loadCurrentState())
  else {
    // Fallback: reload from storage via boot
    import('../engine/behaviorEngine.js').then(({ bootEngine }) => {
      _onUpdate(bootEngine())
    })
  }
}

function clearAll() {
  clearInterval(timerInterval)
  clearTimeout(antiResistTimer)
}

// ─────────────────────────────────────────
// OVERLAY SYNC
// ─────────────────────────────────────────

/**
 * Push current task state to the overlay window via Electron IPC.
 * Safe to call in browser (no-op if electronAPI not available).
 */
function syncOverlay(task) {
  if (!window.electronAPI?.sendSessionState) return
  window.electronAPI.sendSessionState({
    taskName:          task.name       || '',
    state:             task.state      || 'idle',
    remainingSeconds:  task.remainingSeconds ?? 0,
    sessions:          task.sessions   || [],
    currentSession:    task.currentSession    ?? 0,
    completedSessions: task.completedSessions ?? 0
  })
}

/**
 * Listen for actions coming FROM the overlay window.
 * Must be called once on init. Uses the current task via closure ref.
 */
export function bindOverlayActions() {
  if (!window.electronAPI?.onOverlayAction) return

  window.electronAPI.removeOverlayListeners?.()   // clean up old listeners first

  window.electronAPI.onOverlayAction((data) => {
    // We need the currently active task — fetch from storage
    const { loadCurrentState } = window.__BE_ENGINE__ || {}
    if (!loadCurrentState) return
    const { tasks } = loadCurrentState()
    const task = tasks.find(t => t.id === activeTaskId)
    if (!task) return

    if (data.action === 'stop') {
      clearAll()
      const updated = { ...handleInterrupt(task), state: 'idle' }
      silentPersist(updated)
      deactivateSpotlight()
      activeTaskId = null
      _onUpdate(loadCurrentState())
    }

    if (data.action === 'done-early') {
      clearAll()
      const updated = handleSessionComplete(task)
      silentPersist(updated)
      if (updated.state === 'done') {
        finishTask(updated)
      } else {
        showMicroFeedback(updated.stats.completed)
        syncOverlay(updated)
        renderSpotlight(updated)
        runTimer(updated)
      }
    }

    if (data.action === 'skip-break') {
      clearAll()
      const next = startNextSession(task)
      silentPersist(next)
      syncOverlay(next)
      renderSpotlight(next)
      runTimer(next)
    }
  })
}

function formatTime(secs) {
  const s = Math.max(0, Math.round(secs))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────

function injectStyles() {
  if (document.getElementById('task-v2-styles')) return
  const s = document.createElement('style')
  s.id = 'task-v2-styles'
  s.textContent = `
    /* ── HEADER ── */
    .tv-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .tv-title  { font-size: 22px; font-weight: 700; }

    /* ── RESUME BANNER ── */
    .resume-banner { margin-bottom: 16px; }
    .resume-inner {
      background: var(--bg-card);
      border: 1px solid var(--accent);
      border-radius: var(--radius);
      padding: 14px 18px;
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
    }
    .resume-info   { display: flex; align-items: center; gap: 12px; }
    .resume-icon   { font-size: 20px; }
    .resume-task   { display: block; font-weight: 700; font-size: 14px; color: var(--text-primary); }
    .resume-sub    { font-size: 12px; color: var(--text-muted); }
    .resume-actions { display: flex; gap: 8px; flex-shrink: 0; }

    /* ── MICRO TOAST ── */
    .micro-toast {
      position: fixed;
      bottom: 24px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: var(--bg-card);
      border: 1px solid var(--success);
      color: var(--success);
      border-radius: 99px;
      padding: 8px 20px;
      font-size: 13px;
      font-weight: 600;
      opacity: 0;
      transition: opacity 0.3s, transform 0.3s;
      pointer-events: none;
      z-index: 200;
      white-space: nowrap;
    }
    .micro-toast.toast-show { opacity: 1; transform: translateX(-50%) translateY(0); }

    /* ── SPOTLIGHT OVERLAY ── */
    .spotlight-overlay {
      margin-bottom: 20px;
    }
    .sp-card {
      padding: 28px;
      animation: glowPulse 3s ease-in-out infinite;
    }
    .sp-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 6px;
    }
    .sp-task-name { font-size: 18px; font-weight: 800; color: var(--text-primary); }
    .sp-state-chip { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 99px; }

    .sp-tone {
      font-size: 13px; color: var(--text-muted); font-style: italic;
      margin: 12px 0 20px;
    }

    /* Segment bar — spotlight */
    .sp-seg-bar { display: flex; gap: 6px; margin-bottom: 24px; }
    .sp-seg {
      flex: 1; height: 5px; border-radius: 99px;
      background: var(--border);
      transition: background 0.3s;
    }
    .sp-seg-done   { background: var(--success); }
    .sp-seg-active { background: var(--mode-accent, var(--accent)); animation: pulse 1.5s ease-in-out infinite; }

    /* BIG TIMER */
    .sp-timer {
      font-size: 72px;
      font-weight: 800;
      letter-spacing: 0.04em;
      font-variant-numeric: tabular-nums;
      text-align: center;
      line-height: 1;
      margin-bottom: 10px;
    }
    .timer-run   { color: var(--mode-timer, var(--accent)); }
    .timer-break { color: var(--warning); }

    .sp-sub {
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 24px;
    }

    /* Anti-resist */
    .anti-resist {
      display: none;
      align-items: center;
      justify-content: space-between;
      background: rgba(124,106,247,0.08);
      border: 1px dashed var(--accent);
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      font-size: 13px;
      color: var(--accent);
      margin-bottom: 16px;
      opacity: 0;
      transition: opacity 0.4s;
    }
    .anti-resist.ar-visible { opacity: 1; }

    /* Controls */
    .sp-controls { display: flex; gap: 10px; justify-content: center; margin-bottom: 12px; }
    .sp-abandon  { text-align: center; }

    /* ── TASK LIST ── */
    .task-list { list-style: none; display: flex; flex-direction: column; gap: 10px; }
    .task-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px;
      transition: opacity 0.3s, filter 0.3s, border-color 0.3s, transform 0.2s;
    }
    .task-card:not(.tc-done):not(.tc-skip):not(.tc-active):hover { border-color: var(--text-muted); }
    .task-card.tc-done { opacity: 0.4; }
    .task-card.tc-skip { opacity: 0.3; }
    .task-card.tc-active {
      border-color: var(--mode-accent, var(--accent));
      background: linear-gradient(135deg, var(--bg-card) 0%, var(--accent-glow) 100%);
    }

    .tc-top  { display: flex; align-items: flex-start; gap: 12px; }
    .tc-check {
      width: 22px; height: 22px; border-radius: 50%;
      border: 2px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; flex-shrink: 0; margin-top: 2px;
      transition: all 0.2s;
    }
    .tc-check.checked { background: var(--success); border-color: var(--success); color: #000; font-weight: 800; }

    .tc-info   { flex: 1; }
    .tc-name   { display: block; font-size: 14px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
    .tc-done .tc-name { text-decoration: line-through; color: var(--text-muted); }

    .tc-meta-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .tc-total, .tc-segs-label { font-size: 12px; color: var(--text-muted); }

    .tc-mode-chip, .chip {
      font-size: 10px; font-weight: 700; padding: 2px 8px;
      border-radius: 99px; letter-spacing: 0.06em;
    }
    .chip-normal, .tc-mode-chip.chip-normal { background: var(--accent-glow); color: var(--accent); }
    .chip-lazy,   .tc-mode-chip.chip-lazy   { background: rgba(248,113,113,0.12); color: var(--danger); }
    .chip-focus,  .tc-mode-chip.chip-focus  { background: rgba(74,222,128,0.12);  color: var(--success); }
    .chip-run     { background: var(--accent-glow); color: var(--accent); }
    .chip-break   { background: rgba(250,204,21,0.12); color: var(--warning); }
    .chip-done    { color: var(--success); background: rgba(74,222,128,0.1); }
    .chip-skip    { color: var(--text-muted); }

    .tc-status { flex-shrink: 0; }

    /* Segment bar (mini, in task card) */
    .seg-bar { display: flex; gap: 4px; margin-top: 10px; }
    .seg {
      flex: 1; height: 4px; border-radius: 99px;
      background: var(--border); max-width: 40px;
      transition: background 0.3s;
    }
    .seg-done   { background: var(--success); }
    .seg-active { background: var(--accent); animation: pulse 1.5s ease-in-out infinite; }

    /* Action buttons */
    .tc-actions {
      display: flex; gap: 8px; flex-wrap: wrap;
      margin-top: 14px; padding-top: 14px;
      border-top: 1px solid var(--border);
    }
    .tc-btn-start { flex-shrink: 0; }
    .tc-btn-mini  { flex-shrink: 0; }
    .tc-btn-skip  { margin-left: auto; }
    .btn-sm { padding: 5px 12px; font-size: 12px; }

    /* ── FEYNMAN ── */
    .feynman-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.8);
      display: flex; align-items: center; justify-content: center;
      z-index: 300;
    }
    .feynman-modal   { max-width: 480px; width: 90%; }
    .feynman-label   { font-size: 13px; font-weight: 700; color: var(--accent); margin-bottom: 14px; }
    .feynman-text    { color: var(--text-primary); line-height: 1.75; font-size: 14px; margin-bottom: 20px; }
    .feynman-actions { display: flex; gap: 10px; }

    /* ── SHARED ── */
    .empty-state { color: var(--text-muted); font-size: 13px; line-height: 1.6; }
  `
  document.head.appendChild(s)
}