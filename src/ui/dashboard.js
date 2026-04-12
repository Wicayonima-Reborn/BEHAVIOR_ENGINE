// src/ui/dashboard.js
// ESM
import { getQuotePool, getTimePeriod } from '../engine/mentalEngine.js'

let _pool  = []
let _idx   = 0
let _timer = null
let _auto  = true
const INTERVAL = 10000

export function renderDashboard(container, { tasks, mode }) {
  _pool = getQuotePool(mode)
  _idx  = 0
  clearInterval(_timer)

  const period  = getTimePeriod()
  const greet   = { pagi:'Selamat pagi ☀️', siang:'Selamat siang 🌤', sore:'Selamat sore 🌇', malam:'Selamat malam 🌙' }
  const total   = tasks.length
  const done    = tasks.filter(t => t.status === 'done').length
  const pending = tasks.filter(t => t.status === 'pending' || t.state === 'idle').length
  const skipped = tasks.filter(t => t.status === 'skip').length
  const pct     = total > 0 ? Math.round(done / total * 100) : 0

  container.innerHTML = `
    <div class="dsh-hdr">
      <div><h1 class="dsh-title">${greet[period]}</h1><p class="dsh-date">${_fmtDate()}</p></div>
      <span class="mode-chip mode-${mode}">${mode.toUpperCase()} MODE</span>
    </div>

    <div class="card quote-card" id="quote-card">
      <div class="q-period">${_periodLabel(period)}</div>
      <div class="q-body" id="q-body">
        <p class="q-text"   id="q-text"></p>
        <p class="q-author" id="q-author"></p>
      </div>
      <div class="q-dots"  id="q-dots"></div>
      <div class="q-ctrls">
        <button class="q-btn" id="q-prev">‹</button>
        <span   class="q-counter" id="q-counter">1 / ${_pool.length}</span>
        <button class="q-btn" id="q-next">›</button>
        <button class="q-btn q-play" id="q-auto" title="Pause">⏸</button>
      </div>
    </div>

    <div class="card prog-card">
      <p class="section-title">Progress Hari Ini</p>
      <div class="prog-track"><div class="prog-fill" style="width:${pct}%"></div></div>
      <div class="prog-stats">
        <span class="ps-done">✓ ${done} selesai</span>
        <span class="ps-pend">○ ${pending} pending</span>
        <span class="ps-skip">✕ ${skipped} skip</span>
      </div>
    </div>

    <div class="card">
      <p class="section-title">Task Hari Ini</p>
      ${total === 0
        ? `<p class="empty-state">Belum ada task. Setup aktivitas di <strong>Settings</strong>.</p>`
        : `<ul class="snap-list">${tasks.slice(0,4).map(t=>`
            <li class="snap-item status-${t.status||t.state}">
              <div class="snap-dot"></div>
              <span class="snap-name">${t.name}</span>
              <span class="snap-dur">${t.duration} mnt</span>
            </li>`).join('')}
            ${total > 4 ? `<li class="snap-more">+${total-4} lainnya</li>` : ''}
           </ul>`}
    </div>`

  _injectStyles()
  _buildDots(container)
  _show(container, 0, false)
  _startAuto(container)
  _bindCtrls(container)
}

function _buildDots(c) {
  const el = c.querySelector('#q-dots')
  if (!el) return
  el.innerHTML = _pool.map((_,i) => `<span class="qdot ${i===0?'qd-on':''}" data-i="${i}"></span>`).join('')
  el.addEventListener('click', e => {
    const dot = e.target.closest('.qdot')
    if (dot) _goto(c, +dot.dataset.i)
  })
}

function _show(c, idx, anim) {
  const q  = _pool[idx]; if (!q) return
  const tx = c.querySelector('#q-text')
  const au = c.querySelector('#q-author')
  const bd = c.querySelector('#q-body')
  const co = c.querySelector('#q-counter')
  if (!tx) return
  if (anim) {
    bd.classList.add('q-exit')
    setTimeout(() => {
      tx.textContent = `"${q.text}"`
      au.textContent = q.author ? `— ${q.author}` : ''
      bd.classList.remove('q-exit'); bd.classList.add('q-enter')
      setTimeout(() => bd.classList.remove('q-enter'), 450)
    }, 240)
  } else {
    tx.textContent = `"${q.text}"`
    au.textContent = q.author ? `— ${q.author}` : ''
  }
  if (co) co.textContent = `${idx+1} / ${_pool.length}`
  c.querySelectorAll('.qdot').forEach((d,i) => d.classList.toggle('qd-on', i===idx))
}

function _goto(c, idx) {
  _idx = ((idx % _pool.length) + _pool.length) % _pool.length
  _show(c, _idx, true)
}

