class DesktopPet {
  constructor() {
    this.wrapper = document.getElementById('goblin-wrapper');
    this.speechBubble = document.getElementById('speech-bubble');
    this.speechText = document.getElementById('speech-text');
    this.contextMenu = document.getElementById('context-menu');
    this.particleContainer = document.getElementById('particle-container');

    this.screenW = window.innerWidth || 1920;
    this.screenH = window.innerHeight || 1080;

    this.petW = 100;
    this.petH = 100;

    // Position (starts near bottom right corner)
    this.posX = this.screenW - 200;
    this.posY = this.screenH - 140;
    this.targetX = this.posX;
    
    this.state = 'idle'; // idle, walk, sit, sleep, happy, confused, warning, quiet
    this.facingLeft = false;

    this.settings = {
      movementEnabled: true,
      petScale: 1.0,
      petSpeed: 1.0,
      dialogueEnabled: true,
      dialogueFrequency: 'normal',
      soundEnabled: false,
      soundVolume: 0.5,
      speechBubble: true
    };

    this.isQuiet = false; // Quiet/Gaming mode
    this.clickCount = 0;
    this.clickTimer = null;
    this.bubbleTimeout = null;
    this.stateTimeout = null;
    this.movementTimer = null;

    this.init();
  }

  async init() {
    // Get screen bounds from main
    try {
      if (window.electronAPI) {
        const bounds = await window.electronAPI.getScreenBounds();
        this.screenW = bounds.width;
        this.screenH = bounds.height;
        this.posY = this.screenH - 140;
      }
    } catch (e) {}

    // Load initial settings
    if (window.electronAPI) {
      const s = await window.electronAPI.getSettings();
      this.updateSettings(s);

      // Listen for settings change
      window.electronAPI.onSettingsChanged((newS) => this.updateSettings(newS));
      window.electronAPI.onReminderTrigger((rem) => this.handleReminderTrigger(rem));
      window.electronAPI.onSystemAlert((alert) => this.handleSystemAlert(alert));
      window.electronAPI.onGamingState((state) => this.handleGamingState(state));
    }

    this.updatePosition();
    this.setupEventListeners();
    this.startBehaviorLoop();

    // Initial greeting after 2 seconds
    setTimeout(() => {
      this.say("🧌 *yawn* I'm awake!");
      if (window.soundSystem) window.soundSystem.playYawn();
    }, 2000);
  }

  updateSettings(s) {
    this.settings = { ...this.settings, ...s };
    if (window.soundSystem) {
      window.soundSystem.setSettings(this.settings.soundEnabled, this.settings.soundVolume);
    }
    const scale = this.settings.petScale || 1.0;
    this.wrapper.style.transform = `scale(${scale}) ${this.facingLeft ? 'scaleX(-1)' : ''}`;
  }

  updatePosition() {
    // Keep pet clamped within screen bounds
    this.posX = Math.max(10, Math.min(this.screenW - this.petW - 10, this.posX));
    this.posY = Math.max(10, Math.min(this.screenH - this.petH - 10, this.posY));

    this.wrapper.style.left = `${this.posX}px`;
    this.wrapper.style.top = `${this.posY}px`;

    // Reposition speech bubble if active
    if (!this.speechBubble.classList.contains('hidden')) {
      this.repositionSpeechBubble();
    }
  }

  repositionSpeechBubble() {
    const scale = this.settings.petScale || 1.0;
    const headX = this.posX + (50 * scale);
    const headY = this.posY - (10 * scale);

    const clampedX = Math.max(90, Math.min(this.screenW - 90, headX));
    const clampedY = Math.max(50, headY);

    this.speechBubble.style.left = `${clampedX}px`;
    this.speechBubble.style.top = `${clampedY}px`;
  }

  setState(newState, duration = 0) {
    this.state = newState;
    this.wrapper.className = `state-${newState} ${this.facingLeft ? 'face-left' : ''}`;

    if (duration > 0) {
      if (this.stateTimeout) clearTimeout(this.stateTimeout);
      this.stateTimeout = setTimeout(() => {
        this.setState('idle');
      }, duration);
    }
  }

