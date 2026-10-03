const { EventEmitter } = require('events');

class ReminderManager extends EventEmitter {
  constructor(storage) {
    super();
    this.storage = storage;
    this.timers = {};
    this.activeReminders = [];
    this.checkIntervalId = null;
  }

  start() {
    this.scheduleAll();
    // Check every 30 seconds for time-based custom reminders
    if (this.checkIntervalId) clearInterval(this.checkIntervalId);
    this.checkIntervalId = setInterval(() => this.checkTimeBasedReminders(), 30000);
  }

  stop() {
    this.clearAll();
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  clearAll() {
    Object.keys(this.timers).forEach(key => clearInterval(this.timers[key]));
    this.timers = {};
  }

  scheduleAll() {
    this.clearAll();
    const settings = this.storage.getSettings();

    // Built-in Water reminder
    if (settings.waterEnabled && settings.waterInterval > 0) {
      const ms = settings.waterInterval * 60 * 1000;
      this.timers['water'] = setInterval(() => {
        this.triggerReminder({
          id: 'built_in_water',
          type: 'WATER',
          title: 'Hydration Check',
          message: '💧 Drink some water.',
          category: 'WATER'
        });
        this.storage.incrementStat('waterRemindersTaken');
      }, ms);
    }

    // Built-in Screen Break reminder
    if (settings.screenBreakEnabled && settings.screenBreakInterval > 0) {
      const ms = settings.screenBreakInterval * 60 * 1000;
      this.timers['screenBreak'] = setInterval(() => {
        this.triggerReminder({
          id: 'built_in_screen_break',
          type: 'SCREEN_BREAK',
          title: 'Screen Break',
          message: '👀 You\'ve been staring at the screen for a while. Look away!',
          category: 'SCREEN_BREAK'
        });
        this.storage.incrementStat('breaksTaken');
      }, ms);
    }

    // Built-in Stretch reminder
    if (settings.stretchEnabled && settings.stretchInterval > 0) {
      const ms = settings.stretchInterval * 60 * 1000;
      this.timers['stretch'] = setInterval(() => {
        this.triggerReminder({
          id: 'built_in_stretch',
          type: 'STRETCH',
          title: 'Stretch Break',
          message: '🧘 Time to stretch your back and arms!',
          category: 'GENERAL'
        });
        this.storage.incrementStat('breaksTaken');
      }, ms);
    }

    // Custom Interval Reminders
    const customList = this.storage.getCustomReminders();
    customList.forEach(rem => {
      if (rem.enabled && rem.repeat === 'interval' && rem.interval > 0) {
        const ms = rem.interval * 60 * 1000;
        this.timers['custom_' + rem.id] = setInterval(() => {
          this.triggerReminder({
            id: rem.id,
            type: 'CUSTOM',
            title: rem.title || 'Reminder',
            message: rem.message || rem.title || 'Time for your task!',
            category: 'GENERAL'
          });
        }, ms);
      }
    });
  }

  checkTimeBasedReminders() {
    const customList = this.storage.getCustomReminders();
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayStr = now.toISOString().split('T')[0];

    customList.forEach(rem => {
      if (!rem.enabled) return;
      if (rem.repeat === 'daily' || rem.repeat === 'once') {
        if (rem.time === currentHHMM && rem.lastTriggeredDate !== todayStr) {
          rem.lastTriggeredDate = todayStr;
          if (rem.repeat === 'once') rem.enabled = false;
          
          this.storage.saveCustomReminders(customList);
          this.triggerReminder({
            id: rem.id,
            type: 'CUSTOM',
            title: rem.title || 'Reminder',
            message: rem.message || rem.title || 'Time for your task!',
            category: 'GENERAL'
          });
        }
      }
    });
  }

  triggerReminder(reminderObj) {
    this.emit('trigger', reminderObj);
  }

  updateReminders() {
    this.scheduleAll();
  }
}

module.exports = ReminderManager;