function _startAuto(c) {
  clearInterval(_timer)
  _timer = setInterval(() => {
    if (!_auto) return
    _idx = (_idx + 1) % _pool.length
    _show(c, _idx, true)
  }, INTERVAL)
}

function _bindCtrls(c) {
  c.querySelector('#q-prev')?.addEventListener('click', () => _goto(c, _idx-1))
  c.querySelector('#q-next')?.addEventListener('click', () => _goto(c, _idx+1))
  c.querySelector('#q-auto')?.addEventListener('click', e => {
    _auto = !_auto
    e.target.textContent = _auto ? '⏸' : '▶'
  })
}

function _fmtDate() {
  return new Date().toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'})
}
function _periodLabel(p) {
  return {pagi:'🌅 Pagi',siang:'☀️ Siang',sore:'🌆 Sore',malam:'🌙 Malam'}[p]
}

function _injectStyles() {
  if (document.getElementById('dsh-styles')) return
  const s = document.createElement('style'); s.id = 'dsh-styles'
  s.textContent = `
    .dsh-hdr  { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:24px; }
    .dsh-title{ font-size:24px; font-weight:700; color:var(--text-primary); }
    .dsh-date { font-size:13px; color:var(--text-muted); margin-top:4px; }
    .mode-chip{ padding:4px 12px; border-radius:99px; font-size:11px; font-weight:700; letter-spacing:0.08em; }
    .mode-chip.mode-normal{ background:var(--accent-glow); color:var(--accent); }
    .mode-chip.mode-lazy  { background:rgba(248,113,113,0.15); color:var(--danger); }
    .mode-chip.mode-focus { background:rgba(74,222,128,0.15);  color:var(--success); }

    .quote-card { margin-bottom:16px; border-left:3px solid var(--accent); display:flex; flex-direction:column; gap:12px; position:relative; overflow:hidden; min-height:130px; }
    .quote-card::before { content:'"'; position:absolute; top:-12px; right:14px; font-size:90px; color:var(--accent-glow); font-family:Georgia,serif; line-height:1; pointer-events:none; }
    .q-period { font-size:10px; font-weight:700; color:var(--accent); letter-spacing:0.08em; text-transform:uppercase; }
    .q-body   { flex:1; }
    .q-text   { font-size:15px; line-height:1.7; color:var(--text-primary); font-style:italic; }
    .q-author { margin-top:8px; font-size:12px; color:var(--text-muted); font-style:normal; font-weight:600; min-height:16px; }
    @keyframes qExit  { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(-10px)} }
    @keyframes qEnter { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    .q-exit  { animation:qExit  0.24s ease forwards; }
    .q-enter { animation:qEnter 0.4s  ease forwards; }
    .q-dots  { display:flex; gap:5px; flex-wrap:wrap; }
    .qdot    { width:6px; height:6px; border-radius:50%; background:var(--border); cursor:pointer; transition:all 0.2s; }
    .qd-on   { background:var(--accent); transform:scale(1.4); }
    .q-ctrls { display:flex; align-items:center; gap:6px; }
    .q-btn   { background:transparent; border:1px solid var(--border); color:var(--text-secondary);
      width:28px; height:28px; border-radius:var(--radius-sm); cursor:pointer; font-size:16px;
      display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
    .q-btn:hover { background:var(--bg-hover); color:var(--text-primary); }
    .q-play { font-size:12px; margin-left:4px; }
    .q-counter { font-size:11px; color:var(--text-muted); min-width:36px; text-align:center; }

    .prog-card  { margin-bottom:16px; }
    .prog-track { background:var(--bg-hover); border-radius:99px; height:8px; margin:12px 0; overflow:hidden; }
    .prog-fill  { height:100%; background:var(--accent); border-radius:99px; transition:width 0.4s; }
    .prog-stats { display:flex; gap:16px; }
    .ps-done { font-size:12px; color:var(--success); }
    .ps-pend { font-size:12px; color:var(--text-secondary); }
    .ps-skip { font-size:12px; color:var(--danger); }

    .snap-list { list-style:none; display:flex; flex-direction:column; gap:10px; }
    .snap-item { display:flex; align-items:center; gap:10px; font-size:13px; }
    .snap-dot  { width:8px; height:8px; border-radius:50%; background:var(--text-muted); flex-shrink:0; }
    .snap-item.status-done .snap-dot  { background:var(--success); }
    .snap-item.status-skip .snap-dot  { background:var(--danger); }
    .snap-name { flex:1; color:var(--text-primary); }
    .snap-item.status-done .snap-name { text-decoration:line-through; color:var(--text-muted); }
    .snap-dur  { font-size:12px; color:var(--text-muted); }
    .snap-more { font-size:12px; color:var(--accent); cursor:pointer; }
  `
  document.head.appendChild(s)
}