  say(message, duration = 5000) {
    if (!this.settings.dialogueEnabled || !this.settings.speechBubble || !message) return;
    if (this.isQuiet) return; // Do not show speech bubble in Quiet/Gaming mode

    this.speechText.innerText = message;
    this.speechBubble.classList.remove('hidden');
    this.repositionSpeechBubble();

    if (this.bubbleTimeout) clearTimeout(this.bubbleTimeout);
    this.bubbleTimeout = setTimeout(() => {
      this.speechBubble.classList.add('hidden');
    }, duration);
  }

  spawnParticle(emoji) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.innerText = emoji;
    p.style.left = `${this.posX + 40 + (Math.random() * 20 - 10)}px`;
    p.style.top = `${this.posY + 10}px`;
    this.particleContainer.appendChild(p);

    setTimeout(() => {
      if (p.parentNode) p.parentNode.removeChild(p);
    }, 1500);
  }

  // --- Behavior Loop ---
  startBehaviorLoop() {
    const nextTick = () => {
      if (!this.isQuiet && this.settings.movementEnabled && this.state !== 'sleep') {
        const rand = Math.random();
        if (rand < 0.45) {
          // Walk to a new random location near screen bottom
          this.walkToRandomLocation();
        } else if (rand < 0.70) {
          // Sit down
          this.setState('sit', 15000 + Math.random() * 20000);
        } else if (rand < 0.85) {
          // Look around / Dialogue
          this.setState('idle', 10000);
          if (window.dialogueSystem) {
            const msg = window.dialogueSystem.getDialogue('RANDOM', this.settings.dialogueFrequency);
            if (msg) this.say(msg);
          }
        } else {
          // Sleep for a short while
          this.setState('sleep', 20000 + Math.random() * 30000);
          this.spawnParticle('💤');
        }
      }

      // Schedule next tick (sparse: every 25 - 65 seconds)
      const nextInterval = 25000 + Math.random() * 40000;
      this.movementTimer = setTimeout(nextTick, nextInterval);
    };

    // First behavior tick after 10s
    this.movementTimer = setTimeout(nextTick, 10000);
  }

  walkToRandomLocation() {
    // Pick random target X position (stay along bottom edge or lower quarter)
    const padding = 50;
    this.targetX = padding + Math.random() * (this.screenW - this.petW - (padding * 2));
    this.facingLeft = this.targetX < this.posX;
    this.setState('walk');

    const baseSpeed = 1.5 * (this.settings.petSpeed || 1.0);

    const animateWalk = () => {
      if (this.state !== 'walk' || this.isQuiet) return;

      const dist = this.targetX - this.posX;
      if (Math.abs(dist) <= baseSpeed) {
        this.posX = this.targetX;
        this.updatePosition();
        this.setState('idle');
      } else {
        const step = dist > 0 ? baseSpeed : -baseSpeed;
        this.posX += step;
        this.updatePosition();

        if (Math.random() < 0.08 && window.soundSystem) {
          window.soundSystem.playStep();
        }

        requestAnimationFrame(animateWalk);
      }
    };

    requestAnimationFrame(animateWalk);
  }

  // --- Interaction & Events ---
  setupEventListeners() {
    // Mouse hover ignore management
    const enableClick = () => {
      if (window.electronAPI) window.electronAPI.setIgnoreMouseEvents(false);
    };

    const disableClick = () => {
      if (this.contextMenu.classList.contains('hidden')) {
        if (window.electronAPI) window.electronAPI.setIgnoreMouseEvents(true, true);
      }
    };

    this.wrapper.addEventListener('mouseenter', enableClick);
    this.wrapper.addEventListener('mouseleave', disableClick);
    this.speechBubble.addEventListener('mouseenter', enableClick);
    this.speechBubble.addEventListener('mouseleave', disableClick);
    this.contextMenu.addEventListener('mouseenter', enableClick);
    this.contextMenu.addEventListener('mouseleave', disableClick);

    // Mouse Drag and Drop placement logic
    let isDragging = false;
    let hasMoved = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    this.wrapper.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Left click only
      isDragging = true;
      hasMoved = false;
      dragOffsetX = e.clientX - this.posX;
      dragOffsetY = e.clientY - this.posY;
      this.wrapper.style.cursor = 'grabbing';
      if (window.electronAPI) window.electronAPI.setIgnoreMouseEvents(false);
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const newX = e.clientX - dragOffsetX;
        const newY = e.clientY - dragOffsetY;

        if (Math.hypot(newX - this.posX, newY - this.posY) > 5) {
          hasMoved = true;
        }

        this.posX = Math.max(0, Math.min(this.screenW - this.petW, newX));
        this.posY = Math.max(0, Math.min(this.screenH - this.petH, newY));
        this.updatePosition();
        if (this.state !== 'happy') this.setState('happy');
      } else {
        this.trackCursorWithEyes(e.clientX, e.clientY);
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (isDragging) {
        isDragging = false;
        this.wrapper.style.cursor = 'pointer';
        if (hasMoved) {
          this.spawnParticle('📍');
          if (window.soundSystem) window.soundSystem.playPop();
          this.setState('idle');
          disableClick();
        }
      }
    });

    // Left Click: Interact with Chathan (only if not dragged)
    this.wrapper.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!hasMoved) {
        this.handleLeftClick();
      }
    });

    // Double Click: Open Control Center App Window
    this.wrapper.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (window.electronAPI) window.electronAPI.openSettingsWindow('pet');
    });

    // Right Click: Custom Context Menu
    this.wrapper.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showContextMenu(e.clientX, e.clientY);
    });

    // Document click closes context menu
    document.addEventListener('click', () => {
      this.hideContextMenu();
      disableClick();
    });

    // Handle Context Menu Item Clicks
    this.contextMenu.addEventListener('click', (e) => {
      const item = e.target.closest('.menu-item');
      if (!item) return;
      const action = item.dataset.action;
      this.handleContextAction(action);
      this.hideContextMenu();
    });
  }

  trackCursorWithEyes(cursorX, cursorY) {
    if (this.state === 'sleep') return;
    const pupilLeft = document.getElementById('pupil-left');
    const pupilRight = document.getElementById('pupil-right');
    const irisLeft = document.getElementById('iris-left');
    const irisRight = document.getElementById('iris-right');

    if (!pupilLeft || !pupilRight) return;

    const scale = this.settings.petScale || 1.0;
    const goblinCenterX = this.posX + (50 * scale);
    const goblinCenterY = this.posY + (45 * scale);

    let dx = cursorX - goblinCenterX;
    let dy = cursorY - goblinCenterY;

    // Invert dx when flipped horizontally (face-left) so pupils track cursor correctly
    if (this.facingLeft) {
      dx = -dx;
    }

    const angle = Math.atan2(dy, dx);
    const dist = Math.min(3.0, Math.hypot(dx, dy) / 60);

    const offsetX = Math.cos(angle) * dist;
    const offsetY = Math.sin(angle) * dist;

    pupilLeft.setAttribute('cx', 38 + offsetX);
    pupilLeft.setAttribute('cy', 43 + offsetY);
    irisLeft.setAttribute('cx', 38 + offsetX);
    irisLeft.setAttribute('cy', 43 + offsetY);

    pupilRight.setAttribute('cx', 62 + offsetX);
    pupilRight.setAttribute('cy', 43 + offsetY);
    irisRight.setAttribute('cx', 62 + offsetX);
    irisRight.setAttribute('cy', 43 + offsetY);
  }

  handleLeftClick() {
    this.clickCount++;
    if (window.electronAPI) {
      window.electronAPI.incrementStat('interactions', 1);
    }

    if (this.clickTimer) clearTimeout(this.clickTimer);
    this.clickTimer = setTimeout(() => {
      this.clickCount = 0;
    }, 3000);

    // Easter Egg: Excessive clicking
    if (this.clickCount >= 8) {
      this.setState('confused', 3000);
      this.say("Stop bullying the goblin! 🗯️");
      this.spawnParticle('🗯️');
      if (window.soundSystem) window.soundSystem.playAlert();
      this.clickCount = 0;
      return;
    } else if (this.clickCount >= 5) {
      this.setState('warning', 2000);
      this.say("HEY! Watch it! 💢");
      this.spawnParticle('💢');
      if (window.soundSystem) window.soundSystem.playChirp();
      return;
    }

    // Normal Click Reaction
    this.setState('happy', 2000);
    this.spawnParticle('✨');
    if (window.soundSystem) window.soundSystem.playPop();

    if (window.dialogueSystem) {
      const msg = window.dialogueSystem.getRandomMessageForMood('Happy');
      if (msg) this.say(msg);
    }
  }

  showContextMenu(x, y) {
    if (window.electronAPI) window.electronAPI.setIgnoreMouseEvents(false);
    this.contextMenu.style.left = `${Math.min(x, this.screenW - 160)}px`;
    this.contextMenu.style.top = `${Math.min(y, this.screenH - 260)}px`;
    this.contextMenu.classList.remove('hidden');
  }

  hideContextMenu() {
    this.contextMenu.classList.add('hidden');
  }

  handleContextAction(action) {
    switch (action) {
      case 'talk':
        this.setState('happy', 2000);
        if (window.dialogueSystem) {
          const msg = window.dialogueSystem.getDialogue('GENERAL', 'normal', true);
          this.say(msg);
        }
        break;
      case 'feed':
        this.setState('happy', 3000);
        this.say("Omnomnom! Delicious! 🍎");
        this.spawnParticle('🍎');
        if (window.soundSystem) window.soundSystem.playPop();
        break;
      case 'pet':
        this.setState('happy', 3000);
        this.say("Purr... Goblins love pats! ❤️");
        this.spawnParticle('❤️');
        if (window.soundSystem) window.soundSystem.playChirp();
        break;
      case 'play':
        this.setState('happy', 4000);
        this.say("Wee! Goblin party time! 🎉");
        this.spawnParticle('🎉');
        if (window.soundSystem) window.soundSystem.playChirp();
        break;
      case 'sleep':
        this.setState('sleep', 30000);
        this.say("Zzz... Wake me later. 💤");
        this.spawnParticle('💤');
        if (window.soundSystem) window.soundSystem.playYawn();
        break;
      case 'pause':
        if (window.electronAPI) window.electronAPI.togglePausePet();
        break;
      case 'hide':
        if (window.electronAPI) window.electronAPI.hidePetWindow();
        break;
      case 'settings':
        if (window.electronAPI) window.electronAPI.openSettingsWindow('pet');
        break;
      case 'exit':
        if (window.electronAPI) window.electronAPI.closeApp();
        break;
    }
  }

  handleReminderTrigger(reminder) {
    this.setState('happy', 4000);
    this.say(`${reminder.title}: ${reminder.message}`, 8000);
    this.spawnParticle(reminder.category === 'WATER' ? '💧' : '⏰');
    if (window.soundSystem) window.soundSystem.playAlert();
  }

  handleSystemAlert(alert) {
    this.setState('warning', 5000);
    this.say(alert.message, 8000);
    this.spawnParticle(alert.type.includes('TEMPERATURE') ? '🔥' : '🔋');
    if (window.soundSystem) window.soundSystem.playAlert();
  }

  handleGamingState(state) {
    this.isQuiet = state.isGaming;
    if (this.isQuiet) {
      this.speechBubble.classList.add('hidden');
      this.setState('sit');
    } else {
      this.setState('idle');
      this.say("🎮 Gaming session ended! Welcome back.");
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.pet = new DesktopPet();
});
