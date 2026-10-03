# 🧌 Chathan — Offline Desktop Goblin Companion

**Chathan** is a small, cute, mischievous goblin-like desktop pet that lives on your Windows desktop screen. Designed to feel like a real little creature living on your computer, Chathan remains subtle, delightful, and non-intrusive.

---

## 🔒 100% Offline Guarantee

Chathan is engineered strictly for privacy and offline usage:
* **NO Cloud AI or External API Calls** (No OpenAI, Gemini, Claude, or external web services).
* **NO Internet Connection Required**.
* **NO Telemetry, Analytics, Accounts, or Advertising**.
* **100% Local Data Persistence** stored in `%APPDATA%\chathan\chathan_store.json`.

---

## ✨ Features

- **Transparent & Frameless Window**: Chathan walks around your screen above other windows with zero borders and seamless click-through transparent background areas.
- **Sparse, Natural Movement**: Sparse movement intervals so Chathan walks, sits, sleeps, or looks around without being annoying or distracting.
- **Context-Aware Offline Dialogue**: Cute local speech bubbles with time-of-day awareness, mood state, and context reactions.
- **Health & Productivity Reminders**: Built-in water hydration checks (45m), screen break reminders (50m), stretch alerts (90m), and custom reminders.
- **Hardware Monitoring**: Real-time local monitoring for CPU load, RAM usage, CPU temperature (with graceful fallback if hardware sensors are missing), and Laptop battery status.
- **Gaming & Full-Screen Detection**: Automatically detects when you are running full-screen games or video playback and enters **Quiet Mode** to prevent interruptions.
- **Synthesized Audio Effects**: Subtle retro sound effects generated locally using the Web Audio API (footsteps, yawns, pops, chirps, alerts) with volume and on/off controls.
- **Polished Settings Control Center**: Dark magical goblin UI with real-time metrics, companion stats, reminder controls, and customizable pet scale/speed.
- **System Tray Integration**: Complete Windows tray icon menu for quick pause, show/hide, reminders, settings, and clean application exit.

---

## 📁 Project Structure

```text
chathan/
├── src/
│   ├── main/
│   │   ├── main.js             # Electron main process & tray management
│   │   ├── systemMonitor.js    # Local CPU/RAM/Temp/Battery monitoring
│   │   ├── reminders.js        # Scheduled & custom reminder manager
│   │   ├── storage.js          # Persistent local JSON data store
│   │   ├── gamingDetector.js   # Full-screen game & active window detector
│   │   └── preload.js          # Secure IPC contextBridge
│   │
│   ├── renderer/
│   │   ├── pet.html            # Pet transparent desktop view
│   │   ├── pet.css             # Goblin SVG styling & animations
│   │   ├── pet.js              # Pet movement physics & state machine
│   │   ├── dialogue.js         # Offline dialogue database & engine
│   │   ├── sounds.js           # Web Audio API sound generator
│   │   ├── settings.html       # Control Center & Welcome setup UI
│   │   ├── settings.css        # Dark magical UI design system
│   │   └── settings.js         # Settings UI state controller
│   │
│   └── assets/                 # App assets & icons
│
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

* Node.js v16+ (Recommended Node.js 18 / 20 / 24)
* Windows 10 / 11

### Installation & Development

1. Clone or navigate to the repository directory:
   ```bash
   cd chathan
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in Development Mode:
   ```bash
   npm start
   # or
   npm run dev
   ```

---

## 🛠️ How to Extend Chathan

### Adding New Dialogue
Open [`src/renderer/dialogue.js`](file:///c:/Users/nisth/chathan/src/renderer/dialogue.js) and append strings to any category inside `this.messages`:
```javascript
GENERAL: [
  "Hmm...",
  "Your new custom line here! 🧌"
]
```

### Adding New Animations & States
1. Update the state machine in [`src/renderer/pet.js`](file:///c:/Users/nisth/chathan/src/renderer/pet.js#L75):
   ```javascript
   pet.setState("dance", 4000);
   ```
2. Add corresponding SVG transform or CSS animation keyframes in [`src/renderer/pet.css`](file:///c:/Users/nisth/chathan/src/renderer/pet.css).

### Adding Custom Reminders
Custom reminders can be added directly via the **Settings Control Center** UI (`Reminders` tab -> `+ Add Reminder`) or programmatically through [`src/main/reminders.js`](file:///c:/Users/nisth/chathan/src/main/reminders.js).

---

## 📦 Building Production Installer

To package Chathan into a standalone Windows installer executable (`Chathan Setup.exe`):

```bash
npm run build
```

The installer will be generated inside the `dist/` directory.

---

## 📄 License

MIT License. Designed with ❤️ for offline desktop companionship.
