// Sound effects using Web Audio API (no external files needed)

const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playNotes(notes: [number, number][], type: OscillatorType = 'sine', volume = 0.12) {
  notes.forEach(([freq, delay]) => {
    setTimeout(() => playTone(freq, 0.2, type, volume), delay);
  });
}

export const SFX = {
  diceRoll() {
    // Quick rattle sound
    for (let i = 0; i < 6; i++) {
      setTimeout(() => playTone(200 + Math.random() * 400, 0.05, 'square', 0.06), i * 50);
    }
  },

  move() {
    playTone(440, 0.08, 'sine', 0.08);
  },

  buy() {
    playNotes([[523, 0], [659, 100], [784, 200]], 'sine', 0.15);
  },

  rent() {
    playNotes([[400, 0], [300, 150], [200, 300]], 'sawtooth', 0.1);
  },

  tax() {
    playNotes([[500, 0], [400, 100], [300, 200]], 'triangle', 0.1);
  },

  jail() {
    playNotes([[300, 0], [200, 200], [150, 400]], 'square', 0.1);
  },

  passGo() {
    playNotes([[523, 0], [659, 80], [784, 160], [1047, 240]], 'sine', 0.12);
  },

  buildHouse() {
    playNotes([[350, 0], [440, 100], [523, 200]], 'triangle', 0.1);
  },

  card() {
    playNotes([[600, 0], [800, 100]], 'sine', 0.1);
  },

  double() {
    playNotes([[523, 0], [659, 80], [523, 160], [659, 240]], 'sine', 0.12);
  },

  bankrupt() {
    playNotes([[400, 0], [350, 200], [300, 400], [200, 600]], 'sawtooth', 0.1);
  },

  win() {
    playNotes([[523, 0], [659, 100], [784, 200], [1047, 300], [1318, 400], [1568, 500]], 'sine', 0.15);
  },

  click() {
    playTone(800, 0.05, 'sine', 0.06);
  },

  chat() {
    playNotes([[800, 0], [1000, 60]], 'sine', 0.06);
  },

  notification() {
    playNotes([[600, 0], [800, 100], [600, 200]], 'sine', 0.1);
  },
};
