// ESM
import { loadData, saveData, today } from '../data/storage.js'

export const DEFAULT_HABITS = [
  { id: 'midday',    time: '12:30', label: 'Ambil jeda sebentar. Makan, gerak dikit.', enabled: true },
  { id: 'afternoon', time: '15:00', label: 'Gimana progres hari ini?',                 enabled: true },
  { id: 'wind-down', time: '20:00', label: 'Mulai wind down. Tutup yang belum selesai.', enabled: true }
]

export function loadHabits() {
  return loadData().habits?.length ? loadData().habits : DEFAULT_HABITS
}

export function saveHabits(habits) {
  const data = loadData(); data.habits = habits; saveData(data)
}

export function toggleHabit(id, enabled) {
  const data = loadData()
  data.habits = loadHabits().map(h => h.id === id ? { ...h, enabled } : h)
  saveData(data)
}

export function getDueHabits() {
  const now   = new Date()
  const hhmm  = pad(now.getHours()) + ':' + pad(now.getMinutes())
  const nowM  = toMin(hhmm)
  const fired = getFiredToday()
  return loadHabits().filter(h => h.enabled && !fired.includes(h.id) && Math.abs(toMin(h.time) - nowM) <= 2)
}

export function markFired(ids) {
  const data = loadData()
  if (!data.habitFired || data.habitFired.date !== today()) data.habitFired = { date: today(), ids: [] }
  data.habitFired.ids = [...new Set([...data.habitFired.ids, ...ids])]
  saveData(data)
}

export function getFiredToday() {
  const data = loadData()
  return (data.habitFired?.date === today()) ? (data.habitFired.ids || []) : []
}

function toMin(hhmm) { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
function pad(n) { return String(n).padStart(2, '0') }