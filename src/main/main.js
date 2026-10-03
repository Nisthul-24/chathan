const { app, BrowserWindow, ipcMain, Tray, Menu, screen, nativeImage } = require('electron');
const path = require('path');
const Storage = require('./storage');
const SystemMonitor = require('./systemMonitor');
const ReminderManager = require('./reminders');
const GamingDetector = require('./gamingDetector');

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception in Main Process:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection in Main Process:', reason);
});

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let petWindow = null;
let settingsWindow = null;
let tray = null;
let storage = null;
let systemMonitor = null;
let reminderManager = null;
let gamingDetector = null;
let isPaused = false;
let screenTimeInterval = null;

function createTrayIcon() {
  // Create a crisp 16x16 SVG icon for Windows tray
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="9" r="6" fill="#4eb869"/>
      <polygon points="3,5 1,1 6,4" fill="#36944e"/>
      <polygon points="13,5 15,1 10,4" fill="#36944e"/>
      <polygon points="6,4 7,1 8,4" fill="#fff8dc"/>
      <polygon points="10,4 9,1 8,4" fill="#fff8dc"/>
      <circle cx="6" cy="8" r="1.5" fill="#ffffff"/>
      <circle cx="10" cy="8" r="1.5" fill="#ffffff"/>
      <circle cx="6.3" cy="8" r="0.7" fill="#111111"/>
      <circle cx="9.7" cy="8" r="0.7" fill="#111111"/>
      <path d="M 6 11 Q 8 13 10 11" stroke="#111111" stroke-width="0.8" fill="none"/>
    </svg>
  `;
  const img = nativeImage.createFromBuffer(Buffer.from(svgIcon));
  tray = new Tray(img);
  tray.setToolTip('Chathan — Offline Desktop Goblin Companion');
  updateTrayMenu();
}

function updateTrayMenu() {
  if (!tray) return;
  const settings = storage.getSettings();
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Chathan Goblin Companion', enabled: false },
    { type: 'separator' },
    {
      label: 'Pet Enabled',
      type: 'checkbox',
      checked: settings.petEnabled,
      click: (item) => {
        storage.updateSettings({ petEnabled: item.checked });
        if (item.checked) {
          showPetWindow();
        } else {
          hidePetWindow();
        }
        updateTrayMenu();
      }
    },
    {
      label: isPaused ? 'Resume Pet' : 'Pause Pet',
      click: () => {
        isPaused = !isPaused;
        if (petWindow) {
          petWindow.webContents.send('gaming-state', { isGaming: isPaused });
        }
        updateTrayMenu();
      }
    },
    {
      label: 'Show Pet',
      click: () => showPetWindow()
    },
    {
      label: 'Hide Pet',
      click: () => hidePetWindow()
    },
    { type: 'separator' },
    {
      label: 'Reminders',
      click: () => openSettingsWindow('reminders')
    },
    {
      label: 'Settings',
      click: () => openSettingsWindow('pet')
    },
    { type: 'separator' },
    {
      label: 'Exit Chathan',
      click: () => {
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);
}

function createPetWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  petWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  petWindow.setAlwaysOnTop(true, 'screen-saver');
  petWindow.setIgnoreMouseEvents(true, { forward: true });

  petWindow.loadFile(path.join(__dirname, '../renderer/pet.html'));

  petWindow.on('closed', () => {
    petWindow = null;
  });
}

function createSettingsWindow(defaultTab = 'pet') {
  if (settingsWindow) {
    if (settingsWindow.isMinimized()) settingsWindow.restore();
    settingsWindow.focus();
    settingsWindow.webContents.send('select-tab', defaultTab);
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 900,
    height: 650,
    minWidth: 800,
    minHeight: 550,
    title: 'Chathan Settings & Companion Control',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  settingsWindow.loadFile(path.join(__dirname, '../renderer/settings.html'), { query: { tab: defaultTab } });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

function showPetWindow() {
  storage.updateSettings({ petEnabled: true });
  const settings = storage.getSettings();
  if (!petWindow) {
    createPetWindow();
  } else {
    petWindow.show();
    petWindow.setAlwaysOnTop(settings.alwaysOnTop !== false, 'screen-saver');
  }
  if (settingsWindow) settingsWindow.webContents.send('settings-changed', settings);
  if (petWindow) petWindow.webContents.send('settings-changed', settings);
  updateTrayMenu();
}

function hidePetWindow() {
  if (petWindow) {
    petWindow.hide();
  }
  storage.updateSettings({ petEnabled: false });
  const settings = storage.getSettings();
  if (settingsWindow) settingsWindow.webContents.send('settings-changed', settings);
  if (petWindow) petWindow.webContents.send('settings-changed', settings);
  updateTrayMenu();
}

function openSettingsWindow(tab = 'pet') {
  createSettingsWindow(tab);
}

function setupIPC() {
  // Settings & Storage
  ipcMain.handle('get-settings', () => storage.getSettings());
  ipcMain.handle('save-settings', (event, newSettings) => {
    const updated = storage.updateSettings(newSettings);

    if (newSettings.petEnabled !== undefined) {
      if (newSettings.petEnabled) {
        if (!petWindow) createPetWindow();
        else petWindow.show();
      } else {
        if (petWindow) petWindow.hide();
      }
    }

    if (newSettings.alwaysOnTop !== undefined && petWindow) {
      petWindow.setAlwaysOnTop(newSettings.alwaysOnTop, 'screen-saver');
    }
    
    // Windows startup setting
    if (newSettings.startWithWindows !== undefined) {
      app.setLoginItemSettings({
        openAtLogin: newSettings.startWithWindows,
        path: app.getPath('exe')
      });
    }

    // Refresh timers if intervals changed
    if (reminderManager) reminderManager.updateReminders();
    
    // Broadcast to renderer windows
    if (petWindow) petWindow.webContents.send('settings-changed', updated);
    if (settingsWindow) settingsWindow.webContents.send('settings-changed', updated);
    updateTrayMenu();
    return updated;
  });

  ipcMain.handle('get-custom-reminders', () => storage.getCustomReminders());
  ipcMain.handle('save-custom-reminders', (event, reminders) => {
    const res = storage.saveCustomReminders(reminders);
    if (reminderManager) reminderManager.updateReminders();
    return res;
  });

  ipcMain.handle('get-stats', () => storage.getStats());
  ipcMain.handle('get-personality', () => storage.getPersonality());
  ipcMain.handle('update-personality', (event, p) => storage.updatePersonality(p));
  ipcMain.handle('increment-stat', (event, key, amount) => storage.incrementStat(key, amount));

  // Mouse ignore toggle for click-through transparent background
  ipcMain.on('set-ignore-mouse-events', (event, ignore, forward) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setIgnoreMouseEvents(ignore, { forward: forward !== false });
    }
  });

  ipcMain.handle('get-screen-bounds', () => {
    const primaryDisplay = screen.getPrimaryDisplay();
    return primaryDisplay.workAreaSize;
  });

  ipcMain.on('open-settings-window', (event, tab) => openSettingsWindow(tab));
  ipcMain.on('hide-pet-window', () => hidePetWindow());
  ipcMain.on('show-pet-window', () => showPetWindow());
  ipcMain.on('toggle-pause-pet', () => {
    isPaused = !isPaused;
    if (petWindow) petWindow.webContents.send('gaming-state', { isGaming: isPaused });
    updateTrayMenu();
  });

  ipcMain.on('close-app', () => app.quit());
}

app.whenReady().then(() => {
  storage = new Storage();
  systemMonitor = new SystemMonitor(storage);
  reminderManager = new ReminderManager(storage);
  gamingDetector = new GamingDetector(storage);

  setupIPC();
  createTrayIcon();

  const settings = storage.getSettings();

  // Create pet window if petEnabled is true
  if (settings.petEnabled) {
    createPetWindow();
  }

  // Open Settings Control Center window on startup
  createSettingsWindow(settings.isFirstLaunch ? 'welcome' : 'pet');

  // Start background monitors
  systemMonitor.start(10000);
  reminderManager.start();
  gamingDetector.start(8000);

  // System Monitor Events
  systemMonitor.on('metrics', (metrics) => {
    if (settingsWindow) settingsWindow.webContents.send('metrics-update', metrics);
  });

  systemMonitor.on('alert', (alert) => {
    if (petWindow) petWindow.webContents.send('system-alert', alert);
  });

  // Reminder Events
  reminderManager.on('trigger', (reminder) => {
    if (petWindow) petWindow.webContents.send('reminder-trigger', reminder);
  });

  // Gaming Detector Events
  gamingDetector.on('gaming-state-changed', (state) => {
    if (petWindow) petWindow.webContents.send('gaming-state', state);
  });

  // Track screen time minutes (increments every minute)
  screenTimeInterval = setInterval(() => {
    storage.incrementStat('screenTimeMinutes', 1);
  }, 60000);
});

app.on('second-instance', () => {
  showPetWindow();
  openSettingsWindow('pet');
});

app.on('window-all-closed', (e) => {
  // Do not quit automatically on window close unless app.quit() called
  e.preventDefault();
});

app.on('will-quit', () => {
  if (systemMonitor) systemMonitor.stop();
  if (reminderManager) reminderManager.stop();
  if (gamingDetector) gamingDetector.stop();
  if (screenTimeInterval) clearInterval(screenTimeInterval);
});
