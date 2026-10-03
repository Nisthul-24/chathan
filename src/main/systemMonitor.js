const si = require('systeminformation');
const os = require('os');
const { EventEmitter } = require('events');

class SystemMonitor extends EventEmitter {
  constructor(storage) {
    super();
    this.storage = storage;
    this.intervalId = null;
    this.lastTempAlert = 0;
    this.lastBatteryAlert = 0;
    this.lastBatteryLevel = null;
    this.isCharging = null;
  }

  start(intervalMs = 5000) {
    if (this.intervalId) clearInterval(this.intervalId);
    this.poll();
    this.intervalId = setInterval(() => this.poll(), intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async getMetrics() {
    const metrics = {
      cpuUsage: 0,
      cpuTemp: { main: null, max: null, available: false },
      ram: { total: 0, used: 0, free: 0, percent: 0 },
      battery: { hasBattery: false, percent: null, isCharging: false, timeRemaining: null },
      gpu: [],
      disk: { total: 0, used: 0, percent: 0 },
      uptime: os.uptime()
    };

    // RAM via Node os
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    metrics.ram = {
      total: Math.round(totalMem / (1024 * 1024 * 1024) * 10) / 10, // GB
      used: Math.round(usedMem / (1024 * 1024 * 1024) * 10) / 10,
      free: Math.round(freeMem / (1024 * 1024 * 1024) * 10) / 10,
      percent: Math.round((usedMem / totalMem) * 100)
    };

    try {
      // CPU Load
      const currentLoad = await si.currentLoad();
      metrics.cpuUsage = Math.round(currentLoad.currentLoad);
    } catch (e) {
      metrics.cpuUsage = 0;
    }

    try {
      // CPU Temp (graceful fallback)
      const cpuTemp = await si.cpuTemperature();
      if (cpuTemp && (cpuTemp.main !== null && cpuTemp.main > 0)) {
        metrics.cpuTemp = {
          main: Math.round(cpuTemp.main),
          max: cpuTemp.max ? Math.round(cpuTemp.max) : Math.round(cpuTemp.main),
          available: true
        };
      }
    } catch (e) {
      metrics.cpuTemp = { main: null, max: null, available: false };
    }

    try {
      // Battery
      const battery = await si.battery();
      if (battery && battery.hasBattery) {
        metrics.battery = {
          hasBattery: true,
          percent: Math.round(battery.percent),
          isCharging: battery.isCharging,
          timeRemaining: battery.timeRemaining
        };
      }
    } catch (e) {
      metrics.battery = { hasBattery: false, percent: null, isCharging: false, timeRemaining: null };
    }

    try {
      // GPU
      const graphics = await si.graphics();
      if (graphics && graphics.controllers) {
        metrics.gpu = graphics.controllers.map(c => ({
          model: c.model || 'Generic GPU',
          temperature: c.temperatureGpu || null,
          memoryTotal: c.vram || null
        }));
      }
    } catch (e) {
      metrics.gpu = [];
    }

    try {
      // Disk
      const fsSize = await si.fsSize();
      if (fsSize && fsSize.length > 0) {
        const primary = fsSize[0];
        metrics.disk = {
          total: Math.round(primary.size / (1024 * 1024 * 1024)),
          used: Math.round(primary.used / (1024 * 1024 * 1024)),
          percent: Math.round(primary.use)
        };
      }
    } catch (e) {
      metrics.disk = { total: 0, used: 0, percent: 0 };
    }

    return metrics;
  }

  async poll() {
    const settings = this.storage.getSettings();
    const metrics = await this.getMetrics();

    // Check Temperature Alerts
    if (settings.temperatureAlerts && metrics.cpuTemp.available && metrics.cpuTemp.main !== null) {
      const temp = metrics.cpuTemp.main;
      const now = Date.now();
      const COOLDOWN = 10 * 60 * 1000; // 10 minutes

      if (temp >= settings.cpuCriticalTemp) {
        if (now - this.lastTempAlert > COOLDOWN) {
          this.lastTempAlert = now;
          this.emit('alert', {
            type: 'TEMPERATURE_CRITICAL',
            temp: temp,
            message: '🥵 YOUR COMPUTER IS COOKING! (' + temp + '°C)'
          });
        }
      } else if (temp >= settings.cpuWarningTemp) {
        if (now - this.lastTempAlert > COOLDOWN) {
          this.lastTempAlert = now;
          this.emit('alert', {
            type: 'TEMPERATURE_WARNING',
            temp: temp,
            message: '🔥 It\'s getting hot... (' + temp + '°C)'
          });
        }
      }
    }

    // Check Battery Alerts
    if (settings.batteryAlerts && metrics.battery.hasBattery && metrics.battery.percent !== null) {
      const percent = metrics.battery.percent;
      const isCharging = metrics.battery.isCharging;
      const now = Date.now();
      const COOLDOWN = 15 * 60 * 1000;

      // Detect charging plugged in
      if (this.isCharging === false && isCharging === true) {
        this.emit('alert', {
          type: 'BATTERY_CHARGING',
          percent: percent,
          message: 'Ah. Electricity. ⚡'
        });
      }
      this.isCharging = isCharging;

      if (!isCharging) {
        if (percent <= 10) {
          if (now - this.lastBatteryAlert > COOLDOWN) {
            this.lastBatteryAlert = now;
            this.emit('alert', {
              type: 'BATTERY_CRITICAL',
              percent: percent,
              message: 'CHARGE ME— I mean... charge the laptop! 🔋 (' + percent + '%)'
            });
          }
        } else if (percent <= 20) {
          if (now - this.lastBatteryAlert > COOLDOWN) {
            this.lastBatteryAlert = now;
            this.emit('alert', {
              type: 'BATTERY_LOW',
              percent: percent,
              message: '🔋 Your battery is dying. (' + percent + '%)'
            });
          }
        }
      }
    }

    this.emit('metrics', metrics);
  }
}

module.exports = SystemMonitor;
