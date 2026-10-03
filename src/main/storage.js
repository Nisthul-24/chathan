const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class Storage {
  constructor() {
    this.userDataPath = app ? app.getPath('userData') : path.join(__dirname, '../../data');
    if (!fs.existsSync(this.userDataPath)) {
      fs.mkdirSync(this.userDataPath, { recursive: true });
    }
    this.filePath = path.join(this.userDataPath, 'chathan_store.json');
    this.data = this.loadData();
  }

  getDefaults() {
    return {
      settings: {
        petEnabled: true,
        movementEnabled: true,
        alwaysOnTop: true,
        petScale: 1.0,
        petSpeed: 1.0,
        petMonitor: 'primary', // 'primary' or 'all'
        
        // Reminders
        waterEnabled: true,
        waterInterval: 45, // minutes
        screenBreakEnabled: true,
        screenBreakInterval: 50, // minutes
        stretchEnabled: true,
        stretchInterval: 90, // minutes
        
        // System
        temperatureAlerts: true,
        batteryAlerts: true,
        ramAlerts: true,
        cpuWarningTemp: 80,
        cpuCriticalTemp: 90,
        
        // Personality & Sound
        dialogueEnabled: true,
        dialogueFrequency: 'normal', // 'low', 'normal', 'high'
        soundEnabled: false,
        soundVolume: 0.5,
        
        // Gaming
        gamingMode: 'auto', // 'off', 'on', 'auto'
        hideDuringGames: true,
        
        // Appearance
        theme: 'dark-magical',
        speechBubble: true,
        
        // System Startup
        startWithWindows: false,
        
        // Setup state
        isFirstLaunch: true
      },
      customReminders: [
        /*
        {
          id: 'rem_1',
          title: 'Stretch & Hydrate',
          time: '14:30',
          repeat: 'daily', // 'daily', 'interval', 'once'
          interval: 60,
          enabled: true,
          message: 'Time to stand up and stretch!'
        }
        */
      ],
      stats: {
        todayDate: new Date().toISOString().split('T')[0],
        screenTimeMinutes: 0,
        breaksTaken: 0,
        waterRemindersTaken: 0,
        interactions: 0,
        history: {}
      },
      personality: {
        mood: 'Happy',
        lastInteraction: Date.now(),
        lastReminder: Date.now(),
        idleTime: 0,
        dailyInteractions: 0
      }
    };
  }

  loadData() {
    try {
      if (fs.existsSync(this.filePath)) {
        const fileContent = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(fileContent);
        
        // Merge with defaults in case new fields exist
        const defaults = this.getDefaults();
        const mergedSettings = { ...defaults.settings, ...parsed.settings };
        const mergedCustomReminders = parsed.customReminders || [];
        const mergedStats = { ...defaults.stats, ...parsed.stats };
        const mergedPersonality = { ...defaults.personality, ...parsed.personality };

        // Reset daily stats if day changed
        const today = new Date().toISOString().split('T')[0];
        if (mergedStats.todayDate !== today) {
          if (mergedStats.todayDate) {
            mergedStats.history[mergedStats.todayDate] = {
              screenTimeMinutes: mergedStats.screenTimeMinutes,
              breaksTaken: mergedStats.breaksTaken,
              waterRemindersTaken: mergedStats.waterRemindersTaken,
              interactions: mergedStats.interactions
            };
          }
          mergedStats.todayDate = today;
          mergedStats.screenTimeMinutes = 0;
          mergedStats.breaksTaken = 0;
          mergedStats.waterRemindersTaken = 0;
          mergedStats.interactions = 0;
        }

        return {
          settings: mergedSettings,
          customReminders: mergedCustomReminders,
          stats: mergedStats,
          personality: mergedPersonality
        };
      }
    } catch (err) {
      console.error('Error loading Chathan storage:', err);
    }
    return this.getDefaults();
  }

  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving Chathan storage:', err);
    }
  }

  getSettings() {
    return this.data.settings;
  }

  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
    return this.data.settings;
  }

  getCustomReminders() {
    return this.data.customReminders;
  }

  saveCustomReminders(reminders) {
    this.data.customReminders = reminders;
    this.save();
    return this.data.customReminders;
  }

  getStats() {
    return this.data.stats;
  }

  incrementStat(key, amount = 1) {
    if (this.data.stats[key] !== undefined) {
      this.data.stats[key] += amount;
      this.save();
    }
    return this.data.stats;
  }

  getPersonality() {
    return this.data.personality;
  }

  updatePersonality(newPers) {
    this.data.personality = { ...this.data.personality, ...newPers };
    this.save();
    return this.data.personality;
  }
}

module.exports = Storage;
