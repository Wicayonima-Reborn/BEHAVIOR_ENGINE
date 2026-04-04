// src/ui/dashboard.js
import { getQuotePool, getTimePeriod } from '../engine/mentalEngine.js'

// Track rotation state
let quotePool    = []
let quoteIndex   = 0
let quoteTimer   = null

const ROTATE_INTERVAL = 10000 // 10 detik

/**
 * Render the dashboard view.
 */
export function renderDashboard(container, { tasks, mode }) {
  // Build fresh quote pool
  quotePool  = getQuotePool(mode)
  quoteIndex = 0

  const total   = tasks.length
  const done    = tasks.filter(t => t.status === 'done').length
  const pending = tasks.filter(t => t.status === 'pending').length
  const skipped = tasks.filter(t => t.status === 'skip').length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  const period = getTimePeriod()
  const greeting = { pagi: 'Selamat pagi ☀️', siang: 'Selamat siang 🌤', sore: 'Selamat sore 🌇', malam: 'Selamat malam 🌙' }

  container.innerHTML = `
    <div class="dashboard-header">
      <div>
        <h1 class="dash-title">${greeting[period]}</h1>
        <p class="dash-date">${formatDate()}</p>
      </div>
      <span class="mode-chip mode-${mode}">${mode.toUpperCase()} MODE</span>
    </div>

    <!-- Quote Card dengan animasi -->
    <div class="card quote-card" id="quote-card">
      <div class="quote-period-tag">${periodLabel(period)}</div>

      <div class="quote-body" id="quote-body">
        <p class="quote-text" id="quote-text"></p>
        <p class="quote-author" id="quote-author"></p>
      </div>

      <!-- Dot indicators -->
      <div class="quote-dots" id="quote-dots"></div>

      <!-- Controls -->
      <div class="quote-controls">
        <button class="quote-btn" id="quote-prev" title="Sebelumnya">‹</button>
        <span class="quote-counter" id="quote-counter">1 / ${quotePool.length}</span>
        <button class="quote-btn" id="quote-next" title="Berikutnya">›</button>
        <button class="quote-btn quote-auto" id="quote-auto" title="Auto-play aktif">⏸</button>
      </div>
    </div>

    <!-- Progress -->
    <div class="card progress-card">
      <p class="section-title">Progress Hari Ini</p>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width: ${progress}%"></div>
      </div>
      <div class="progress-stats">
        <span class="stat done">✓ ${done} selesai</span>
        <span class="stat pending">○ ${pending} pending</span>
        <span class="stat skipped">✕ ${skipped} skip</span>
      </div>
    </div>

    <!-- Task Snapshot -->
    <div class="card">
      <p class="section-title">Task Hari Ini</p>
      ${total === 0
        ? `<p class="empty-state">Belum ada task. Setup aktivitas dulu di <strong>Settings</strong>.</p>`
        : `<ul class="task-snapshot">
            ${tasks.slice(0, 4).map(t => `
              <li class="snapshot-item status-${t.status}">
                <span class="snapshot-dot"></span>
                <span class="snapshot-name">${t.name}</span>
                <span class="snapshot-dur">${t.duration} mnt</span>
              </li>
            `).join('')}
            ${total > 4 ? `<li class="snapshot-more">+${total - 4} lainnya →</li>` : ''}
          </ul>`
      }
    </div>
  `

  injectDashboardStyles()
  initQuoteRotator(container)
}

// ─────────────────────────────────────────
// QUOTE ROTATOR
// ─────────────────────────────────────────

function initQuoteRotator(container) {
  // Build dots
  buildDots(container)
  // Show first quote (no anim)
  displayQuote(container, quoteIndex, false)
  // Start auto-rotate
  startAutoRotate(container)
  // Bind controls
  bindQuoteControls(container)
}

function buildDots(container) {
  const dotsEl = container.querySelector('#quote-dots')
  if (!dotsEl) return
  dotsEl.innerHTML = quotePool.map((_, i) =>
    `<span class="qdot ${i === 0 ? 'active' : ''}" data-i="${i}"></span>`
  ).join('')

  dotsEl.addEventListener('click', (e) => {
    const dot = e.target.closest('.qdot')
    if (!dot) return
    goToQuote(container, parseInt(dot.dataset.i))
  })
}

function displayQuote(container, index, animate = true) {
  const q      = quotePool[index]
  const textEl = container.querySelector('#quote-text')
  const authEl = container.querySelector('#quote-author')
  const body   = container.querySelector('#quote-body')
  const counter = container.querySelector('#quote-counter')

  if (!textEl || !q) return

  if (animate) {
    body.classList.add('quote-exit')
    setTimeout(() => {
      textEl.textContent = `"${q.text}"`
      authEl.textContent = q.author ? `— ${q.author}` : ''
      body.classList.remove('quote-exit')
      body.classList.add('quote-enter')
      setTimeout(() => body.classList.remove('quote-enter'), 500)
    }, 250)
  } else {
    textEl.textContent = `"${q.text}"`
    authEl.textContent = q.author ? `— ${q.author}` : ''
  }

  if (counter) counter.textContent = `${index + 1} / ${quotePool.length}`

  // Update dots
  container.querySelectorAll('.qdot').forEach((d, i) => {
    d.classList.toggle('active', i === index)
  })
}

function goToQuote(container, index) {
  quoteIndex = (index + quotePool.length) % quotePool.length
  displayQuote(container, quoteIndex)
}

