# Behavior Engine – V1

Adaptive daily task system. Offline-first. No pressure.

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Jalankan dalam dev mode (Vite + Electron)
npm run dev

# 3. Build untuk distribusi
npm run build
```

> **Requirement**: Node.js ≥ 18

---

## Struktur Project

```
behavior-engine/
├── electron/
│   ├── main.js          # Electron main process
│   └── preload.js       # IPC bridge (context isolation)
├── src/
│   ├── styles/
│   │   └── global.css
│   ├── data/
│   │   └── storage.js   # localStorage wrapper
│   ├── engine/
│   │   ├── behaviorEngine.js   # Orchestrator utama
│   │   ├── taskGenerator.js    # Auto-generate tasks
│   │   ├── adaptiveSystem.js   # Mode detection + priority update
│   │   └── mentalEngine.js     # Quotes + reminders + Feynman
│   ├── ui/
│   │   ├── dashboard.js
│   │   ├── taskView.js
│   │   └── settingsView.js
│   └── main.js          # Entry point + router
├── index.html
├── vite.config.js
└── package.json
```

---

## Cara Pakai

1. Buka **Settings** → tambah aktivitas (nama, priority, durasi min/max)
2. Klik **Regenerate Tasks** atau tunggu daily reset otomatis
3. Buka **Tasks** → klik **Mulai** untuk jalankan Pomodoro
4. Selesai → Feynman prompt muncul (opsional, bisa ditutup)
5. App otomatis track history dan adjust mode (Normal / Lazy / Focus)

---

## Mode System

| Mode   | Trigger                          | Behavior                        |
|--------|----------------------------------|---------------------------------|
| Normal | Default                          | Task standar                    |
| Lazy   | ≥3 task di-skip (3 hari terakhir)| Task dikurangi, durasi 5–15 mnt |
| Focus  | ≥5 task selesai (3 hari terakhir)| Semua task, durasi sedikit naik |

---

## Data

Semua data tersimpan di `localStorage` browser Electron (per device, offline).

Format:
```json
{
  "activities": [{ "name": "Belajar", "priority": 5, "min": 30, "max": 60 }],
  "history": [{ "date": "2025-01-01", "taskName": "Belajar", "status": "done", "duration": 45 }],
  "tasks": [],
  "settings": {},
  "lastReset": "2025-01-01"
}
```

---

## V2 (Next Phase)

- Statistik & habit tracking
- UI enhancement
- Local AI model (opsional)