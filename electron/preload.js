'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  minimize:           function () { ipcRenderer.send('window-minimize') },
  maximize:           function () { ipcRenderer.send('window-maximize') },
  close:              function () { ipcRenderer.send('window-close') },
  sendSessionState:   function (data) { ipcRenderer.send('session-state', data) },
  onOverlayAction:    function (cb) {
    ipcRenderer.on('overlay-action', function (_, data) { cb(data) })
  },
  removeOverlayListeners: function () {
    ipcRenderer.removeAllListeners('overlay-action')
  }
})