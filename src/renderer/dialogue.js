class DialogueSystem {
  constructor() {
    this.lastDialogueTime = 0;
    this.messages = {
      GENERAL: [
        "Hmm...",
        "What are you doing?",
        "I'm watching you.",
        "You have been suspiciously productive.",
        "I'm bored.",
        "Give me attention.",
        "I live here now.",
        "Did you forget about me?",
        "Interesting...",
        "Carry on, human."
      ],
      WATER: [
        "💧 Drink some water.",
        "Hydration check.",
        "Your goblin demands water.",
        "Water. Now.",
        "Even goblins need hydration."
      ],
      SCREEN_BREAK: [
        "👀 You've been staring at the screen for a while.",
        "Look away for a bit.",
        "Your eyes are still attached, right?",
        "Five-minute break?",
        "The screen isn't going anywhere."
      ],
      STUDY: [
        "Study hard, little human.",
        "Focus on the scrolls.",
        "Wisdom requires patience.",
        "No distractions!"
      ],
      GAMING: [
        "Gaming again?",
        "I see what you're doing.",
        "Okay, I'll stay quiet.",
        "Don't blame me if you lose.",
        "Focus, warrior."
      ],
      NIGHT: [
        "It's late...",
        "You should probably sleep.",
        "Even I need sleep.",
        "Tomorrow exists too, you know."
      ],
      BATTERY: [
        "🔋 Your battery is dying.",
        "CHARGE ME— I mean... charge the laptop.",
        "Ah. Electricity."
      ],
      TEMPERATURE: [
        "🔥 It's getting hot!",
        "Why is your computer cooking itself?",
        "Your laptop is becoming a toaster.",
        "Temperature is getting high."
      ],
      BORED: [
        "You forgot I exist.",
        "*sigh*",
        "Is anyone home?",
        "Boring...",
        "Maybe I should tidy up your desktop..."
      ],
      HAPPY: [
        "I like it here!",
        "Best desktop ever.",
        "Hehehe!",
        "✨ Magic is real!"
      ],
      SLEEP: [
        "Zzz...",
        "Snore...",
        "Five more minutes...",
        "Sleeping time."
      ],
      RANDOM: [
        "...",
        "👁️",
        "I have no idea what I'm doing.",
        "Do goblins get weekends?",
        "I wonder what's inside the recycle bin.",
        "Don't mind me.",
        "I'm plotting something.",
        "Never trust a quiet goblin."
      ]
    };
  }

  getCooldown(frequency) {
    switch (frequency) {
      case 'low': return 10 * 60 * 1000;
      case 'high': return 2.5 * 60 * 1000;
      case 'normal':
      default: return 5 * 60 * 1000;
    }
  }

  canTalk(frequency = 'normal', force = false) {
    if (force) return true;
    const now = Date.now();
    const cooldown = this.getCooldown(frequency);
    return (now - this.lastDialogueTime) >= cooldown;
  }

  getDialogue(category = 'RANDOM', frequency = 'normal', force = false) {
    if (!this.canTalk(frequency, force)) return null;

    let pool = this.messages[category] || this.messages.GENERAL;

    // Time of day overrides if RANDOM/GENERAL
    if (category === 'RANDOM' || category === 'GENERAL') {
      const hour = new Date().getHours();
      if (hour >= 23 || hour < 5) {
        pool = [...pool, ...this.messages.NIGHT];
      }
    }

    const index = Math.floor(Math.random() * pool.length);
    const msg = pool[index];
    this.lastDialogueTime = Date.now();
    return msg;
  }

  getRandomMessageForMood(mood) {
    switch (mood) {
      case 'Bored': return this.getDialogue('BORED', 'normal', true);
      case 'Sleepy': return this.getDialogue('SLEEP', 'normal', true);
      case 'Happy': return this.getDialogue('HAPPY', 'normal', true);
      case 'Mischievous': return this.getDialogue('RANDOM', 'normal', true);
      default: return this.getDialogue('GENERAL', 'normal', true);
    }
  }
}

if (typeof window !== 'undefined') {
  window.dialogueSystem = new DialogueSystem();
}
