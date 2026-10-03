document.addEventListener('DOMContentLoaded', async () => {
  // Tab Switcher
  const navBtns = document.querySelectorAll('.nav-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  function switchTab(tabId) {
    navBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    tabContents.forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabId}`);
    });
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Check URL Query Param for tab
  const urlParams = new URLSearchParams(window.location.search);
  const requestedTab = urlParams.get('tab');
  if (requestedTab) {
    if (requestedTab === 'welcome') {
      document.getElementById('welcome-modal').classList.remove('hidden');
      switchTab('pet');
    } else {
      switchTab(requestedTab);
    }
  }

  if (!window.electronAPI) return;

  // Load Settings
  let currentSettings = await window.electronAPI.getSettings();

  if (currentSettings.isFirstLaunch) {
    document.getElementById('welcome-modal').classList.remove('hidden');
  }

  populateSettingsForm(currentSettings);
  loadStats();
  loadCustomReminders();

  // Listen for hardware metrics updates from main
  window.electronAPI.onMetricsUpdate((metrics) => {
    updateMetricsUI(metrics);
  });

  // Bind Input Change Listeners
  const bindCheckbox = (id, key) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        saveField({ [key]: el.checked });
      });
    }
  };

  const bindInput = (id, key, isFloat = false) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        const val = isFloat ? parseFloat(el.value) : (el.type === 'number' ? parseInt(el.value) : el.value);
        
        // Update label badge if exists
        const badge = document.getElementById(`val-${key}`);
        if (badge) badge.innerText = isFloat ? `${val}x` : (id.includes('Volume') ? `${Math.round(val * 100)}%` : val);

        saveField({ [key]: val });
      });
    }
  };

  bindCheckbox('set-petEnabled', 'petEnabled');
  bindCheckbox('set-movementEnabled', 'movementEnabled');
  bindCheckbox('set-alwaysOnTop', 'alwaysOnTop');
  bindInput('set-petScale', 'petScale', true);
  bindInput('set-petSpeed', 'petSpeed', true);
  bindInput('set-petMonitor', 'petMonitor');

  bindCheckbox('set-waterEnabled', 'waterEnabled');
  bindInput('set-waterInterval', 'waterInterval');
  bindCheckbox('set-screenBreakEnabled', 'screenBreakEnabled');
  bindInput('set-screenBreakInterval', 'screenBreakInterval');
  bindCheckbox('set-stretchEnabled', 'stretchEnabled');
  bindInput('set-stretchInterval', 'stretchInterval');

  bindCheckbox('set-temperatureAlerts', 'temperatureAlerts');
  bindInput('set-cpuWarningTemp', 'cpuWarningTemp');
  bindCheckbox('set-batteryAlerts', 'batteryAlerts');

  bindCheckbox('set-dialogueEnabled', 'dialogueEnabled');
  bindInput('set-dialogueFrequency', 'dialogueFrequency');
  bindCheckbox('set-soundEnabled', 'soundEnabled');
  bindInput('set-soundVolume', 'soundVolume', true);

  bindInput('set-gamingMode', 'gamingMode');
  bindCheckbox('set-hideDuringGames', 'hideDuringGames');

  async function saveField(partial) {
    currentSettings = await window.electronAPI.saveSettings(partial);
  }

  function populateSettingsForm(s) {
    setChecked('set-petEnabled', s.petEnabled);
    setChecked('set-movementEnabled', s.movementEnabled);
    setChecked('set-alwaysOnTop', s.alwaysOnTop);
    setVal('set-petScale', s.petScale);
    setVal('set-petSpeed', s.petSpeed);
    setVal('set-petMonitor', s.petMonitor);

    setChecked('set-waterEnabled', s.waterEnabled);
    setVal('set-waterInterval', s.waterInterval);
    setChecked('set-screenBreakEnabled', s.screenBreakEnabled);
    setVal('set-screenBreakInterval', s.screenBreakInterval);
    setChecked('set-stretchEnabled', s.stretchEnabled);
    setVal('set-stretchInterval', s.stretchInterval);

    setChecked('set-temperatureAlerts', s.temperatureAlerts);
    setVal('set-cpuWarningTemp', s.cpuWarningTemp);
    setChecked('set-batteryAlerts', s.batteryAlerts);

    setChecked('set-dialogueEnabled', s.dialogueEnabled);
    setVal('set-dialogueFrequency', s.dialogueFrequency);
    setChecked('set-soundEnabled', s.soundEnabled);
    setVal('set-soundVolume', s.soundVolume);

    setChecked('set-gamingMode', s.gamingMode);
    setChecked('set-hideDuringGames', s.hideDuringGames);

    // Badges
    if (document.getElementById('val-petScale')) document.getElementById('val-petScale').innerText = `${s.petScale}x`;
    if (document.getElementById('val-petSpeed')) document.getElementById('val-petSpeed').innerText = `${s.petSpeed}x`;
    if (document.getElementById('val-soundVolume')) document.getElementById('val-soundVolume').innerText = `${Math.round(s.soundVolume * 100)}%`;
  }

  function setChecked(id, val) {
    const el = document.getElementById(id);
    if (el) el.checked = !!val;
  }

  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

  // --- Hardware Metrics UI ---
  function updateMetricsUI(m) {
    // CPU
    document.getElementById('metric-cpu').innerText = `${m.cpuUsage}%`;
    document.getElementById('bar-cpu').style.width = `${m.cpuUsage}%`;

    // RAM
    document.getElementById('metric-ram').innerText = `${m.ram.used} / ${m.ram.total} GB`;
    document.getElementById('metric-ram-sub').innerText = `${m.ram.percent}% memory used`;
    document.getElementById('bar-ram').style.width = `${m.ram.percent}%`;

    // Temp
    if (m.cpuTemp.available && m.cpuTemp.main !== null) {
      document.getElementById('metric-temp').innerText = `${m.cpuTemp.main}°C`;
      document.getElementById('metric-temp-sub').innerText = `Max: ${m.cpuTemp.max}°C`;
    } else {
      document.getElementById('metric-temp').innerText = `Unavailable`;
      document.getElementById('metric-temp-sub').innerText = `Sensor not exposed by OS`;
    }

    // Battery
    if (m.battery.hasBattery && m.battery.percent !== null) {
      document.getElementById('metric-battery').innerText = `${m.battery.percent}%`;
      document.getElementById('metric-battery-sub').innerText = m.battery.isCharging ? `Charging ⚡` : `Discharging`;
    } else {
      document.getElementById('metric-battery').innerText = `Desktop / AC`;
      document.getElementById('metric-battery-sub').innerText = `No battery detected`;
    }
  }

  // --- Stats UI ---
  async function loadStats() {
    const stats = await window.electronAPI.getStats();
    const hrs = Math.floor(stats.screenTimeMinutes / 60);
    const mins = stats.screenTimeMinutes % 60;
    document.getElementById('stat-screentime').innerText = `${hrs}h ${mins}m`;
    document.getElementById('stat-breaks').innerText = stats.breaksTaken;
    document.getElementById('stat-water').innerText = stats.waterRemindersTaken;
    document.getElementById('stat-interactions').innerText = stats.interactions;
  }

  // --- Custom Reminders Modal & List ---
  const reminderModal = document.getElementById('reminder-modal');
  const btnAddRem = document.getElementById('btn-add-custom-reminder');
  const btnCancelRem = document.getElementById('btn-cancel-reminder');
  const btnSaveRem = document.getElementById('btn-save-reminder');
  const remRepeatSelect = document.getElementById('rem-repeat');

  if (btnAddRem) {
    btnAddRem.addEventListener('click', () => reminderModal.classList.remove('hidden'));
  }
  if (btnCancelRem) {
    btnCancelRem.addEventListener('click', () => reminderModal.classList.add('hidden'));
  }

  if (remRepeatSelect) {
    remRepeatSelect.addEventListener('change', () => {
      const type = remRepeatSelect.value;
      if (type === 'interval') {
        document.getElementById('group-rem-time').classList.add('hidden');
        document.getElementById('group-rem-interval').classList.remove('hidden');
      } else {
        document.getElementById('group-rem-time').classList.remove('hidden');
        document.getElementById('group-rem-interval').classList.add('hidden');
      }
    });
  }

  if (btnSaveRem) {
    btnSaveRem.addEventListener('click', async () => {
      const title = document.getElementById('rem-title').value.trim() || 'Custom Reminder';
      const message = document.getElementById('rem-message').value.trim() || title;
      const repeat = document.getElementById('rem-repeat').value;
      const time = document.getElementById('rem-time').value;
      const interval = parseInt(document.getElementById('rem-interval').value) || 60;

      const newRem = {
        id: 'rem_' + Date.now(),
        title,
        message,
        repeat,
        time,
        interval,
        enabled: true
      };

      const existing = await window.electronAPI.getCustomReminders();
      existing.push(newRem);
      await window.electronAPI.saveCustomReminders(existing);

      reminderModal.classList.add('hidden');
      loadCustomReminders();
    });
  }

  async function loadCustomReminders() {
    const listContainer = document.getElementById('custom-reminders-list');
    if (!listContainer) return;
    const reminders = await window.electronAPI.getCustomReminders();

    if (reminders.length === 0) {
      listContainer.innerHTML = `<div class="setting-desc">No custom reminders added yet. Click "+ Add Reminder" above.</div>`;
      return;
    }

    listContainer.innerHTML = '';
    reminders.forEach((r, idx) => {
      const div = document.createElement('div');
      div.className = 'reminder-item';
      div.innerHTML = `
        <div>
          <strong style="color: #ffffff">${r.title}</strong>
          <div class="setting-desc">${r.message} (${r.repeat === 'interval' ? `Every ${r.interval}m` : `@ ${r.time}`})</div>
        </div>
        <button class="btn-danger-sm" data-idx="${idx}">Delete</button>
      `;
      listContainer.appendChild(div);
    });

    listContainer.querySelectorAll('.btn-danger-sm').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const idx = parseInt(e.target.dataset.idx);
        const reminders = await window.electronAPI.getCustomReminders();
        reminders.splice(idx, 1);
        await window.electronAPI.saveCustomReminders(reminders);
        loadCustomReminders();
      });
    });
  }

  // --- Welcome Modal Finish ---
  const btnFinishWelcome = document.getElementById('btn-finish-welcome');
  if (btnFinishWelcome) {
    btnFinishWelcome.addEventListener('click', async () => {
      const wWater = document.getElementById('w-water').checked;
      const wBreak = document.getElementById('w-break').checked;
      const wTemp = document.getElementById('w-temp').checked;
      const wBattery = document.getElementById('w-battery').checked;

      await window.electronAPI.saveSettings({
        isFirstLaunch: false,
        waterEnabled: wWater,
        screenBreakEnabled: wBreak,
        temperatureAlerts: wTemp,
        batteryAlerts: wBattery
      });

      document.getElementById('welcome-modal').classList.add('hidden');
    });
  }
});
