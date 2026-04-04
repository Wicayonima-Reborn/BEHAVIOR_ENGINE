// src/ui/taskView.js
import { resolveTask }        from '../engine/behaviorEngine.js'
import { getFeynmanPrompt }   from '../engine/mentalEngine.js'

let pomodoroInterval = null
let activeTaskId     = null

/**
 * Render task list view.
 * @param {HTMLElement} container
 * @param {{ tasks: Array, mode: string }} state
 * @param {Function} onUpdate - callback(newState) to refresh UI globally
 */
export function renderTaskView(container, { tasks, mode }, onUpdate) {
  container.innerHTML = `
    <div class="tv-header">
      <h2 class="tv-title">Tasks</h2>
      <button class="btn btn-ghost" id="btn-regenerate">↺ Refresh</button>
    </div>

    <!-- Pomodoro Panel (hidden by default) -->
    <div class="card pomodoro-panel" id="pomodoro-panel" style="display:none;">
      <p class="section-title" id="pomo-task-label">—</p>
      <div class="pomo-timer" id="pomo-timer">25:00</div>
      <div class="pomo-controls">
        <button class="btn btn-ghost" id="pomo-stop">✕ Stop</button>
      </div>
    </div>

    <!-- Task List -->
    <div class="card" id="task-list-card">
      <p class="section-title">Hari Ini (${mode} mode)</p>
      ${tasks.length === 0
        ? `<p class="empty-state">Belum ada task. Tambah aktivitas di <strong>Settings</strong> dulu.</p>`
        : `<ul class="task-list" id="task-list">
            ${tasks.map(t => taskItemHTML(t)).join('')}
          </ul>`
      }
    </div>

    <!-- Feynman Modal (hidden) -->
    <div class="feynman-overlay" id="feynman-overlay" style="display:none;">
      <div class="feynman-modal card">
        <p class="section-title">Feynman Prompt</p>
        <p class="feynman-text" id="feynman-text"></p>
        <button class="btn btn-primary" id="feynman-close">Oke, udah ngerti 👍</button>
      </div>
    </div>
  `

  injectTaskStyles()
  bindTaskEvents(container, tasks, mode, onUpdate)
}

function taskItemHTML(t) {
  const isDone   = t.status === 'done'
  const isSkip   = t.status === 'skip'
  const isActive = t.status === 'active'
  const isDead   = isDone || isSkip

  return `
    <li class="task-item status-${t.status}" data-id="${t.id}">
      <div class="task-main">
        <div class="task-check ${isDone ? 'checked' : ''}">${isDone ? '✓' : ''}</div>
        <div class="task-info">
          <span class="task-name">${t.name}</span>
          <span class="task-meta">${t.duration} menit</span>
        </div>
        <div class="task-actions">
          ${!isDead && !isActive ? `
            <button class="btn btn-primary btn-sm" data-action="start" data-id="${t.id}">▶ Mulai</button>
            <button class="btn btn-ghost  btn-sm" data-action="skip"  data-id="${t.id}">Skip</button>
          ` : ''}
          ${isActive ? `<span class="active-label">● Aktif</span>` : ''}
          ${isDone   ? `<span class="done-label">✓ Selesai</span>` : ''}
          ${isSkip   ? `<span class="skip-label">Dilewati</span>` : ''}
        </div>
      </div>
    </li>
  `
}

function bindTaskEvents(container, tasks, mode, onUpdate) {
  // Delegated click on task actions
  const list = container.querySelector('#task-list')
  if (list) {
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]')
      if (!btn) return
      const { action, id } = btn.dataset

      if (action === 'start') startPomodoro(id, tasks, mode, container, onUpdate)
      if (action === 'skip')  handleSkip(id, container, onUpdate)
    })
  }

  // Regenerate
  container.querySelector('#btn-regenerate')?.addEventListener('click', () => {
    const { regenerateTasks } = window.__BE_ENGINE__
    if (regenerateTasks) onUpdate(regenerateTasks())
  })

  // Pomodoro stop
  container.querySelector('#pomo-stop')?.addEventListener('click', () => {
    stopPomodoro(container)
  })

  // Feynman close
  container.querySelector('#feynman-close')?.addEventListener('click', () => {
    container.querySelector('#feynman-overlay').style.display = 'none'
  })
}

// ──────────────────────────────
// POMODORO
// ──────────────────────────────

