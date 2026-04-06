// src/ui/taskView.js
// Advanced session-based task execution UI
// State machine: idle → running → break → running → done

import { resolveTask, updateTaskState }         from '../engine/behaviorEngine.js'
import { handleInterrupt, handleSessionComplete,
         startNextSession, getSessionProgress,
         getBreakDuration }                      from '../engine/sessionEngine.js'
import { getFeynmanPrompt }                      from '../engine/mentalEngine.js'

// ─────────────────────────────────────────
// STATE
// ─────────────────────────────────────────

let timerInterval     = null   // countdown interval
let antiResistTimer   = null   // anti-resistance CTA delay
let activeTaskId      = null

const ANTI_RESIST_DELAY = 8000 // 8 detik sebelum CTA muncul

// Psychological tone per state
const TONE = {
  running : { lazy: "Cuma 5 menit. Serius.", normal: "Fokus sesi ini aja.", focus: "Zona aktif. Jangan buang momentum." },
  break   : { lazy: "Istirahat 3 menit, jangan kabur.", normal: "Istirahat bentar, jangan kabur.", focus: "Recharge sebentar, lanjut lagi." },
  done    : { lazy: "Selesai. Progress tetap progress.", normal: "Selesai. Progress tetap progress.", focus: "Solid. Streak lu terjaga." }
}

// ─────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────

/**
 * @param {HTMLElement} container
 * @param {{ tasks: Array, mode: string }} state
 * @param {Function} onUpdate
 */
export function renderTaskView(container, { tasks, mode }, onUpdate) {
  container.innerHTML = `
    <div class="tv-header">
      <h2 class="tv-title">Tasks</h2>
      <button class="btn btn-ghost btn-sm" id="btn-regenerate">↺ Refresh Tasks</button>
    </div>

    <!-- Active Session Panel -->
    <div class="session-panel card" id="session-panel" style="display:none;"></div>

    <!-- Task List -->
    <div class="card" id="task-list-wrap">
      <p class="section-title">
        Hari ini
        <span class="mode-tag mode-${mode}">${mode.toUpperCase()}</span>
      </p>
      ${tasks.length === 0
        ? `<p class="empty-state">Belum ada task. Tambah aktivitas di <strong>Settings</strong>.</p>`
        : `<ul class="task-list" id="task-list">
            ${tasks.map(t => taskItemHTML(t)).join('')}
          </ul>`
      }
    </div>

    <!-- Feynman Modal -->
    <div class="feynman-overlay" id="feynman-overlay" style="display:none;">
      <div class="feynman-modal card">
        <p class="section-title">✦ Feynman Check</p>
        <p class="feynman-text" id="feynman-text"></p>
        <button class="btn btn-primary" id="feynman-close">Oke, udah ngerti 👍</button>
        <button class="btn btn-ghost"   id="feynman-skip">Lewati</button>
      </div>
    </div>
  `

  injectTaskStyles()
  bindEvents(container, tasks, mode, onUpdate)

  // If there's already an active task, restore panel
  const active = tasks.find(t => t.state === 'running' || t.state === 'break')
  if (active) restoreSession(container, active, tasks, mode, onUpdate)
}

// ─────────────────────────────────────────
// TASK ITEM HTML
// ─────────────────────────────────────────

