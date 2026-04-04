// src/ui/settingsView.js
import { saveActivity, deleteActivity, regenerateTasks } from '../engine/behaviorEngine.js'
import { loadData } from '../data/storage.js'

/**
 * Render settings view.
 * @param {HTMLElement} container
 * @param {Function} onUpdate
 */
export function renderSettings(container, onUpdate) {
  const data = loadData()

  container.innerHTML = `
    <div class="sv-header">
      <h2 class="sv-title">Settings</h2>
    </div>

    <!-- Activity Manager -->
    <div class="card" style="margin-bottom: 16px;">
      <p class="section-title">Aktivitas</p>
      <ul class="activity-list" id="activity-list">
        ${data.activities.length === 0
          ? `<li class="empty-state">Belum ada aktivitas. Tambah di bawah.</li>`
          : data.activities.map(a => activityItemHTML(a)).join('')
        }
      </ul>
    </div>

    <!-- Add Activity Form -->
    <div class="card">
      <p class="section-title">Tambah / Edit Aktivitas</p>
      <div class="form-grid">
        <div class="form-group">
          <label>Nama Aktivitas</label>
          <input type="text" id="inp-name" placeholder="Belajar, Ngoding, dll" />
        </div>
        <div class="form-group">
          <label>Priority (1–5)</label>
          <input type="number" id="inp-priority" min="1" max="5" value="3" />
        </div>
        <div class="form-group">
          <label>Durasi Min (menit)</label>
          <input type="number" id="inp-min" min="5" max="120" value="25" />
        </div>
        <div class="form-group">
          <label>Durasi Max (menit)</label>
          <input type="number" id="inp-max" min="5" max="240" value="60" />
        </div>
      </div>
      <div style="margin-top: 16px; display: flex; gap: 10px;">
        <button class="btn btn-primary" id="btn-save-activity">Simpan Aktivitas</button>
        <button class="btn btn-ghost"   id="btn-regen">↺ Regenerate Tasks Sekarang</button>
      </div>
      <p class="form-feedback" id="form-feedback"></p>
    </div>
  `

  injectSettingsStyles()
  bindSettingsEvents(container, onUpdate)
}

function activityItemHTML(a) {
  return `
    <li class="activity-item" data-name="${a.name}">
      <div class="act-info">
        <span class="act-name">${a.name}</span>
        <span class="act-meta">Priority ${a.priority} · ${a.min}–${a.max} mnt</span>
      </div>
      <button class="btn btn-danger btn-sm" data-action="delete" data-name="${a.name}">Hapus</button>
    </li>
  `
}

function bindSettingsEvents(container, onUpdate) {
  // Delete activity
  container.querySelector('#activity-list')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="delete"]')
    if (!btn) return
    const name = btn.dataset.name
    const data = deleteActivity(name)
    renderSettings(container, onUpdate)
  })

  // Save activity
  container.querySelector('#btn-save-activity')?.addEventListener('click', () => {
    const name     = container.querySelector('#inp-name').value.trim()
    const priority = parseFloat(container.querySelector('#inp-priority').value)
    const min      = parseInt(container.querySelector('#inp-min').value)
    const max      = parseInt(container.querySelector('#inp-max').value)
    const feedback = container.querySelector('#form-feedback')

    if (!name) { showFeedback(feedback, 'Nama aktivitas wajib diisi.', 'error'); return }
    if (min >= max) { showFeedback(feedback, 'Min harus lebih kecil dari Max.', 'error'); return }

    saveActivity({ name, priority, min, max })
    showFeedback(feedback, `"${name}" berhasil disimpan.`, 'success')
    renderSettings(container, onUpdate)
  })

  // Regenerate tasks
  container.querySelector('#btn-regen')?.addEventListener('click', () => {
    const state = regenerateTasks()
    onUpdate(state)
    showFeedback(container.querySelector('#form-feedback'), 'Tasks hari ini sudah di-refresh.', 'success')
  })
}

function showFeedback(el, msg, type) {
  if (!el) return
  el.textContent = msg
  el.className   = `form-feedback ${type}`
  setTimeout(() => { el.textContent = '' }, 3000)
}

function injectSettingsStyles() {
  if (document.getElementById('settings-styles')) return
  const s = document.createElement('style')
  s.id = 'settings-styles'
  s.textContent = `
    .sv-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .sv-title  { font-size: 22px; font-weight: 700; }

    .activity-list { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 4px; }
    .activity-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-hover); border-radius: var(--radius-sm); border: 1px solid var(--border); }
    .act-info  { flex: 1; }
    .act-name  { font-weight: 600; color: var(--text-primary); display: block; }
    .act-meta  { font-size: 12px; color: var(--text-muted); }

    .form-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; }
    .form-group label { font-size: 12px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
    .form-group input  { background: var(--bg-hover); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 8px 10px; color: var(--text-primary); font-size: 13px; outline: none; transition: border 0.15s; }
    .form-group input:focus { border-color: var(--accent); }

    .form-feedback { margin-top: 10px; font-size: 12px; min-height: 18px; }
    .form-feedback.success { color: var(--success); }
    .form-feedback.error   { color: var(--danger); }
  `
  document.head.appendChild(s)
}