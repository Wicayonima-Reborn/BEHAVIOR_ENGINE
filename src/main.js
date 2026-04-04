// src/main.js
// Entry point: boots engine, handles navigation, manages global state

import { bootEngine, regenerateTasks } from './engine/behaviorEngine.js'
import { renderDashboard }             from './ui/dashboard.js'
import { renderTaskView }              from './ui/taskView.js'
import { renderSettings }              from './ui/settingsView.js'

// ── Global State ──────────────────────────────────────────────
let appState = { tasks: [], mode: 'normal', data: null }

// Expose regenerateTasks for taskView
window.__BE_ENGINE__ = { regenerateTasks }

// ── Boot ──────────────────────────────────────────────────────
function init() {
  const result = bootEngine()
  appState = result
  renderView('dashboard')
  bindNavigation()
  bindTitlebarControls()
  updateModeBadge(appState.mode)
}

// ── Navigation ─────────────────────────────────────────────────
function bindNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'))
      item.classList.add('active')
      renderView(item.dataset.view)
    })
  })
}

function renderView(viewName) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'))
  const container = document.getElementById(`view-${viewName}`)
  if (!container) return
  container.classList.add('active')

  switch (viewName) {
    case 'dashboard':
      renderDashboard(container, appState)
      break
    case 'tasks':
      renderTaskView(container, appState, onStateUpdate)
      break
    case 'settings':
      renderSettings(container, onStateUpdate)
      break
  }
}

// ── State Update Callback ──────────────────────────────────────
// Called by any UI component that changes state
function onStateUpdate(newState) {
  if (!newState) return
  appState = { ...appState, ...newState }
  updateModeBadge(appState.mode)

  // Re-render active view
  const activeView = document.querySelector('.nav-item.active')?.dataset?.view
  if (activeView) renderView(activeView)
}

// ── Mode Badge ────────────────────────────────────────────────
function updateModeBadge(mode) {
  const badge = document.getElementById('mode-badge')
  if (!badge) return
  badge.className = `mode-badge mode-${mode}`
  badge.textContent = `${mode.toUpperCase()}`
}

// ── Titlebar Controls ─────────────────────────────────────────
function bindTitlebarControls() {
  document.getElementById('btn-minimize')?.addEventListener('click', () => {
    window.electronAPI?.minimize()
  })
  document.getElementById('btn-maximize')?.addEventListener('click', () => {
    window.electronAPI?.maximize()
  })
  document.getElementById('btn-close')?.addEventListener('click', () => {
    window.electronAPI?.close()
  })
}

// ── Start ─────────────────────────────────────────────────────
init()