function taskItemHTML(t) {
  const prog    = getSessionProgress(t)
  const isDone  = t.state === 'done'  || t.status === 'done'
  const isSkip  = t.status === 'skip'
  const isRun   = t.state === 'running'
  const isBreak = t.state === 'break'
  const isDead  = isDone || isSkip

  const segBar = t.sessions?.length > 1
    ? `<div class="seg-bar">${t.sessions.map((_, i) => `
        <div class="seg ${i < prog.completed ? 'seg-done' : i === prog.current && isRun ? 'seg-active' : ''}"></div>
      `).join('')}</div>`
    : ''

  return `
    <li class="task-item ${isDone ? 'status-done' : ''} ${isRun || isBreak ? 'status-active' : ''} ${isSkip ? 'status-skip' : ''}"
        data-id="${t.id}">
      <div class="task-main">
        <div class="task-check ${isDone ? 'checked' : ''}">${isDone ? '✓' : ''}</div>
        <div class="task-info">
          <span class="task-name">${t.name}</span>
          <div class="task-meta-row">
            <span class="task-meta">${t.total || t.duration} mnt total</span>
            ${t.sessions?.length > 1 ? `<span class="task-sessions">${prog.completed}/${prog.total} sesi</span>` : ''}
            <span class="task-mode-tag mode-${t.mode || 'normal'}">${t.mode || 'normal'}</span>
          </div>
          ${segBar}
        </div>
        <div class="task-actions">
          ${!isDead && !isRun && !isBreak ? `
            <button class="btn btn-primary btn-sm" data-action="start" data-id="${t.id}">▶ Mulai</button>
            <button class="btn btn-ghost  btn-sm" data-action="skip"  data-id="${t.id}">Skip</button>
          ` : ''}
          ${isRun   ? `<span class="badge badge-run">● Running</span>` : ''}
          ${isBreak ? `<span class="badge badge-break">☕ Break</span>` : ''}
          ${isDone  ? `<span class="badge badge-done">✓ Selesai</span>` : ''}
          ${isSkip  ? `<span class="badge badge-skip">Dilewati</span>` : ''}
        </div>
      </div>
    </li>
  `
}

// ─────────────────────────────────────────
// EVENT BINDING
// ─────────────────────────────────────────

function bindEvents(container, tasks, mode, onUpdate) {
  container.querySelector('#task-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]')
    if (!btn) return
    const { action, id } = btn.dataset
    const task = tasks.find(t => t.id === id)
    if (!task) return

    if (action === 'start') beginSession(container, task, tasks, mode, onUpdate)
    if (action === 'skip')  skipTask(id, container, tasks, mode, onUpdate)
  })

  container.querySelector('#btn-regenerate')?.addEventListener('click', () => {
    const { regenerateTasks } = window.__BE_ENGINE__ || {}
    if (regenerateTasks) onUpdate(regenerateTasks())
  })

  container.querySelector('#feynman-close')?.addEventListener('click', () => {
    container.querySelector('#feynman-overlay').style.display = 'none'
  })
  container.querySelector('#feynman-skip')?.addEventListener('click', () => {
    container.querySelector('#feynman-overlay').style.display = 'none'
  })
}

// ─────────────────────────────────────────
// SESSION START
// ─────────────────────────────────────────

function beginSession(container, task, tasks, mode, onUpdate) {
  clearAll()
  activeTaskId = task.id

  // Build session task if not yet built
  let t = { ...task }
  if (!t.sessions) {
    t.sessions           = [t.duration]
    t.currentSession     = 0
    t.completedSessions  = 0
    t.state              = 'idle'
    t.stats              = { completed: 0, skipped: 0, streak: 0 }
    t.remainingSeconds   = t.duration * 60
  }

  t.state = 'running'
  persistAndRefresh(t, tasks, onUpdate)
  runSessionTimer(container, t, tasks, mode, onUpdate)
}

function restoreSession(container, task, tasks, mode, onUpdate) {
  activeTaskId = task.id
  runSessionTimer(container, task, tasks, mode, onUpdate)
}

// ─────────────────────────────────────────
// TIMER ENGINE
// ─────────────────────────────────────────

function runSessionTimer(container, task, tasks, mode, onUpdate) {
  clearInterval(timerInterval)
  renderSessionPanel(container, task, tasks, mode, onUpdate)

  timerInterval = setInterval(() => {
    task = { ...task, remainingSeconds: (task.remainingSeconds || 0) - 1 }

    if (task.remainingSeconds <= 0) {
      clearInterval(timerInterval)

      if (task.state === 'running') {
        // Session complete
        task = handleSessionComplete(task)
        persistAndRefresh(task, tasks, onUpdate)

        if (task.state === 'done') {
          activeTaskId = null
          hidePanelAndRefresh(container, task, tasks, onUpdate)
          showFeynman(container, task.name)
          return
        }

        // Start break
        renderSessionPanel(container, task, tasks, mode, onUpdate)
        runSessionTimer(container, task, tasks, mode, onUpdate)

      } else if (task.state === 'break') {
        // Break over → next session
        task = startNextSession(task)
        persistAndRefresh(task, tasks, onUpdate)
        renderSessionPanel(container, task, tasks, mode, onUpdate)
        runSessionTimer(container, task, tasks, mode, onUpdate)
      }
      return
    }

    // Update timer display only (no full re-render)
    updateTimerDisplay(container, task)
  }, 1000)
}