let autoPlaying = true

function startAutoRotate(container) {
  clearInterval(quoteTimer)
  quoteTimer = setInterval(() => {
    if (!autoPlaying) return
    quoteIndex = (quoteIndex + 1) % quotePool.length
    displayQuote(container, quoteIndex)
  }, ROTATE_INTERVAL)
}

function bindQuoteControls(container) {
  container.querySelector('#quote-prev')?.addEventListener('click', () => {
    goToQuote(container, quoteIndex - 1)
  })
  container.querySelector('#quote-next')?.addEventListener('click', () => {
    goToQuote(container, quoteIndex + 1)
  })
  container.querySelector('#quote-auto')?.addEventListener('click', (e) => {
    autoPlaying = !autoPlaying
    e.target.textContent = autoPlaying ? '⏸' : '▶'
    e.target.title = autoPlaying ? 'Pause auto-play' : 'Resume auto-play'
  })
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function formatDate() {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
}

function periodLabel(period) {
  return { pagi: '🌅 Pagi', siang: '☀️ Siang', sore: '🌆 Sore', malam: '🌙 Malam' }[period]
}

// ─────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────

function injectDashboardStyles() {
  if (document.getElementById('dash-styles')) return
  const s = document.createElement('style')
  s.id = 'dash-styles'
  s.textContent = `
    /* Header */
    .dashboard-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .dash-title { font-size: 24px; font-weight: 700; color: var(--text-primary); }
    .dash-date  { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
    .mode-chip  { padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; }
    .mode-chip.mode-normal { background: var(--accent-glow); color: var(--accent); }
    .mode-chip.mode-lazy   { background: rgba(248,113,113,0.15); color: var(--danger); }
    .mode-chip.mode-focus  { background: rgba(74,222,128,0.15);  color: var(--success); }

    /* Quote Card */
    .quote-card {
      margin-bottom: 16px;
      border-left: 3px solid var(--accent);
      min-height: 140px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      position: relative;
      overflow: hidden;
    }
    .quote-card::before {
      content: '"';
      position: absolute;
      top: -10px; right: 16px;
      font-size: 100px;
      color: var(--accent-glow);
      font-family: Georgia, serif;
      line-height: 1;
      pointer-events: none;
    }
    .quote-period-tag {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--accent);
      text-transform: uppercase;
    }

    /* Quote body + animations */
    .quote-body { flex: 1; }
    .quote-text {
      font-size: 15px;
      line-height: 1.7;
      color: var(--text-primary);
      font-style: italic;
    }
    .quote-author {
      margin-top: 10px;
      font-size: 12px;
      color: var(--text-muted);
      font-style: normal;
      font-weight: 600;
      min-height: 18px;
    }

    /* Fade + slide animations */
    @keyframes quoteExitAnim {
      from { opacity: 1; transform: translateY(0); }
      to   { opacity: 0; transform: translateY(-12px); }
    }
    @keyframes quoteEnterAnim {
      from { opacity: 0; transform: translateY(14px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .quote-exit  { animation: quoteExitAnim  0.25s ease forwards; }
    .quote-enter { animation: quoteEnterAnim 0.4s  ease forwards; }

    /* Dot indicators */
    .quote-dots {
      display: flex;
      gap: 5px;
      align-items: center;
      flex-wrap: wrap;
    }
    .qdot {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--border);
      cursor: pointer;
      transition: background 0.2s, transform 0.2s;
    }
    .qdot.active {
      background: var(--accent);
      transform: scale(1.4);
    }
    .qdot:hover { background: var(--text-muted); }

    /* Controls */
    .quote-controls {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .quote-btn {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text-secondary);
      width: 28px; height: 28px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
    }
    .quote-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .quote-auto { margin-left: 4px; font-size: 12px; }
    .quote-counter {
      font-size: 11px;
      color: var(--text-muted);
      min-width: 36px;
      text-align: center;
    }

    /* Progress */
    .progress-card { margin-bottom: 16px; }
    .progress-bar-track { background: var(--bg-hover); border-radius: 99px; height: 8px; margin: 12px 0; overflow: hidden; }
    .progress-bar-fill  { height: 100%; background: var(--accent); border-radius: 99px; transition: width 0.4s ease; }
    .progress-stats { display: flex; gap: 16px; }
    .stat { font-size: 12px; }
    .stat.done    { color: var(--success); }
    .stat.pending { color: var(--text-secondary); }
    .stat.skipped { color: var(--danger); }

    /* Task snapshot */
    .empty-state { color: var(--text-muted); font-size: 13px; line-height: 1.6; }
    .task-snapshot { list-style: none; display: flex; flex-direction: column; gap: 10px; }
    .snapshot-item { display: flex; align-items: center; gap: 10px; font-size: 13px; }
    .snapshot-dot  { width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); flex-shrink: 0; }
    .snapshot-item.status-done   .snapshot-dot { background: var(--success); }
    .snapshot-item.status-skip   .snapshot-dot { background: var(--danger); }
    .snapshot-item.status-active .snapshot-dot { background: var(--accent); }
    .snapshot-name { flex: 1; color: var(--text-primary); }
    .snapshot-item.status-done .snapshot-name { text-decoration: line-through; color: var(--text-muted); }
    .snapshot-dur  { color: var(--text-muted); font-size: 12px; }
    .snapshot-more { color: var(--accent); font-size: 12px; cursor: pointer; }
  `
  document.head.appendChild(s)
}