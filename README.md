# Behavior Engine – V2

> Adaptive daily task system. Offline-first. No pressure.

Bukan sekadar to-do list — ini sistem yang menyesuaikan diri dengan kondisi kamu, mengarahkan cara kerja, dan menjaga konsistensi tanpa tekanan.

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
│   ├── main.js               # Electron main process
│   └── preload.js            # IPC bridge (context isolation)
├── src/
│   ├── styles/
│   │   └── global.css        # Dark theme + mode atmosphere
│   ├── data/
│   │   └── storage.js        # localStorage wrapper (offline-first)
│   ├── engine/
│   │   ├── behaviorEngine.js # Orchestrator utama
│   │   ├── sessionEngine.js  # Adaptive session generator + state machine
│   │   ├── taskGenerator.js  # Auto-generate tasks harian
│   │   ├── adaptiveSystem.js # Mode detection + priority update
│   │   └── mentalEngine.js   # Quotes + reminders + Feynman
│   ├── ui/
│   │   ├── dashboard.js      # Quote rotator + progress overview
│   │   ├── taskView.js       # Session execution + spotlight UI
│   │   └── settingsView.js   # Manajemen aktivitas
│   └── main.js               # Entry point + router
├── index.html
├── vite.config.js
└── package.json
```

---

## Cara Pakai

1. Buka **Settings** → tambah aktivitas (nama, priority, durasi min/max)
2. Klik **Regenerate Tasks** atau tunggu daily reset otomatis
3. Buka **Tasks** → klik **▶ Mulai Xm** atau **▶ Mulai 5m aja** untuk mulai sesi
4. Sesi selesai → otomatis lanjut ke break → sesi berikutnya
5. Task selesai semua → Feynman prompt muncul (opsional)
6. App otomatis track history dan adjust mode (Normal / Lazy / Focus)

---

## Mode System

| Mode   | Trigger                            | Behavior                                  |
|--------|------------------------------------|-------------------------------------------|
| Normal | Default                            | Sesi 25 menit, break 5 menit             |
| Lazy   | ≥3 skip (3 hari terakhir)          | Sesi 10 menit, break 3 menit, task dikurangi |
| Focus  | ≥5 selesai berturut (3 hari terakhir) | Sesi 30 menit, durasi sedikit naik    |

Mode juga bisa berubah **mid-task** secara real-time:
- Skip 2x dalam satu task → mode turun ke Lazy
- Complete 3x berturut → mode naik ke Focus

---

## Session System

Task dipecah jadi **sesi-sesi kecil** yang adaptif — bukan satu durasi panjang.

```
Task: Belajar (60 menit, normal mode)
→ Sesi 1: 25 mnt → Break 5 mnt
→ Sesi 2: 25 mnt → Break 5 mnt
→ Sesi 3: 10 mnt → Done ✓
```

Sesi menyesuaikan diri otomatis:
- Stop di tengah → sesi berikutnya **mengecil 30%**
- Konsisten selesai → sesi berikutnya **sedikit membesar**

### Pilihan Mulai

| Tombol | Efek |
|---|---|
| ▶ Mulai Xm | Jalankan sesi penuh sesuai mode |
| ▶ Mulai 5m aja | Override sesi jadi 5 menit — untuk hari malas |
| Skip | Lewati task, masuk history sebagai skip |
| ✓ Selesai Lebih Awal | Hitung sesi sebagai selesai meski timer belum habis |
| Lewati Break → | Skip break, langsung sesi berikutnya |
| Abandon Task | Hentikan task sepenuhnya |

---

## Resume System

Tutup app di tengah sesi? Tidak masalah.

Saat app dibuka kembali, banner muncul:

```
⏸ Belajar — Berhenti di Sesi 2/4
[Resume →]  [Reset]
```

State yang disimpan:
- `currentSession` — sesi ke berapa
- `remainingSeconds` — sisa waktu
- `state` — running / break / idle

---

## Quote System

Dashboard menampilkan quote yang **berganti otomatis setiap 10 detik** dengan animasi fade + slide.

Quote disesuaikan berdasarkan:
- **Waktu** → Pagi / Siang / Sore / Malam (masing-masing pool berbeda)
- **Mode** → Lazy / Normal / Focus
- **Sumber** → Quote tokoh nyata + internal line gaya app

Kontrol manual: tombol `‹` `›` untuk navigasi, `⏸` untuk pause auto-play.

---

## Focus Atmosphere

Saat sesi berjalan:
- Sidebar dan elemen lain **fade/dim**
- Background berubah sesuai mode (subtle gradient)
- Timer besar jadi pusat UI
- Task lain **blur** — hanya 1 task yang dominan
- Setelah 12 detik idle → muncul CTA: *"Mulai 5 menit aja dulu."*

---

## Data

Semua data tersimpan di `localStorage` browser Electron — per device, offline, tanpa server.

```json
{
  "activities": [
    { "name": "Belajar", "priority": 5, "min": 30, "max": 60 }
  ],
  "history": [
    { "date": "2025-01-01", "taskName": "Belajar", "status": "done", "duration": 45 }
  ],
  "tasks": [
    {
      "id": "task-xxx",
      "name": "Belajar",
      "total": 60,
      "sessions": [25, 25, 10],
      "currentSession": 0,
      "completedSessions": 0,
      "mode": "normal",
      "state": "idle",
      "stats": { "completed": 0, "skipped": 0, "streak": 0 }
    }
  ],
  "settings": {},
  "lastReset": "2025-01-01"
}
```

---

## Core Principles

- **No pressure** — tidak ada punishment, tidak ada streak brutal
- **Adaptive** — sistem menyesuaikan diri ke kondisi user, bukan sebaliknya
- **Low friction** — mulai semudah klik satu tombol
- **Small progress is valid** — 5 menit tetap dihitung

---

## Roadmap

### V3 (Next Phase)
- Statistik & habit tracking visual
- Weekly review otomatis
- Notifikasi native Electron
- Local AI model (opsional, offline)