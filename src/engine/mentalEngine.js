// src/engine/mentalEngine.js
// Quote system + reminder messages + Feynman prompt
// Quote rotate per waktu: pagi / siang / sore / malam

// ─────────────────────────────────────────
// QUOTES REAL (tokoh terkenal)
// ─────────────────────────────────────────

// ESM
const QUOTES_REAL = [
  { text: 'We are what we repeatedly do. Excellence is not an act, but a habit.', author: 'Aristotle' },
  { text: 'Discipline equals freedom.', author: 'Jocko Willink' },
  { text: 'The impediment to action advances action. What stands in the way becomes the way.', author: 'Marcus Aurelius' },
  { text: 'You don\'t rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear' },
  { text: 'Do the hard work, especially when you don\'t feel like it.', author: 'Seth Godin' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'The man who moves a mountain begins by carrying away small stones.', author: 'Confucius' },
  { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
  { text: 'Stay hungry, stay foolish.', author: 'Steve Jobs' },
  { text: 'Done is better than perfect.', author: 'Sheryl Sandberg' },
  { text: 'Consistency beats motivation.', author: 'Unknown' },
  { text: 'What gets measured gets managed.', author: 'Peter Drucker' },
  { text: 'Success is the sum of small efforts repeated day in and day out.', author: 'Robert Collier' },
  { text: 'Imagination is more important than knowledge.', author: 'Albert Einstein' },
  { text: 'If you\'re going through hell, keep going.', author: 'Winston Churchill' },
  { text: 'An investment in knowledge pays the best interest.', author: 'Benjamin Franklin' },
  { text: 'Indeed, Allah will not change the condition of a people until they change what is in themselves.', author: 'Qur\'an (13:11)' },
  { text: 'Tie your camel and trust in Allah.', author: 'Prophet Muhammad (Hadith)' },
  { text: 'The strong believer is better and more beloved to Allah than the weak believer.', author: 'Prophet Muhammad (Hadith)' },
  { text: 'Life is like riding a bicycle. To keep your balance you must keep moving.', author: 'Albert Einstein' }
]

const BY_TIME = {
  pagi:  [
    { text: 'Mulai pagi dengan satu langkah kecil. Sisanya ngikut sendiri.', author: null },
    { text: 'Win the morning, win the day.', author: 'Tim Ferriss' },
    { text: 'Pagi ini bukan soal semangat. Cukup mulai.', author: null },
    { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' }
  ],
  siang: [
    { text: 'Udah setengah hari. Satu task lagi sebelum istirahat.', author: null },
    { text: 'Gak harus bagus, yang penting jalan.', author: null },
    { text: 'Don\'t count the days, make the days count.', author: 'Muhammad Ali' }
  ],
  sore:  [
    { text: 'Sore bukan waktunya berhenti. Ini waktunya finishing.', author: null },
    { text: 'Tinggal sedikit lagi. Jangan kasih gap antara niat dan aksi.', author: null },
    { text: 'Don\'t stop when you\'re tired. Stop when you\'re done.', author: 'Unknown' }
  ],
  malam: [
    { text: 'Hari hampir selesai. Hitung yang udah beres, bukan yang belum.', author: null },
    { text: 'Small progress is still progress.', author: null },
    { text: 'Tidur yang cukup juga bagian dari sistem. Istirahat itu valid.', author: null },
    { text: 'Malam ini tutup dengan syukur. Besok buka lagi dengan niat.', author: null }
  ]
}

const BY_MODE = {
  lazy:  [
    { text: 'Lu capek? deadline juga capek nunggu lu.', author: null },
    { text: 'Cuma 5 menit. Setelah itu bebas.', author: null },
    { text: 'Mulai dulu, motivasi nyusul sendiri.', author: null }
  ],
  focus: [
    { text: 'Lu lagi di zona. Jangan rusak momentum.', author: null },
    { text: 'Consistency compounds. Keep going.', author: null },
    { text: 'Flow state is rare. Use it.', author: null }
  ],
  done:  [
    { text: 'Itu dia. Bukti kalau lu bisa.', author: null },
    { text: 'Done is better than perfect.', author: 'Mark Zuckerberg' },
    { text: 'Lu udah konsisten. Itu lebih susah dari kelihatannya.', author: null }
  ],
  normal: [
    { text: 'Hari ini bukan soal sempurna, tapi soal konsisten.', author: null },
    { text: 'Progress kecil itu valid.', author: null },
    { text: 'Satu task selesai lebih baik dari sepuluh yang direncanain.', author: null }
  ]
}

export function getTimePeriod() {
  const h = new Date().getHours()
  if (h >= 5  && h < 11) return 'pagi'
  if (h >= 11 && h < 15) return 'siang'
  if (h >= 15 && h < 19) return 'sore'
  return 'malam'
}

export function getQuotePool(mode = 'normal') {
  const period = getTimePeriod()
  const shuffled = [...QUOTES_REAL].sort(() => Math.random() - 0.5).slice(0, 8)
  return [...(BY_TIME[period] || []), ...(BY_MODE[mode] || BY_MODE.normal), ...shuffled]
}

export function getQuote(mode = 'normal') {
  return pick(getQuotePool(mode))
}

export function getReminder(mode = 'normal') {
  const pool = {
    lazy:   ['Cuma 5 menit. Setelah itu bebas.', 'Lu gak perlu rajin, cukup mulai.'],
    normal: ['Satu task. Fokus. Sisanya belakangan.', 'Sistem lu udah ada. Tinggal dijalanin.'],
    focus:  ['Lu lagi di zona. Jangan buang momentum.']
  }
  return pick(pool[mode] || pool.normal)
}

export function getFeynmanPrompt(taskName) {
  return `Lo baru selesai "${taskName}". Sekarang coba jelaskan ulang dengan bahasa lo sendiri — seolah lu lagi ngajarin orang yang baru pertama kali dengernya. Kalau lo stuck, berarti ada bagian yang belum bener-bener lo ngerti.`
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }