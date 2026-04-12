// ESM — taskView entry point
// Presentation only: render state, dispatch actions, no business logic
import { renderTaskList }          from './taskList.js'
import { renderSpotlight,
         hideSpotlight, tickSpotlight,
         undimCards }              from './spotlight.js'
import { renderResumeBanner,
         showMicroToast, showFeynman,
         bindFeynmanClose,
         startAntiResist, clearAntiResist } from './controls.js'
import { syncOverlay, clearOverlay,
         bindOverlayActions }      from './overlayBridge.js'
import { detectResumable }         from '../../engine/sessionEngine.js'
import { createSessionController } from '../../engine/sessionController.js'
import { loadCurrentState }        from '../../engine/behaviorEngine.js'

let _c  = null   // container
let _cb = null   // onUpdate callback
let _sc = null   // session controller (singleton)

// ── UI CALLBACKS (called by sessionController) ─────────────────────
// Exposed on window.__BE_UI__ so sessionController can reach them
function _uiCallbacks() {
  return {
    onTick(task) {
      tickSpotlight(_c, task.remainingSeconds)
      syncOverlay(task)
    },
    onStateChange(task) {
      renderSpotlight(_c, task, dispatch)
      syncOverlay(task)
      if (task.state === 'running') startAntiResist(_c)
      if (task.state === 'break' || task.state === 'transition') clearAntiResist()
    },
    onSessionComplete(task) {
      showMicroToast(_c)
    },
    onTaskDone(task) {
      clearAntiResist()
      clearOverlay()
      hideSpotlight(_c)
      undimCards(_c)
      showFeynman(_c, task.name)
      _refresh()
    }
  }
}

// ── RENDER ENTRY ──────────────────────────────────────
export function renderTaskView(container, { tasks, mode }, onUpdate) {
  _c = container; _cb = onUpdate

  // Create controller once
  if (!_sc) _sc = createSessionController()

  // Register UI callbacks so controller can call them
  window.__BE_UI__ = _uiCallbacks()

  const resumable = detectResumable(tasks)

  container.innerHTML = `
    <div id="resume-banner" style="display:none;margin-bottom:16px;"></div>
    <div id="spotlight-overlay" style="display:none;margin-bottom:20px;"></div>
    <div class="tv-hdr">
      <h2 class="tv-title">Tasks</h2>
      <button class="btn btn-ghost btn-sm" id="btn-regen">↺ Refresh</button>
    </div>
    <div class="micro-toast" id="micro-toast"></div>
    <div id="task-list-wrap"></div>
    <div class="feynman-ov" id="feynman-overlay" style="display:none;">
      <div class="feynman-box card anim-scale-in">
        <p class="feynman-lbl">✦ Feynman Check</p>
        <p id="feynman-text" class="feynman-text"></p>
        <div style="display:flex;gap:10px">
          <button class="btn btn-primary" id="feynman-close">Oke, ngerti 👍</button>
          <button class="btn btn-ghost"   id="feynman-skip">Lewati</button>
        </div>
      </div>
    </div>`

  _injectStyles()
  bindFeynmanClose(container)
  bindOverlayActions(dispatch)

  renderTaskList(container.querySelector('#task-list-wrap'), tasks, dispatch)
  if (resumable) renderResumeBanner(container, resumable, dispatch)

  container.querySelector('#btn-regen')?.addEventListener('click', () => dispatch({ type: 'REGENERATE_TASKS' }))

  // Restore active session if app re-mounted mid-session
  const active = tasks.find(t => t.state === 'running' || t.state === 'break' || t.state === 'transition')
  if (active) { _sc.restore(active); renderSpotlight(container, active, dispatch) }
}

