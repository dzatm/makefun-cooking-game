// Tiny WebAudio bleeps, synthesized on the spot — no sound files, no network.
// The context is created on the first user gesture; everything is guarded so a
// browser without audio still plays the game silently.

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(frequency, duration, type = 'sine', volume = 0.12, when = 0) {
    const audio = ensure();
    if (!audio || muted) return;
    try {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, audio.currentTime + when);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + when + duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(audio.currentTime + when);
      oscillator.stop(audio.currentTime + when + duration);
    } catch {
      // Audio is decoration: never let it break the game.
    }
  }

  return {
    /** Call from any user gesture so the browser unlocks sound. */
    unlock() {
      const audio = ensure();
      if (audio && audio.state === 'suspended') audio.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    pickup() {
      tone(520, 0.09, 'triangle', 0.1);
    },
    place() {
      tone(340, 0.08, 'triangle', 0.1);
    },
    chop() {
      tone(180, 0.06, 'square', 0.07);
      tone(140, 0.06, 'square', 0.06, 0.03);
    },
    cooked() {
      tone(660, 0.1, 'sine', 0.1);
      tone(880, 0.12, 'sine', 0.1, 0.09);
    },
    burnt() {
      tone(220, 0.25, 'sawtooth', 0.08);
    },
    served() {
      tone(523, 0.1, 'triangle', 0.12);
      tone(659, 0.1, 'triangle', 0.12, 0.09);
      tone(784, 0.18, 'triangle', 0.12, 0.18);
    },
    missed() {
      tone(392, 0.15, 'sawtooth', 0.07);
      tone(311, 0.22, 'sawtooth', 0.07, 0.12);
    },
    denied() {
      tone(160, 0.08, 'square', 0.06);
    },
    over(win) {
      if (win) {
        [523, 659, 784, 1047].forEach((freq, index) => tone(freq, 0.16, 'triangle', 0.12, index * 0.12));
      } else {
        [392, 330, 262].forEach((freq, index) => tone(freq, 0.2, 'triangle', 0.1, index * 0.14));
      }
    },
  };
}
