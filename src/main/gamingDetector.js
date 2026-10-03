const { exec } = require('child_process');
const { EventEmitter } = require('events');

class GamingDetector extends EventEmitter {
  constructor(storage) {
    super();
    this.storage = storage;
    this.isGaming = false;
    this.intervalId = null;
  }

  start(intervalMs = 10000) {
    if (this.intervalId) clearInterval(this.intervalId);
    this.check();
    this.intervalId = setInterval(() => this.check(), intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  check() {
    const settings = this.storage.getSettings();
    if (settings.gamingMode === 'off') {
      if (this.isGaming) {
        this.isGaming = false;
        this.emit('gaming-state-changed', { isGaming: false });
      }
      return;
    }

    if (settings.gamingMode === 'on') {
      if (!this.isGaming) {
        this.isGaming = true;
        this.emit('gaming-state-changed', { isGaming: true });
      }
      return;
    }

    // Auto mode: check foreground window bounds on Windows
    if (process.platform === 'win32') {
      const psCommand = `
        Add-Type @"
          using System;
          using System.Runtime.InteropServices;
          public class WinApi {
            [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
            [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
            [DllImport("user32.dll")] public static extern int GetSystemMetrics(int nIndex);
            [StructLayout(LayoutKind.Sequential)]
            public struct RECT { public int Left, Top, Right, Bottom; }
          }
"@
        $handle = [WinApi]::GetForegroundWindow()
        if ($handle -ne [IntPtr]::Zero) {
          $rect = New-Object WinApi+RECT
          [WinApi]::GetWindowRect($handle, [ref]$rect)
          $screenWidth = [WinApi]::GetSystemMetrics(0)
          $screenHeight = [WinApi]::GetSystemMetrics(1)
          $w = $rect.Right - $rect.Left
          $h = $rect.Bottom - $rect.Top
          if ($w -ge $screenWidth -and $h -ge $screenHeight) { "FULLSCREEN" } else { "NORMAL" }
        } else { "NORMAL" }
      `.replace(/\r?\n/g, ' ');

      try {
        exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCommand}"`, { timeout: 4000 }, (error, stdout) => {
          if (!error && stdout) {
            const isFull = stdout.trim().includes('FULLSCREEN');
            if (isFull !== this.isGaming) {
              this.isGaming = isFull;
              this.emit('gaming-state-changed', { isGaming: isFull });
            }
          }
        });
      } catch (e) {}
    }
  }
}

module.exports = GamingDetector;