function startPomodoro(taskId, tasks, mode, container, onUpdate) {
  const task = tasks.find(t => t.id === taskId)
  if (!task) return

  // Mark active in engine
  const newState = resolveTaskStatus(taskId, 'active')
  if (newState) onUpdate(newState)

  activeTaskId = taskId
  const totalSeconds = task.duration * 60

  showPomodoroPanel(container, task.name, totalSeconds, () => {
    // On complete
    stopPomodoro(container)
    const state = resolveTask(taskId, 'done')
    onUpdate(state)
    showFeynman(container, task.name)
  })
}

function showPomodoroPanel(container, taskName, totalSecs, onComplete) {
  const panel = container.querySelector('#pomodoro-panel')
  const label = container.querySelector('#pomo-task-label')
  const timer = container.querySelector('#pomo-timer')

  panel.style.display = 'block'
  label.textContent   = taskName
  let remaining = totalSecs

  clearInterval(pomodoroInterval)
  pomodoroInterval = setInterval(() => {
    remaining--
    timer.textContent = formatTime(remaining)
    if (remaining <= 0) {
      clearInterval(pomodoroInterval)
      onComplete()
    }
  }, 1000)

  timer.textContent = formatTime(totalSecs)
}

function stopPomodoro(container) {
  clearInterval(pomodoroInterval)
  const panel = container.querySelector('#pomodoro-panel')
  if (panel) panel.style.display = 'none'
  activeTaskId = null
}

function formatTime(secs) {
  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')
  return `${m}:${s}`
}

// ──────────────────────────────
// SKIP / STATUS HELPERS
// ──────────────────────────────

function handleSkip(taskId, container, onUpdate) {
  const state = resolveTask(taskId, 'skip')
  onUpdate(state)
}

function resolveTaskStatus(taskId, status) {
  // Just update local task state to 'active' without writing to history
  // Real resolution (done/skip) is done via resolveTask
  return null // handled inline in renderTaskView re-render
}

// ──────────────────────────────
// FEYNMAN
// ──────────────────────────────

function showFeynman(container, taskName) {
  const overlay = container.querySelector('#feynman-overlay')
  const text    = container.querySelector('#feynman-text')
  if (!overlay || !text) return
  text.textContent = getFeynmanPrompt(taskName)
  overlay.style.display = 'flex'
}

// ──────────────────────────────
// STYLES
// ──────────────────────────────

function injectTaskStyles() {
  if (document.getElementById('task-styles')) return
  const s = document.createElement('style')
  s.id = 'task-styles'
  s.textContent = `
    .tv-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .tv-title  { font-size: 22px; font-weight: 700; }

    /* Pomodoro Panel */
    .pomodoro-panel  { margin-bottom: 20px; text-align: center; border: 1px solid var(--accent); }
    .pomo-timer      { font-size: 56px; font-weight: 800; color: var(--accent); letter-spacing: 0.05em; margin: 12px 0; font-variant-numeric: tabular-nums; }
    .pomo-controls   { display: flex; justify-content: center; gap: 12px; margin-top: 8px; }

    /* Task List */
    .task-list  { list-style: none; display: flex; flex-direction: column; gap: 12px; }
    .task-item  { padding: 14px; border-radius: var(--radius-sm); background: var(--bg-hover); border: 1px solid var(--border); }
    .task-item.status-done  { opacity: 0.5; }
    .task-item.status-active { border-color: var(--accent); }
    .task-main  { display: flex; align-items: center; gap: 12px; }
    .task-check { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }
    .task-check.checked { background: var(--success); border-color: var(--success); color: #000; font-weight: 700; }
    .task-info  { flex: 1; }
    .task-name  { font-size: 14px; font-weight: 600; color: var(--text-primary); display: block; }
    .task-meta  { font-size: 12px; color: var(--text-muted); }
    .task-actions { display: flex; gap: 8px; align-items: center; }
    .btn-sm     { padding: 5px 10px; font-size: 12px; }
    .active-label { font-size: 12px; color: var(--accent); }
    .done-label   { font-size: 12px; color: var(--success); }
    .skip-label   { font-size: 12px; color: var(--text-muted); }

    /* Feynman */
    .feynman-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .feynman-modal   { max-width: 480px; width: 90%; }
    .feynman-text    { color: var(--text-primary); line-height: 1.7; font-size: 14px; margin-bottom: 20px; }
  `
  document.head.appendChild(s)
}