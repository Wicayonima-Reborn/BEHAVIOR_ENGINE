// ESM — entry point
import { bootEngine, regenerateTasks, updateTaskState, loadCurrentState } from './engine/behaviorEngine.js'
import { applyDailyDecay }   from './engine/momentumEngine.js'
import { saveData }          from './data/storage.js'
import { renderDashboard }   from './ui/dashboard.js'
import { renderTaskView }    from './ui/taskView/index.js'
import { renderSettings }    from './ui/settingsView.js'

// ── Global state ────────────────────────────────────
let appState = { tasks: [], mode: 'normal', data: null }

// ── Expose to window for engine + UI modules ────────
window.__BE_ENGINE__ = { regenerateTasks, updateTaskState, loadCurrentState }
window.__BE_UI__     = {}   // populated by renderTaskView

// ── Boot ────────────────────────────────────────────
function init() {
  let result = bootEngine()

  // Daily momentum decay
  const decayed = applyDailyDecay(result.data)
  if (decayed !== result.data) {
    saveData(decayed)
    result = { ...result, data: decayed, tasks: decayed.tasks || result.tasks }
  }

  appState = result
  navigate('dashboard')
  bindNav()
  bindTitlebar()
  setBadge(appState.mode)
}

// ── Navigation ──────────────────────────────────────
function bindNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'))
      item.classList.add('active')
      navigate(item.dataset.view)
    })
  })
}

function navigate(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
  const c = document.getElementById('view-' + view)
  if (!c) return
  c.classList.add('active')
  if (view === 'dashboard') renderDashboard(c, appState)
  if (view === 'tasks')     renderTaskView(c, appState, onUpdate)
  if (view === 'settings')  renderSettings(c, onUpdate)
}

// ── State update ────────────────────────────────────
function onUpdate(newState) {
  if (!newState) return
  appState = { ...appState, ...newState }
  setBadge(appState.mode)
  const active = document.querySelector('.nav-item.active')?.dataset?.view
  if (active) navigate(active)
}

// ── Mode badge ──────────────────────────────────────
function setBadge(mode) {
  const el = document.getElementById('mode-badge')
  if (!el) return
  el.className  = 'mode-badge mode-' + mode
  el.textContent = mode.toUpperCase()
}

// ── Titlebar ────────────────────────────────────────
function bindTitlebar() {
  document.getElementById('btn-minimize')?.addEventListener('click', () => window.electronAPI?.minimize())
  document.getElementById('btn-maximize')?.addEventListener('click', () => window.electronAPI?.maximize())
  document.getElementById('btn-close')?.addEventListener('click',    () => window.electronAPI?.close())
}

init()