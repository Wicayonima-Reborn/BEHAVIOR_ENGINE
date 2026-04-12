// ESM
import { saveActivity, deleteActivity, regenerateTasks, loadCurrentState } from '../engine/behaviorEngine.js'
import { loadData } from '../data/storage.js'

export function renderSettings(container, onUpdate) {
  const data = loadData()
  container.innerHTML = `
    <div class="sv-hdr"><h2 class="sv-title">Settings</h2></div>

    <div class="card" style="margin-bottom:16px;">
      <p class="section-title">Aktivitas</p>
      <ul class="act-list" id="act-list">
        ${data.activities.length
          ? data.activities.map(actHTML).join('')
          : `<li class="empty-state">Belum ada aktivitas.</li>`}
      </ul>
    </div>

    <div class="card">
      <p class="section-title">Tambah / Edit Aktivitas</p>
      <div class="form-grid">
        <div class="form-grp">
          <label>Nama</label>
          <input id="inp-name" type="text" placeholder="Belajar, Ngoding, dll" />
        </div>
        <div class="form-grp">
          <label>Priority (1–5)</label>
          <input id="inp-pri" type="number" min="1" max="5" value="3" />
        </div>
        <div class="form-grp">
          <label>Durasi Min (mnt)</label>
          <input id="inp-min" type="number" min="5" max="120" value="25" />
        </div>
        <div class="form-grp">
          <label>Durasi Max (mnt)</label>
          <input id="inp-max" type="number" min="5" max="240" value="60" />
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn btn-primary" id="btn-save">Simpan</button>
        <button class="btn btn-ghost"   id="btn-regen">↺ Regenerate Tasks</button>
      </div>
      <p class="form-fb" id="form-fb"></p>
    </div>`

  _injectStyles()

  container.querySelector('#act-list')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-del]')
    if (!btn) return
    deleteActivity(btn.dataset.del)
    renderSettings(container, onUpdate)
  })

  container.querySelector('#btn-save')?.addEventListener('click', () => {
    const name = container.querySelector('#inp-name').value.trim()
    const pri  = parseFloat(container.querySelector('#inp-pri').value)
    const min  = parseInt(container.querySelector('#inp-min').value)
    const max  = parseInt(container.querySelector('#inp-max').value)
    const fb   = container.querySelector('#form-fb')
    if (!name) { _fb(fb, 'Nama wajib diisi.', 'err'); return }
    if (min >= max) { _fb(fb, 'Min harus lebih kecil dari Max.', 'err'); return }
    saveActivity({ name, priority: pri, min, max })
    _fb(fb, `"${name}" tersimpan.`, 'ok')
    renderSettings(container, onUpdate)
  })

  container.querySelector('#btn-regen')?.addEventListener('click', () => {
    onUpdate(regenerateTasks())
    _fb(container.querySelector('#form-fb'), 'Tasks hari ini di-refresh.', 'ok')
  })
}

function actHTML(a) {
  return `
    <li class="act-item">
      <div class="act-info">
        <span class="act-name">${a.name}</span>
        <span class="act-meta">Priority ${a.priority} · ${a.min}–${a.max} mnt</span>
      </div>
      <button class="btn btn-danger btn-sm" data-del="${a.name}">Hapus</button>
    </li>`
}

function _fb(el, msg, type) {
  if (!el) return
  el.textContent = msg; el.className = 'form-fb ' + type
  setTimeout(() => { el.textContent = ''; el.className = 'form-fb' }, 3000)
}

function _injectStyles() {
  if (document.getElementById('sv-styles')) return
  const s = document.createElement('style'); s.id = 'sv-styles'
  s.textContent = `
    .sv-hdr  { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
    .sv-title{ font-size:22px; font-weight:700; color:var(--text-primary); }
    .act-list{ list-style:none; display:flex; flex-direction:column; gap:10px; }
    .act-item{ display:flex; align-items:center; gap:12px; padding:12px; background:var(--bg-hover);
      border-radius:var(--radius-sm); border:1px solid var(--border); }
    .act-info{ flex:1; }
    .act-name{ font-weight:600; color:var(--text-primary); display:block; }
    .act-meta{ font-size:12px; color:var(--text-muted); }
    .form-grid{ display:grid; grid-template-columns:1fr 1fr; gap:14px; }
    .form-grp { display:flex; flex-direction:column; gap:6px; }
    .form-grp label { font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.06em; }
    .form-grp input { background:var(--bg-hover); border:1px solid var(--border); border-radius:var(--radius-sm);
      padding:8px 10px; color:var(--text-primary); font-size:13px; outline:none; transition:border 0.15s; }
    .form-grp input:focus { border-color:var(--accent); }
    .form-fb { margin-top:10px; font-size:12px; min-height:18px; }
    .form-fb.ok  { color:var(--success); }
    .form-fb.err { color:var(--danger); }
  `
  document.head.appendChild(s)
}