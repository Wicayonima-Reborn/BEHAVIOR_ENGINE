// ESM — IPC sync only, no logic
export function syncOverlay(task) {
  if (!window.electronAPI?.sendSessionState) return
  window.electronAPI.sendSessionState({
    taskName:          task?.name              || '',
    state:             task?.state             || 'idle',
    remainingSeconds:  task?.remainingSeconds  ?? 0,
    sessions:          task?.sessions          || [],
    currentSession:    task?.currentSession    ?? 0,
    completedSessions: task?.completedSessions ?? 0,
    mode:              task?.mode              || 'normal'
  })
}

export function clearOverlay() { syncOverlay({ state: 'idle' }) }

export function bindOverlayActions(dispatch) {
  if (!window.electronAPI?.onOverlayAction) return
  window.electronAPI.removeOverlayListeners?.()
  window.electronAPI.onOverlayAction(data => {
    if (data.action === 'stop')        dispatch({ type: 'INTERRUPT_SESSION' })
    if (data.action === 'done-early')  dispatch({ type: 'COMPLETE_SESSION_EARLY' })
    if (data.action === 'skip-break')  dispatch({ type: 'SKIP_BREAK' })
  })
}