// ── DISPATCH ──────────────────────────────────────────
function dispatch(action) {
  if (!_sc) return
  switch (action.type) {
    case 'START_TASK':              _sc.start(action.taskId, false); break
    case 'START_TASK_MINI':         _sc.start(action.taskId, true);  break
    case 'RESUME_TASK':             _sc.resume(action.taskId);        break
    case 'RESET_TASK':              _sc.reset(action.taskId);  _refresh(); break
    case 'INTERRUPT_SESSION':       _sc.interrupt(); _onStop(); break
    case 'COMPLETE_SESSION_EARLY':  _sc.completeEarly(); break
    case 'SKIP_BREAK':              _sc.skipBreak(); break
    case 'ABANDON_TASK':            _sc.abandon(action.taskId); _onStop(); break
    case 'SKIP_TASK':               _sc.skipTask(action.taskId); _refresh(); break
    case 'REGENERATE_TASKS': {
      const { regenerateTasks } = window.__BE_ENGINE__ || {}
      if (regenerateTasks) _cb(regenerateTasks())
      break
    }
  }
}

function _onStop() {
  clearAntiResist(); clearOverlay(); hideSpotlight(_c); undimCards(_c); _refresh()
}

function _refresh() {
  const s = loadCurrentState(); if (_cb) _cb(s)
}

