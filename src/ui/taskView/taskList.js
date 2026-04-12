// ESM — task card rendering + event delegation, no logic
import { getSessionProgress } from '../../engine/sessionEngine.js'

export function renderTaskList(wrap, tasks, dispatch) {
  if (!wrap) return
  if (!tasks.length) {
    wrap.innerHTML = `<div class="card"><p class="empty-state">Belum ada task. Tambah aktivitas di <strong>Settings</strong>.</p></div>`
    return
  }
  wrap.innerHTML = `<ul class="task-list" id="task-list">${tasks.map(cardHTML).join('')}</ul>`
  wrap.querySelector('#task-list')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]')
    if (!btn) return
    const { action, id } = btn.dataset
    const map = { 'start-full': 'START_TASK', 'start-mini': 'START_TASK_MINI', 'skip': 'SKIP_TASK' }
    dispatch({ type: map[action] || action.toUpperCase(), taskId: id })
  })
}

function cardHTML(t) {
  const prog    = getSessionProgress(t)
  const isDone  = t.state === 'done'  || t.status === 'done'
  const isSkip  = t.status === 'skip'
  const isRun   = t.state === 'running'
  const isBrk   = t.state === 'break'
  const isTrans = t.state === 'transition'
  const isDead  = isDone || isSkip
  const mode    = t.mode || 'normal'
  const curDur  = t.sessions?.[prog.current] ?? t.duration

  const segs = (t.sessions || []).map((_, i) => {
    const c = i < prog.completed ? 'seg-done' : (i === prog.current && isRun ? 'seg-active' : '')
    return `<div class="seg ${c}"></div>`
  }).join('')

  const streak = (t.stats?.streak ?? 0) > 1 ? `<span class="tc-streak">🔥 ${t.stats.streak}</span>` : ''
  const momBar = momHTML(t.momentum ?? 0)

  return `
    <li class="task-card ${isDone?'tc-done':''} ${isRun||isBrk||isTrans?'tc-active':''} ${isSkip?'tc-skip':''}"
        data-id="${t.id}" id="tc-${t.id}">
      <div class="tc-top">
        <div class="tc-check ${isDone?'checked':''}">${isDone?'✓':''}</div>
        <div class="tc-info">
          <span class="tc-name">${t.name}</span>
          <div class="tc-meta-row">
            <span class="tc-dur">${t.total ?? t.duration} mnt</span>
            ${t.sessions?.length > 1 ? `<span class="tc-segs">${prog.completed}/${prog.total} sesi</span>` : ''}
            <span class="tc-chip chip-${mode}">${mode}</span>
            ${streak}
          </div>
          ${momBar}
        </div>
        <div class="tc-status">
          ${isRun   ? `<span class="chip chip-run">● Running</span>` : ''}
          ${isBrk   ? `<span class="chip chip-break">☕ Break</span>` : ''}
          ${isTrans ? `<span class="chip chip-trans">→</span>` : ''}
          ${isDone  ? `<span class="chip chip-done">✓ Done</span>` : ''}
          ${isSkip  ? `<span class="chip chip-skip">Skip</span>` : ''}
        </div>
      </div>
      ${t.sessions?.length > 1 ? `<div class="seg-bar">${segs}</div>` : ''}
      ${!isDead && !isRun && !isBrk && !isTrans ? `
        <div class="tc-actions">
          <button class="btn btn-primary btn-sm" data-action="start-full" data-id="${t.id}">▶ Mulai ${curDur}m</button>
          ${curDur > 5 ? `<button class="btn btn-soft btn-sm" data-action="start-mini" data-id="${t.id}">▶ 5m aja</button>` : ''}
          <button class="btn btn-ghost btn-sm tc-skip-btn" data-action="skip" data-id="${t.id}">Skip</button>
        </div>` : ''}
    </li>`
}

function momHTML(val) {
  const level = Math.min(5, Math.max(0, Math.round(val)))
  if (level === 0) return ''
  const bars = Array.from({length:5}, (_,i) =>
    `<div class="mom-bar ${i < level ? 'mom-on':''}"></div>`).join('')
  return `<div class="mom-wrap"><span class="mom-lbl">momentum</span><div class="mom-bars">${bars}</div></div>`
}
