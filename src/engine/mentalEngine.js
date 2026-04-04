// src/engine/mentalEngine.js
// Quote system + reminder messages + Feynman prompt
// Quote rotate per waktu: pagi / siang / sore / malam

// ─────────────────────────────────────────
// QUOTES REAL (tokoh terkenal)
// ─────────────────────────────────────────

const QUOTES_REAL = [
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "Discipline equals freedom.", author: "Jocko Willink" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
  { text: "You don't rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
  { text: "Do the hard work, especially when you don't feel like it.", author: "Seth Godin" },
  { text: "Small progress is still progress.", author: "Unknown" },

  { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },
  { text: "Waste no more time arguing what a good man should be. Be one.", author: "Marcus Aurelius" },
  { text: "Knowing yourself is the beginning of all wisdom.", author: "Aristotle" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James" },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
  { text: "Opportunities don't happen. You create them.", author: "Chris Grosser" },

  { text: "Do not wait to strike till the iron is hot; but make it hot by striking.", author: "William Butler Yeats" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
  { text: "What we think, we become.", author: "Buddha" },
  { text: "The best way out is always through.", author: "Robert Frost" },
  { text: "Turn your wounds into wisdom.", author: "Oprah Winfrey" },
  { text: "If you're going through hell, keep going.", author: "Winston Churchill" },

  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "The man who moves a mountain begins by carrying away small stones.", author: "Confucius" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },

  { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Everything you can imagine is real.", author: "Pablo Picasso" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "What you do today can improve all your tomorrows.", author: "Ralph Marston" },

  { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "Dream big and dare to fail.", author: "Norman Vaughan" },
  { text: "Everything has beauty, but not everyone sees it.", author: "Confucius" },
  { text: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },

  // Islamic / spiritual
  { text: "Indeed, Allah will not change the condition of a people until they change what is in themselves.", author: "Qur'an (13:11)" },
  { text: "So remember Me; I will remember you.", author: "Qur'an (2:152)" },
  { text: "And whoever relies upon Allah – then He is sufficient for him.", author: "Qur'an (65:3)" },
  { text: "The strong believer is better and more beloved to Allah than the weak believer.", author: "Prophet Muhammad (Hadith)" },
  { text: "Tie your camel and trust in Allah.", author: "Prophet Muhammad (Hadith)" },
  { text: "The best among you are those who have the best manners and character.", author: "Prophet Muhammad (Hadith)" },

  // Science / thinkers
  { text: "Imagination is more important than knowledge.", author: "Albert Einstein" },
  { text: "Life is like riding a bicycle. To keep your balance you must keep moving.", author: "Albert Einstein" },
  { text: "If I have seen further it is by standing on the shoulders of giants.", author: "Isaac Newton" },
  { text: "Somewhere, something incredible is waiting to be known.", author: "Carl Sagan" },
  { text: "The important thing is not to stop questioning.", author: "Albert Einstein" },
  { text: "Science is what we understand well enough to explain to a computer.", author: "Donald Knuth" },

  // Extra modern / productivity
  { text: "Consistency beats motivation.", author: "Unknown" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "What gets measured gets managed.", author: "Peter Drucker" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg" },
  { text: "If it's important, you'll find a way. If not, you'll find an excuse.", author: "Ryan Blair" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" }
]

// ─────────────────────────────────────────
// QUOTES INTERNAL (gaya app, per konteks)
// ─────────────────────────────────────────

const QUOTES_INTERNAL = {
  lazy: [
    { text: "Lu capek? deadline juga capek nunggu lu.", author: null },
    { text: "Gak harus bagus, yang penting jalan.", author: null },
    { text: "10 menit aja. Sisanya bisa santai.", author: null },
    { text: "Mulai dulu, motivasi nyusul sendiri.", author: null }
  ],
  normal: [
    { text: "Hari ini bukan soal sempurna, tapi soal konsisten.", author: null },
    { text: "Satu task selesai lebih baik dari sepuluh yang direncanain.", author: null },
    { text: "Otak lu butuh digerakin, bukan dipikiriin.", author: null },
    { text: "Progress kecil itu valid.", author: null }
  ],
  focus: [
    { text: "Lu lagi di zona. Jangan rusak momentum.", author: null },
    { text: "Consistency compounds. Keep going.", author: null },
    { text: "Lu udah lebih maju dari diri lu kemarin.", author: null },
    { text: "Flow state is rare. Use it.", author: null }
  ],
  done: [
    { text: "Itu dia. Bukti kalau lu bisa.", author: null },
    { text: "Satu beres. Sisanya? Opsional tapi worth it.", author: null },
    { text: "Lu udah lebih maju dari diri lu kemarin.", author: null },
    { text: "Bangun momentum, satu task satu waktu.", author: null }
  ]
}

// ─────────────────────────────────────────
// QUOTES PER WAKTU
// ─────────────────────────────────────────

const QUOTES_BY_TIME = {
  pagi: [
    { text: "Mulai pagi dengan satu langkah kecil. Sisanya ngikut sendiri.", author: null },
    { text: "Win the morning, win the day.", author: "Tim Ferriss" },
    { text: "Each morning we are born again. What we do today matters most.", author: "Buddha" },
    { text: "Pagi ini bukan soal semangat. Cukup mulai.", author: null },
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "Morning is when the wick is lit.", author: "Ralph Waldo Emerson" },
    { text: "First thing every morning before you arise say out loud, 'I believe.'", author: "Norman Vincent Peale" }
  ],
  siang: [
    { text: "Udah setengah hari. Satu task lagi sebelum istirahat.", author: null },
    { text: "Gak harus bagus, yang penting jalan.", author: null },
    { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
    { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
    { text: "Siang bukan waktunya nunda. Itu waktunya selesaikan.", author: null },
    { text: "Don't count the days, make the days count.", author: "Muhammad Ali" }
  ],
  sore: [
    { text: "Sore bukan waktunya berhenti. Ini waktunya finishing.", author: null },
    { text: "You don't rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
    { text: "Tinggal sedikit lagi. Jangan kasih gap antara niat dan aksi.", author: null },
    { text: "It's not about perfect. It's about effort.", author: "Jillian Michaels" },
    { text: "Sore ini bisa jadi turning point kalau lu mau.", author: null },
    { text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" }
  ],
  malam: [
    { text: "Hari hampir selesai. Hitung yang udah beres, bukan yang belum.", author: null },
    { text: "Small progress is still progress.", author: null },
    { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
    { text: "Tidur yang cukup juga bagian dari sistem. Istirahat itu valid.", author: null },
    { text: "Review hari ini. Besok mulai lebih baik.", author: null },
    { text: "Every evening I turn my worries over to God. He's going to be up all night anyway.", author: "Mary C. Crowley" },
    { text: "Malam ini tutup dengan syukur. Besok buka lagi dengan niat.", author: null }
  ]
}

// ─────────────────────────────────────────
// REMINDERS
// ─────────────────────────────────────────

const REMINDERS = {
  lazy: [
    "Cuma 5 menit. Setelah itu bebas.",
    "Lu gak perlu rajin, cukup mulai.",
    "Kalau nunggu mood, gak akan pernah mulai.",
    "Mode santai, tapi tetap jalan."
  ],
  normal: [
    "Waktunya kerja. Tapi santai, gak ada yang ngejar.",
    "Satu task. Fokus. Sisanya belakangan.",
    "Sistem lu udah ada. Tinggal dijalanin."
  ]
}

// ─────────────────────────────────────────
// EXPORTED FUNCTIONS
// ─────────────────────────────────────────

/**
 * Get current time period.
 * @returns {'pagi'|'siang'|'sore'|'malam'}
 */
export function getTimePeriod() {
  const h = new Date().getHours()
  if (h >= 5  && h < 11) return 'pagi'
  if (h >= 11 && h < 15) return 'siang'
  if (h >= 15 && h < 19) return 'sore'
  return 'malam'
}

/**
 * Get full quote pool for rotation.
 * Campuran: quote real + internal sesuai mode + quote per waktu.
 * @param {'normal'|'lazy'|'focus'|'done'} mode
 * @returns Array of { text, author }
 */
export function getQuotePool(mode = 'normal') {
  const period     = getTimePeriod()
  const timeQuotes = QUOTES_BY_TIME[period] || []
  const modeQuotes = QUOTES_INTERNAL[mode]  || QUOTES_INTERNAL.normal

  // Ambil sebagian quote real (acak 10 biar tidak terlalu panjang)
  const shuffledReal = [...QUOTES_REAL].sort(() => Math.random() - 0.5).slice(0, 10)

  // Gabungkan: waktu + mode + real
  return [...timeQuotes, ...modeQuotes, ...shuffledReal]
}

/**
 * Get a single quote (random).
 * Tetap bisa dipanggil langsung tanpa rotation.
 * @param {'normal'|'lazy'|'focus'|'done'} context
 * @returns {{ text, author }}
 */
export function getQuote(context = 'normal') {
  // 50% waktu+mode, 50% quote real
  const useReal = Math.random() > 0.5
  if (useReal) {
    return pick(QUOTES_REAL)
  }
  const period     = getTimePeriod()
  const timeQuotes = QUOTES_BY_TIME[period] || []
  const modeQuotes = QUOTES_INTERNAL[context] || QUOTES_INTERNAL.normal
  return pick([...timeQuotes, ...modeQuotes])
}

/**
 * Get a reminder message for current mode.
 */
export function getReminder(mode = 'normal') {
  const pool = REMINDERS[mode] || REMINDERS.normal
  return pick(pool)
}

/**
 * Get Feynman prompt for a given task name.
 */
export function getFeynmanPrompt(taskName) {
  return `Lo baru selesai "${taskName}". Sekarang coba jelaskan ulang dengan bahasa lo sendiri — seolah lu lagi ngajarin orang yang baru pertama kali dengernya. Kalau lo stuck, berarti ada bagian yang belum bener-bener lo ngerti.`
}

// ─────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}