// ─────────────────────────────────────────
// SESSION PANEL RENDER
// ─────────────────────────────────────────

function renderSessionPanel(container, task, tasks, mode, onUpdate) {
  const panel = container.querySelector('#session-panel')
  if (!panel) return
  panel.style.display = 'block'

  const prog     = getSessionProgress(task)
  const isBreak  = task.state === 'break'
  const taskMode = task.mode || mode
  const tone     = TONE[task.state]?.[taskMode] || TONE[task.state]?.normal || ''

  const sessionDur = isBreak
    ? getBreakDuration(task.completedSessions, taskMode)
    : (task.sessions?.[task.currentSession] || task.duration)

  panel.innerHTML = `
    <div class="sp-top">
      <div class="sp-task-name">${task.name}</div>
      <div class="sp-state-badge ${isBreak ? 'badge-break' : 'badge-run'}">
        ${isBreak ? '☕ Break' : '● Sesi ' + (prog.current + 1) + ' / ' + prog.total}
      </div>
    </div>

    <div class="sp-tone">${tone}</div>

    <!-- Segment progress bar -->
    <div class="sp-seg-bar">
      ${(task.sessions || []).map((_, i) => `
        <div class="sp-seg ${i < prog.completed ? 'sp-done'
                           : i === prog.current && !isBreak ? 'sp-active' : ''}">
        </div>
      `).join('')}
    </div>

    <!-- Big timer -->
    <div class="sp-timer ${isBreak ? 'timer-break' : ''}" id="sp-timer">
      ${formatTime(task.remainingSeconds || sessionDur * 60)}
    </div>

    <div class="sp-sub">${isBreak ? 'Break ' + sessionDur + ' mnt' : sessionDur + ' mnt · ' + taskMode + ' mode'}</div>

    <!-- Anti-resistance CTA (hidden initially) -->
    <div class="anti-resist" id="anti-resist" style="display:none;">
      Mulai 5 menit aja dulu. Serius.
    </div>

    <!-- Controls -->
    <div class="sp-controls">
      ${!isBreak ? `
        <button class="btn btn-ghost" id="sp-interrupt">✕ Stop Sesi</button>
        <button class="btn btn-success" id="sp-complete-manual">✓ Selesai Lebih Awal</button>
      ` : `
        <button class="btn btn-primary" id="sp-skip-break">Lewati Break →</button>
      `}
      <button class="btn btn-danger" id="sp-give-up">Abandon Task</button>
    </div>
  `

  bindPanelEvents(container, task, tasks, mode, onUpdate)
  startAntiResist(container, task)
}

function updateTimerDisplay(container, task) {
  const el = container.querySelector('#sp-timer')
  if (el) el.textContent = formatTime(task.remainingSeconds)
}

// ─────────────────────────────────────────
// PANEL BUTTON EVENTS
// ─────────────────────────────────────────

function bindPanelEvents(container, task, tasks, mode, onUpdate) {
  // Stop session (interrupt)
  container.querySelector('#sp-interrupt')?.addEventListener('click', () => {
    clearAll()
    const updated = { ...handleInterrupt(task), state: 'idle' }
    persistAndRefresh(updated, tasks, onUpdate)
    hidePanelAndRefresh(container, updated, tasks, onUpdate)
  })

  // Manual complete
  container.querySelector('#sp-complete-manual')?.addEventListener('click', () => {
    clearAll()
    let updated = handleSessionComplete(task)
    persistAndRefresh(updated, tasks, onUpdate)

    if (updated.state === 'done') {
      activeTaskId = null
      hidePanelAndRefresh(container, updated, tasks, onUpdate)
      showFeynman(container, task.name)
    } else {
      renderSessionPanel(container, updated, tasks, mode, onUpdate)
      runSessionTimer(container, updated, tasks, mode, onUpdate)
    }
  })

  // Skip break
  container.querySelector('#sp-skip-break')?.addEventListener('click', () => {
    clearAll()
    const updated = startNextSession(task)
    persistAndRefresh(updated, tasks, onUpdate)
    renderSessionPanel(container, updated, tasks, mode, onUpdate)
    runSessionTimer(container, updated, tasks, mode, onUpdate)
  })

  // Abandon task
  container.querySelector('#sp-give-up')?.addEventListener('click', () => {
    clearAll()
    activeTaskId = null
    const state = resolveTask(task.id, 'skip')
    onUpdate(state)
  })
}

// ─────────────────────────────────────────
// ANTI-RESISTANCE
// ─────────────────────────────────────────

function startAntiResist(container, task) {
  clearTimeout(antiResistTimer)
  if (task.state !== 'idle') return

  antiResistTimer = setTimeout(() => {
    const el = container.querySelector('#anti-resist')
    if (el) {
      el.style.display = 'block'
      el.classList.add('ar-visible')
    }
  }, ANTI_RESIST_DELAY)
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function skipTask(taskId, container, tasks, mode, onUpdate) {
  clearAll()
  const state = resolveTask(taskId, 'skip')
  onUpdate(state)
}

function persistAndRefresh(updatedTask, tasks, onUpdate) {
  const state = updateTaskState(updatedTask.id, updatedTask)
  // Don't call onUpdate here to avoid re-render during timer
  // Only persist silently
}

function hidePanelAndRefresh(container, task, tasks, onUpdate) {
  const panel = container.querySelector('#session-panel')
  if (panel) panel.style.display = 'none'
  // Trigger full re-render
  const { loadData } = window.__BE_DATA__ || {}
  const state = updateTaskState(task.id, task)
  onUpdate(state)
}

function showFeynman(container, taskName) {
  const overlay = container.querySelector('#feynman-overlay')
  const text    = container.querySelector('#feynman-text')
  if (!overlay || !text) return
  text.textContent = getFeynmanPrompt(taskName)
  overlay.style.display = 'flex'
}

function clearAll() {
  clearInterval(timerInterval)
  clearTimeout(antiResistTimer)
}

function formatTime(secs) {
  const s = Math.max(0, secs)
  const m = String(Math.floor(s / 60)).padStart(2, '0')
  const r = String(s % 60).padStart(2, '0')
  return `${m}:${r}`
}

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────

function injectTaskStyles() {
  if (document.getElementById('task-styles')) return
  const s = document.createElement('style')
  s.id = 'task-styles'
  s.textContent = `
    /* Header */
    .tv-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .tv-title  { font-size: 22px; font-weight: 700; }
    .mode-tag  { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; margin-left: 8px; vertical-align: middle; }
    .mode-tag.mode-normal { background: var(--accent-glow); color: var(--accent); }
    .mode-tag.mode-lazy   { background: rgba(248,113,113,0.15); color: var(--danger); }
    .mode-tag.mode-focus  { background: rgba(74,222,128,0.15);  color: var(--success); }

    /* ── SESSION PANEL ── */
    .session-panel {
      margin-bottom: 20px;
      border: 1px solid var(--accent);
      background: linear-gradient(135deg, var(--bg-card) 0%, rgba(124,106,247,0.05) 100%);
    }
    .sp-top   { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .sp-task-name { font-size: 16px; font-weight: 700; color: var(--text-primary); }
    .sp-state-badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 99px; }
    .badge-run   { background: var(--accent-glow); color: var(--accent); }
    .badge-break { background: rgba(250,204,21,0.15); color: var(--warning); }

    .sp-tone { font-size: 12px; color: var(--text-muted); font-style: italic; margin-bottom: 16px; }

    /* Segment bar */
    .sp-seg-bar { display: flex; gap: 5px; margin-bottom: 20px; }
    .sp-seg {
      flex: 1; height: 6px; border-radius: 99px;
      background: var(--border);
      transition: background 0.3s;
    }
    .sp-done   { background: var(--success); }
    .sp-active { background: var(--accent); animation: segPulse 1.5s ease-in-out infinite; }
    @keyframes segPulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.5; }
    }

    /* Big timer */
    .sp-timer {
      font-size: 64px;
      font-weight: 800;
      color: var(--accent);
      letter-spacing: 0.05em;
      font-variant-numeric: tabular-nums;
      text-align: center;
      line-height: 1;
      margin-bottom: 8px;
    }
    .sp-timer.timer-break { color: var(--warning); }

    .sp-sub { text-align: center; font-size: 12px; color: var(--text-muted); margin-bottom: 20px; }

    /* Anti-resistance */
    .anti-resist {
      text-align: center;
      background: rgba(124,106,247,0.1);
      border: 1px dashed var(--accent);
      border-radius: var(--radius-sm);
      padding: 10px;
      font-size: 13px;
      color: var(--accent);
      margin-bottom: 16px;
      opacity: 0;
      transition: opacity 0.5s;
    }
    .anti-resist.ar-visible { opacity: 1; }

    /* Controls */
    .sp-controls { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }

    /* ── TASK LIST ── */
    .task-list  { list-style: none; display: flex; flex-direction: column; gap: 12px; }
    .task-item  {
      padding: 14px;
      border-radius: var(--radius-sm);
      background: var(--bg-hover);
      border: 1px solid var(--border);
      transition: border 0.2s;
    }
    .task-item.status-done   { opacity: 0.45; }
    .task-item.status-active { border-color: var(--accent); }
    .task-item.status-skip   { opacity: 0.35; }

    .task-main  { display: flex; align-items: flex-start; gap: 12px; }
    .task-check {
      width: 22px; height: 22px; border-radius: 50%;
      border: 2px solid var(--border);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; flex-shrink: 0; margin-top: 2px;
    }
    .task-check.checked { background: var(--success); border-color: var(--success); color: #000; font-weight: 800; }

    .task-info   { flex: 1; }
    .task-name   { font-size: 14px; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 4px; }
    .task-item.status-done .task-name { text-decoration: line-through; color: var(--text-muted); }

    .task-meta-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .task-meta     { font-size: 12px; color: var(--text-muted); }
    .task-sessions { font-size: 11px; color: var(--text-muted); }
    .task-mode-tag { font-size: 10px; padding: 1px 6px; border-radius: 99px; font-weight: 700; }
    .task-mode-tag.mode-normal { background: var(--accent-glow); color: var(--accent); }
    .task-mode-tag.mode-lazy   { background: rgba(248,113,113,0.12); color: var(--danger); }
    .task-mode-tag.mode-focus  { background: rgba(74,222,128,0.12);  color: var(--success); }

    /* Segment bar mini */
    .seg-bar   { display: flex; gap: 3px; margin-top: 8px; }
    .seg       { flex: 1; height: 4px; border-radius: 99px; background: var(--border); max-width: 32px; }
    .seg-done  { background: var(--success); }
    .seg-active { background: var(--accent); }

    .task-actions { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
    .btn-sm    { padding: 5px 10px; font-size: 12px; }

    /* Badges */
    .badge { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 99px; }
    .badge-run   { background: var(--accent-glow); color: var(--accent); }
    .badge-break { background: rgba(250,204,21,0.12); color: var(--warning); }
    .badge-done  { color: var(--success); }
    .badge-skip  { color: var(--text-muted); }

    /* Feynman */
    .feynman-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.75);
      display: flex; align-items: center; justify-content: center;
      z-index: 100;
    }
    .feynman-modal   { max-width: 480px; width: 90%; display: flex; flex-direction: column; gap: 14px; }
    .feynman-text    { color: var(--text-primary); line-height: 1.75; font-size: 14px; }

    /* Shared */
    .empty-state { color: var(--text-muted); font-size: 13px; line-height: 1.6; }
    .btn-success { background: rgba(74,222,128,0.15); color: var(--success); border: 1px solid rgba(74,222,128,0.3); }
    .btn-danger  { background: rgba(248,113,113,0.12); color: var(--danger);  border: 1px solid rgba(248,113,113,0.3); }
  `
  document.head.appendChild(s)
}