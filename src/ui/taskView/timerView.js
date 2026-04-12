// ESM — display only, zero logic
export function fmt(secs) {
  const s = Math.max(0, Math.round(secs ?? 0))
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
}

export function updateTimerEl(container, secs) {
  const el = container?.querySelector('#sp-timer')
  if (el) el.textContent = fmt(secs)
}

export function timerHTML(secs, state) {
  const cls = (state === 'break' || state === 'transition') ? 'timer-break' : 'timer-run'
  return `<div class="sp-timer ${cls}" id="sp-timer">${fmt(secs)}</div>`
}
