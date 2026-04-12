// ESM — spotlight/focus session panel, pure rendering
import { timerHTML, fmt }        from './timerView.js'
import { getBreakDuration, getSessionProgress } from '../../engine/sessionEngine.js'

const TONE = {
  running: { normal: d=>`Fokus sesi ini aja. Cuma ${d} menit.`, lazy: d=>`Cuma ${d} menit. Serius.`, focus: d=>`${d} menit. Zona aktif.` },
  break:   { normal: ()=>'Istirahat bentar. Jangan kabur.', lazy: ()=>'3 menit. Santai.', focus: ()=>'Recharge. Lanjut lagi.' },
  transition: { normal: ()=>'Sebentar lagi...', lazy: ()=>'Sebentar lagi...', focus: ()=>'Sebentar lagi...' }
}

export function renderSpotlight(container, task, dispatch) {
  const el = container.querySelector('#spotlight-overlay')
  if (!el) return
  el.style.display = 'block'
  el.innerHTML = _html(task)
  _bind(el, task, dispatch)
  _atmosphere(task)
  _dimOthers(container, task.id)
}

export function hideSpotlight(container) {
  const el = container?.querySelector('#spotlight-overlay')
  if (el) el.style.display = 'none'
  _clearAtmosphere()
  _undim(container)
}

export function tickSpotlight(container, secs) {
  const el = container?.querySelector('#sp-timer')
  if (el) el.textContent = fmt(secs)
}

export function dimOtherCards(container, activeId) { _dimOthers(container, activeId) }
export function undimCards(container)              { _undim(container) }

// ── HTML ──────────────────────────────────────────────
function _html(task) {
  const prog    = getSessionProgress(task)
  const isBreak = task.state === 'break'
  const isTrans = task.state === 'transition'
  const mode    = task.mode || 'normal'
  const curDur  = task.sessions?.[prog.current] ?? task.duration
  const toneKey = isBreak ? 'break' : isTrans ? 'transition' : 'running'
  const tone    = (TONE[toneKey][mode] || TONE[toneKey].normal)(curDur)
  const segs    = (task.sessions || []).map((_, i) => {
    const c = i < prog.completed ? 'sp-seg-done' : (i === prog.current && !isBreak && !isTrans ? 'sp-seg-active' : '')
    return `<div class="sp-seg ${c}"></div>`
  }).join('')
  const streak  = (task.stats?.streak ?? 0) > 1 ? `<span class="sp-streak">🔥 ${task.stats.streak} streak</span>` : ''
  const momBars = _momHTML(task.momentum ?? 0)
  const secs    = task.remainingSeconds ?? (curDur * 60)

  return `
    <div class="sp-card card glow-active anim-scale-in">
      <div class="sp-hdr">
        <div><span class="sp-name">${task.name}</span>${streak}</div>
        <span class="sp-chip ${isBreak?'chip-break':isTrans?'chip-trans':'chip-run'}">
          ${isBreak ? '☕ Break' : isTrans ? '→ Transisi' : `Sesi ${prog.current+1} / ${prog.total}`}
        </span>
      </div>
      <p class="sp-tone">${tone}</p>
      ${momBars}
      <div class="sp-seg-bar">${segs}</div>
      ${timerHTML(secs, task.state)}
      <div class="sp-sub">${isBreak ? `Break ${getBreakDuration(task.completedSessions, mode)} mnt` : isTrans ? 'Mempersiapkan...' : `${curDur} mnt · ${mode} mode`}</div>
      <div class="anti-resist" id="anti-resist" style="display:none;">
        <span>Mulai 5 menit aja dulu.</span>
        <button class="btn btn-primary btn-sm" id="ar-ok">Mulai Sekarang</button>
      </div>
      <div class="sp-ctrls">
        ${isBreak || isTrans
          ? `<button class="btn btn-primary" id="sp-skip">Lewati →</button>`
          : `<button class="btn btn-success" id="sp-early">✓ Selesai Lebih Awal</button>
             <button class="btn btn-ghost"   id="sp-stop">✕ Stop Sesi</button>`}
      </div>
      <div style="text-align:center;margin-top:8px">
        <button class="btn btn-danger" id="sp-abandon">Abandon Task</button>
      </div>
    </div>`
}

function _momHTML(val) {
  const lv = Math.min(5, Math.max(0, Math.round(val)))
  if (!lv) return ''
  return `<div class="sp-mom"><span class="sp-mom-lbl">Momentum</span><div class="sp-mom-bars">${
    Array.from({length:5},(_,i)=>`<div class="sp-mom-bar ${i<lv?'sp-mom-on':''}"></div>`).join('')
  }</div></div>`
}

// ── BIND ─────────────────────────────────────────────
function _bind(el, task, dispatch) {
  el.querySelector('#sp-skip')?.addEventListener('click',    () => dispatch({ type: 'SKIP_BREAK' }))
  el.querySelector('#sp-early')?.addEventListener('click',   () => dispatch({ type: 'COMPLETE_SESSION_EARLY' }))
  el.querySelector('#sp-stop')?.addEventListener('click',    () => dispatch({ type: 'INTERRUPT_SESSION' }))
  el.querySelector('#sp-abandon')?.addEventListener('click', () => dispatch({ type: 'ABANDON_TASK', taskId: task.id }))
  el.querySelector('#ar-ok')?.addEventListener('click', () => {
    const ar = el.querySelector('#anti-resist')
    if (ar) ar.style.display = 'none'
  })
}

// ── ATMOSPHERE ────────────────────────────────────────
function _atmosphere(task) {
  document.querySelector('#sidebar')?.classList.add('session-active')
  document.querySelector('#main-panel')?.classList.add('session-active')
  document.body.className = 'mode-' + (task.mode || 'normal')
}
function _clearAtmosphere() {
  document.querySelector('#sidebar')?.classList.remove('session-active')
  document.querySelector('#main-panel')?.classList.remove('session-active')
  document.body.className = ''
}
function _dimOthers(container, activeId) {
  container?.querySelectorAll('.task-card').forEach(c => {
    const on = c.dataset.id === activeId
    c.style.opacity       = on ? '' : '0.25'
    c.style.filter        = on ? '' : 'blur(1px)'
    c.style.pointerEvents = on ? '' : 'none'
  })
}
function _undim(container) {
  container?.querySelectorAll('.task-card').forEach(c => {
    c.style.opacity = ''; c.style.filter = ''; c.style.pointerEvents = ''
  })
}
