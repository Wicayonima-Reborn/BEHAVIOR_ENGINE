const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),

  // Send session state to overlay (called from taskView.js)
  sendSessionState: (data) => ipcRenderer.send('session-state', data),

  // Listen for overlay actions (stop / done-early / skip-break)
  onOverlayAction: (callback) => {
    ipcRenderer.on('overlay-action', (_, data) => callback(data))
  },

  // Remove overlay action listener (cleanup)
  removeOverlayListeners: () => {
    ipcRenderer.removeAllListeners('overlay-action')
  }
})