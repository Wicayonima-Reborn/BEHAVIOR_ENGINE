'use strict'

var Notification = require('electron').Notification

var lastNotifTime = 0
var notifsToday   = 0
var sessionActive = false
var checkInterval = null
var currentState  = {}

var COOLDOWN_MS = 60 * 60 * 1000
var MAX_PER_DAY = 2
var CHECK_MS    = 2 * 60 * 1000

function start(getState) {
  stop()
  scheduleMidnightReset()

  checkInterval = setInterval(function () {
    if (sessionActive) return
    if (!canNotify()) return

    var state = getState ? getState() : currentState
    var type  = decide(state)
    if (type) send(type, state)
  }, CHECK_MS)
}

function stop() {
  if (checkInterval) { clearInterval(checkInterval); checkInterval = null }
}

function setSessionActive(val) { sessionActive = val }

function updateState(state) { currentState = state || {} }

function decide(state) {
  if (!state || !state.tasks) return null
  var tasks   = state.tasks || []
  var pending = tasks.filter(function (t) { return t.status === 'pending' || t.state === 'idle' })
  var done    = tasks.filter(function (t) { return t.status === 'done' })
  var streak  = streakState(state.streakData)
  var momentum = state.momentum || 0

  if (streak === 'fragile') return 'fragile'
  if (momentum >= 3.5 && pending.length > 0) return 'momentum'
  if (done.length === 0 && pending.length > 0) return 'idle'
  return null
}

var MESSAGES = {
  idle:     { title: 'Behavior Engine', body: 'Mulai 5 menit aja. Seriously.' },
  momentum: { title: 'Lagi enak nih.',  body: 'Satu sesi lagi. Lu bisa.' },
  fragile:  { title: 'Streak fragile.', body: 'Balikin ritme. 10 menit cukup.' }
}

function send(type, state, override) {
  if (!Notification.isSupported()) return
  var msg = override || MESSAGES[type]
  if (!msg) return
  new Notification({ title: msg.title, body: msg.body, silent: false }).show()
  lastNotifTime = Date.now()
  notifsToday++
}

function canNotify() {
  return notifsToday < MAX_PER_DAY && (Date.now() - lastNotifTime) >= COOLDOWN_MS
}

function scheduleMidnightReset() {
  var now  = new Date()
  var next = new Date(now)
  next.setHours(24, 0, 0, 0)
  setTimeout(function () {
    notifsToday = 0
    scheduleMidnightReset()
  }, next - now)
}

function streakState(sd) {
  if (!sd || !sd.streak) return 'none'
  var today = new Date().toISOString().slice(0, 10)
  var yest  = (function () {
    var d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10)
  }())
  if (sd.lastActiveDate === today) return 'active'
  if (sd.lastActiveDate === yest)  return 'fragile'
  return 'none'
}

module.exports = { start, stop, setSessionActive, updateState }