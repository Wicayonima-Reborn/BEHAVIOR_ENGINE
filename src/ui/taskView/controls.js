// ESM — auxiliary UI controls, dispatches actions only
import { getFeynmanPrompt } from '../../engine/mentalEngine.js'

const DONE_LINES = [
  'Good. Lanjut dikit lagi.', 'Satu sesi beres. Streak terjaga.',
  'Lu tetap jalan walau dikit.', 'Progress tetap progress.', 'Solid. Satu lagi?'
]

let _antiTimer = null

// ── RESUME BANNER ──────────────────────────────────────
export function renderResumeBanner(container, resumable, dispatch) {
  const el = container.querySelector('#resume-banner')
  if (!el || !resumable) return
  const { task, sessionLabel, isBreak } = resumable
  el.style.display = 'block'
  el.innerHTML = `
    <div class="resume-inner anim-fade-down">
      <div class="resume-info">
        <span style="font-size:18px">${isBreak ? '☕' : '⏸'}</span>
        <div>
          <span class="resume-task">${task.name}</span>
          <span class="resume-sub">Berhenti di ${sessionLabel}${isBreak ? ' · Break' : ''}</span>
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary btn-sm" id="btn-resume">Resume →</button>
        <button class="btn btn-ghost   btn-sm" id="btn-reset">Reset</button>
      </div>
    </div>`
  el.querySelector('#btn-resume')?.addEventListener('click', () => {
    el.style.display = 'none'
    dispatch({ type: 'RESUME_TASK', taskId: task.id })
  })
  el.querySelector('#btn-reset')?.addEventListener('click', () => {
    el.style.display = 'none'
    dispatch({ type: 'RESET_TASK', taskId: task.id })
  })
}

// ── MICRO TOAST ────────────────────────────────────────
export function showMicroToast(container) {
  const el = container?.querySelector('#micro-toast')
  if (!el) return
  el.textContent = '+1 sesi · ' + DONE_LINES[Math.floor(Math.random() * DONE_LINES.length)]
  el.classList.add('toast-show')
  setTimeout(() => el.classList.remove('toast-show'), 3000)
}

// ── FEYNMAN ────────────────────────────────────────────
export function showFeynman(container, taskName) {
  const ov = container?.querySelector('#feynman-overlay')
  const tx = container?.querySelector('#feynman-text')
  if (!ov || !tx) return
  tx.textContent = getFeynmanPrompt(taskName)
  ov.style.display = 'flex'
}

export function bindFeynmanClose(container) {
  container.querySelector('#feynman-close')?.addEventListener('click', () => _hideFeynman(container))
  container.querySelector('#feynman-skip')?.addEventListener('click',  () => _hideFeynman(container))
}

function _hideFeynman(container) {
  const el = container?.querySelector('#feynman-overlay')
  if (el) el.style.display = 'none'
}

// ── ANTI-RESIST ────────────────────────────────────────
export function startAntiResist(container, ms = 12000) {
  clearTimeout(_antiTimer)
  _antiTimer = setTimeout(() => {
    const el = container?.querySelector('#anti-resist')
    if (el) { el.style.display = 'flex'; el.classList.add('ar-on') }
  }, ms)
}

export function clearAntiResist() { clearTimeout(_antiTimer) }
