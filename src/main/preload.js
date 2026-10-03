const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Settings & Storage
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getCustomReminders: () => ipcRenderer.invoke('get-custom-reminders'),
  saveCustomReminders: (reminders) => ipcRenderer.invoke('save-custom-reminders', reminders),
  getStats: () => ipcRenderer.invoke('get-stats'),
  getPersonality: () => ipcRenderer.invoke('get-personality'),
  updatePersonality: (p) => ipcRenderer.invoke('update-personality', p),
  incrementStat: (key, amount) => ipcRenderer.invoke('increment-stat', key, amount),

  // Pet Window & Interactive Mouse state
  setIgnoreMouseEvents: (ignore, forward) => ipcRenderer.send('set-ignore-mouse-events', ignore, forward),
  setPetPosition: (x, y) => ipcRenderer.send('set-pet-position', x, y),
  getScreenBounds: () => ipcRenderer.invoke('get-screen-bounds'),
  
  // UI & App Actions
  openSettingsWindow: (tab) => ipcRenderer.send('open-settings-window', tab),
  hidePetWindow: () => ipcRenderer.send('hide-pet-window'),
  showPetWindow: () => ipcRenderer.send('show-pet-window'),
  togglePausePet: () => ipcRenderer.send('toggle-pause-pet'),
  closeApp: () => ipcRenderer.send('close-app'),

  // Event Listeners from Main
  onMetricsUpdate: (callback) => {
    const listener = (event, metrics) => callback(metrics);
    ipcRenderer.on('metrics-update', listener);
    return () => ipcRenderer.removeListener('metrics-update', listener);
  },
  onSystemAlert: (callback) => {
    const listener = (event, alert) => callback(alert);
    ipcRenderer.on('system-alert', listener);
    return () => ipcRenderer.removeListener('system-alert', listener);
  },
  onReminderTrigger: (callback) => {
    const listener = (event, reminder) => callback(reminder);
    ipcRenderer.on('reminder-trigger', listener);
    return () => ipcRenderer.removeListener('reminder-trigger', listener);
  },
  onGamingState: (callback) => {
    const listener = (event, state) => callback(state);
    ipcRenderer.on('gaming-state', listener);
    return () => ipcRenderer.removeListener('gaming-state', listener);
  },
  onSettingsChanged: (callback) => {
    const listener = (event, settings) => callback(settings);
    ipcRenderer.on('settings-changed', listener);
    return () => ipcRenderer.removeListener('settings-changed', listener);
  }
});