// ── STYLES ────────────────────────────────────────────
function _injectStyles() {
  if (document.getElementById('tv-styles')) return
  const s = document.createElement('style'); s.id = 'tv-styles'
  s.textContent = `
    .tv-hdr   { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
    .tv-title { font-size:22px; font-weight:700; color:var(--text-primary); }

    /* resume */
    .resume-inner { background:var(--bg-card); border:1px solid var(--accent); border-radius:var(--radius);
      padding:14px 18px; display:flex; align-items:center; justify-content:space-between; gap:16px; }
    .resume-info  { display:flex; align-items:center; gap:12px; }
    .resume-task  { display:block; font-weight:700; color:var(--text-primary); }
    .resume-sub   { font-size:12px; color:var(--text-muted); }

    /* toast */
    .micro-toast { position:fixed; bottom:24px; left:50%; transform:translateX(-50%) translateY(20px);
      background:var(--bg-card); border:1px solid var(--success); color:var(--success);
      border-radius:99px; padding:8px 20px; font-size:13px; font-weight:600;
      opacity:0; transition:opacity 0.3s,transform 0.3s; pointer-events:none; z-index:200; white-space:nowrap; }
    .micro-toast.toast-show { opacity:1; transform:translateX(-50%) translateY(0); }

    /* spotlight card */
    .sp-card  { padding:24px; }
    .sp-hdr   { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:6px; }
    .sp-name  { display:block; font-size:17px; font-weight:800; color:var(--text-primary); }
    .sp-streak{ font-size:11px; color:var(--warning); font-weight:700; }
    .sp-chip  { font-size:11px; font-weight:700; padding:3px 10px; border-radius:99px; flex-shrink:0; }
    .sp-tone  { font-size:13px; color:var(--text-muted); font-style:italic; margin:10px 0 16px; }

    /* momentum */
    .sp-mom      { display:flex; align-items:center; gap:8px; margin-bottom:14px; }
    .sp-mom-lbl  { font-size:10px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:var(--text-muted); }
    .sp-mom-bars { display:flex; gap:3px; }
    .sp-mom-bar  { width:16px; height:4px; border-radius:99px; background:var(--border); transition:background 0.3s; }
    .sp-mom-on   { background:var(--mode-accent); }

    /* seg bar */
    .sp-seg-bar { display:flex; gap:5px; margin-bottom:20px; }
    .sp-seg     { flex:1; height:5px; border-radius:99px; background:var(--border); transition:background 0.3s; }
    .sp-seg-done   { background:var(--success); }
    .sp-seg-active { background:var(--mode-timer); animation:pulse 1.5s ease-in-out infinite; }

    /* timer */
    .sp-timer { font-size:70px; font-weight:800; letter-spacing:0.04em; font-variant-numeric:tabular-nums;
      text-align:center; line-height:1; margin-bottom:8px; }
    .timer-run   { color:var(--mode-timer); }
    .timer-break { color:var(--warning); }

    .sp-sub   { text-align:center; font-size:12px; color:var(--text-muted); margin-bottom:20px; }
    .sp-ctrls { display:flex; gap:10px; justify-content:center; margin-bottom:10px; }

    /* anti-resist */
    .anti-resist { align-items:center; justify-content:space-between; background:rgba(124,106,247,0.08);
      border:1px dashed var(--accent); border-radius:var(--radius-sm); padding:10px 14px;
      font-size:13px; color:var(--accent); margin-bottom:14px; opacity:0; transition:opacity 0.4s; }
    .anti-resist.ar-on { opacity:1; }

    /* task list */
    .task-list { list-style:none; display:flex; flex-direction:column; gap:10px; }
    .task-card { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius);
      padding:16px; transition:opacity 0.3s,filter 0.3s,border-color 0.3s; }
    .task-card.tc-done   { opacity:0.4; }
    .task-card.tc-skip   { opacity:0.3; }
    .task-card.tc-active { border-color:var(--mode-accent); background:linear-gradient(135deg,var(--bg-card) 0%,var(--accent-glow) 100%); }

    .tc-top   { display:flex; align-items:flex-start; gap:12px; }
    .tc-check { width:22px; height:22px; border-radius:50%; border:2px solid var(--border);
      display:flex; align-items:center; justify-content:center; font-size:11px; flex-shrink:0; margin-top:2px; }
    .tc-check.checked { background:var(--success); border-color:var(--success); color:#000; font-weight:800; }
    .tc-info  { flex:1; min-width:0; }
    .tc-name  { display:block; font-size:14px; font-weight:700; color:var(--text-primary); margin-bottom:4px; }
    .tc-done .tc-name { text-decoration:line-through; color:var(--text-muted); }
    .tc-meta-row { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
    .tc-dur,.tc-segs { font-size:12px; color:var(--text-muted); }
    .tc-streak { font-size:11px; color:var(--warning); font-weight:700; }
    .tc-chip,.chip { font-size:10px; font-weight:700; padding:2px 8px; border-radius:99px; letter-spacing:0.06em; }
    .chip-normal,.tc-chip.chip-normal { background:var(--accent-glow); color:var(--accent); }
    .chip-lazy,.tc-chip.chip-lazy     { background:rgba(248,113,113,0.12); color:var(--danger); }
    .chip-focus,.tc-chip.chip-focus   { background:rgba(74,222,128,0.12);  color:var(--success); }
    .chip-run     { background:var(--accent-glow); color:var(--accent); }
    .chip-break   { background:rgba(250,204,21,0.12); color:var(--warning); }
    .chip-trans   { background:rgba(255,255,255,0.05); color:var(--text-muted); }
    .chip-done    { background:rgba(74,222,128,0.1);  color:var(--success); }
    .chip-skip    { color:var(--text-muted); }
    .tc-status { flex-shrink:0; }

    /* momentum mini */
    .mom-wrap  { display:flex; align-items:center; gap:6px; margin-top:6px; }
    .mom-lbl   { font-size:9px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:var(--text-muted); }
    .mom-bars  { display:flex; gap:2px; }
    .mom-bar   { width:12px; height:3px; border-radius:99px; background:var(--border); }
    .mom-on    { background:var(--mode-accent); }

    /* seg bar mini */
    .seg-bar { display:flex; gap:4px; margin-top:10px; }
    .seg     { flex:1; height:4px; border-radius:99px; background:var(--border); max-width:40px; transition:background 0.3s; }
    .seg-done   { background:var(--success); }
    .seg-active { background:var(--accent); animation:pulse 1.5s ease-in-out infinite; }

    .tc-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; padding-top:14px; border-top:1px solid var(--border); }
    .tc-skip-btn { margin-left:auto; }

    /* feynman */
    .feynman-ov  { position:fixed; inset:0; background:rgba(0,0,0,0.8); display:flex;
      align-items:center; justify-content:center; z-index:300; }
    .feynman-box { max-width:480px; width:90%; display:flex; flex-direction:column; gap:14px; }
    .feynman-lbl { font-size:13px; font-weight:700; color:var(--accent); }
    .feynman-text{ color:var(--text-primary); line-height:1.75; font-size:14px; }
  `
  document.head.appendChild(s)
}
