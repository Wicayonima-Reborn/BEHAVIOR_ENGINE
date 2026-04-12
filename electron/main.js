'use strict'

/**
 * Main process entry point for the Electron application.
 * Handles window management, system tray integration, and IPC communication.
 */

const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron')
const path = require('path')

// Determine if the app is running in a development environment
const isDev = !app.isPackaged

// Global references to prevent garbage collection
let mainWindow    = null
let overlayWindow = null
let tray          = null

// ── MAIN WINDOW ──────────────────────────────────────────

/**
 * Initializes the primary application window.
 * Configures a frameless UI and handles the "close-to-tray" logic.
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1100, height: 720,
    minWidth: 800, minHeight: 600,
    frame: false, // Custom title bar implementation expected
    backgroundColor: '#0f0f13',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Load URL from local dev server or production build file
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Prevent app from quitting when the window is closed; hide it instead
  mainWindow.on('close', function (e) {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', function () { 
    mainWindow = null 
  })
}

// ── OVERLAY WINDOW ────────────────────────────────────────

/**
 * Creates a small, transparent, and non-resizable overlay window.
 * Positions it at the bottom-right of the primary screen.
 */
function createOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) return

  const display = screen.getPrimaryDisplay().workAreaSize

  overlayWindow = new BrowserWindow({
    width: 220, height: 230,
    x: display.width  - 240,
    y: display.height - 250,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // Ensure visibility over full-screen apps and other workspaces
  overlayWindow.setAlwaysOnTop(true, 'screen-saver')
  overlayWindow.setVisibleOnAllWorkspaces(true)
  
  overlayWindow.loadFile(path.join(__dirname, '../overlay/overlay.html'))
  overlayWindow.on('closed', function () { 
    overlayWindow = null 
  })
}

/**
 * Displays the overlay window or creates it if it doesn't exist.
 */
function showOverlay() {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    createOverlayWindow()
  } else {
    overlayWindow.show()
  }
}

/**
 * Hides the overlay window without destroying the instance.
 */
function hideOverlay() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.hide()
  }
}

// ── TRAY ─────────────────────────────────────────────────

/**
 * Initializes the system tray icon and attaches a context menu.
 */
function createTray() {
  const icon = nativeImage.createEmpty() // Placeholder or invisible icon
  tray = new Tray(icon)
  tray.setToolTip('Behavior Engine')
  rebuildTrayMenu(null)

  // Restore main window visibility on tray click
  tray.on('click', function () {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus()
      } else {
        mainWindow.show()
      }
    }
  })
}

/**
 * Updates the tray menu items dynamically based on the current session.
 * @param {string|null} sessionLabel - The text to display for the active session.
 */
function rebuildTrayMenu(sessionLabel) {
  if (!tray) return
  
  const items = [
    { label: 'Behavior Engine', enabled: false },
    { type: 'separator' },
    { label: sessionLabel || 'No active session', enabled: false },
    { type: 'separator' },
    {
      label: 'Open App', 
      click: function () {
        if (mainWindow) { 
          mainWindow.show()
          mainWindow.focus() 
        }
      }
    },
    {
      label: 'Quit', 
      click: function () {
        app.isQuitting = true
        app.quit()
      }
    }
  ]
  tray.setContextMenu(Menu.buildFromTemplate(items))
}

// ── IPC: WINDOW CONTROLS ─────────────────────────────────

// Minimize the window that sent the event
ipcMain.on('window-minimize', function (e) {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (win) win.minimize()
})

// Toggle Maximize/Unmaximize for the sender window
ipcMain.on('window-maximize', function (e) {
  const win = BrowserWindow.fromWebContents(e.sender)
  if (!win) return
  if (win.isMaximized()) win.unmaximize()
  else win.maximize()
})

// Hide the main window (Close button behavior)
ipcMain.on('window-close', function () {
  if (mainWindow) mainWindow.hide()
})

// ── IPC: SESSION STATE → overlay + tray ─────────────────

/**
 * Synchronizes session data between the main process, tray, and overlay.
 * Handles the display logic for the overlay based on session activity.
 */
ipcMain.on('session-state', function (_, data) {
  const isActive = data.state === 'running' || data.state === 'break'

  if (isActive) {
    const mins = Math.ceil((data.remainingSeconds || 0) / 60)
    rebuildTrayMenu(`${data.taskName} · ${mins} min`)
    showOverlay()
    
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('session-update', data)
    }
  } else {
    rebuildTrayMenu(null)
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('session-update', data)
    }
    // Delay hiding the overlay to allow for "Session Finished" animations
    setTimeout(hideOverlay, 2000)
  }
})

// ── IPC: OVERLAY ACTION → main renderer ─────────────────

/**
 * Relays actions triggered from the overlay back to the main window.
 */
ipcMain.on('overlay-action', function (_, data) {
  if (data.action === 'hide-overlay') {
    hideOverlay()
    return
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('overlay-action', data)
  }
})

// ── APP LIFECYCLE ────────────────────────────────────────

// Bootstrap the application components
app.whenReady().then(function () {
  createMainWindow()
  createTray()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    } else if (mainWindow) {
      mainWindow.show()
    }
  })
})

// Keep the application running in the tray even if windows are closed
app.on('window-all-closed', function () {
  // Explicitly do nothing to prevent app.quit()
})

// Set quitting flag before the application closes
app.on('before-quit', function () {
  app.isQuitting = true
})