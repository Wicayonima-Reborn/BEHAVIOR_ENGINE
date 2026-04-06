const { app, BrowserWindow, ipcMain, screen } = require('electron')
const path = require('path')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow    = null
let overlayWindow = null

// ─────────────────────────────────────────
// MAIN WINDOW
// ─────────────────────────────────────────

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    backgroundColor: '#0f0f13',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    overlayWindow?.close()
  })
}

// ─────────────────────────────────────────
// OVERLAY WINDOW
// ─────────────────────────────────────────

function createOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) return

  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  overlayWindow = new BrowserWindow({
    width:  210,
    height: 200,
    x: width  - 230,
    y: height - 220,
    frame:       false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable:   false,
    hasShadow:   false,
    webPreferences: {
      nodeIntegration:  true,   // overlay.html uses require('electron') directly
      contextIsolation: false
    }
  })

  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow.setVisibleOnAllWorkspaces(true)

  overlayWindow.loadFile(path.join(__dirname, '../overlay/overlay.html'))

  overlayWindow.on('closed', () => { overlayWindow = null })
}

function showOverlay() {
  if (!overlayWindow || overlayWindow.isDestroyed()) createOverlayWindow()
  else overlayWindow.show()
}

function hideOverlay() {
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.hide()
}

// ─────────────────────────────────────────
// IPC — WINDOW CONTROLS
// ─────────────────────────────────────────

ipcMain.on('window-minimize', (e) => BrowserWindow.fromWebContents(e.sender)?.minimize())
ipcMain.on('window-maximize', (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  win?.isMaximized() ? win.unmaximize() : win.maximize()
})
ipcMain.on('window-close', (e) => BrowserWindow.fromWebContents(e.sender)?.close())

// ─────────────────────────────────────────
// IPC — SESSION BRIDGE
// ─────────────────────────────────────────

/**
 * Main renderer → overlay
 * Payload: { taskName, state, remainingSeconds, sessions, currentSession, completedSessions }
 */
ipcMain.on('session-state', (_, data) => {
  if (data.state === 'running' || data.state === 'break') {
    showOverlay()
    overlayWindow?.webContents.send('session-update', data)
  } else {
    overlayWindow?.webContents.send('session-update', data)
    setTimeout(() => hideOverlay(), 2000)
  }
})

/**
 * Overlay → main renderer
 * Actions: 'stop' | 'done-early' | 'skip-break' | 'hide-overlay'
 */
ipcMain.on('overlay-action', (_, data) => {
  if (data.action === 'hide-overlay') { hideOverlay(); return }
  mainWindow?.webContents.send('overlay-action', data)
})

// ─────────────────────────────────────────
// APP LIFECYCLE
// ─────────────────────────────────────────

app.whenReady().then(() => {
  createMainWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})