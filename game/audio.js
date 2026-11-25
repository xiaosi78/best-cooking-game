// audio.js — tiny WebAudio bleeps, synthesised at run time, no sound files.
// Every effect is a short oscillator blip; the kitchen stays silent until the
// player first presses a key or clicks (browsers require a user gesture).

let ctx = null;
let muted = false;

export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function blip(freq, dur, type, vol) {
  if (!ctx || muted) return;
  try {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  } catch {
    // Audio is garnish; a failure must never break the game.
  }
}

export const sfx = {
  pickup() { blip(520, 0.08, 'sine', 0.12); },
  chop() { blip(180, 0.06, 'square', 0.08); },
  sizzle() { blip(900, 0.12, 'sawtooth', 0.05); },
  done() { blip(660, 0.12, 'sine', 0.12); setTimeout(() => blip(880, 0.16, 'sine', 0.12), 90); },
  serve() { blip(523, 0.1, 'sine', 0.12); setTimeout(() => blip(659, 0.1, 'sine', 0.12), 80); setTimeout(() => blip(784, 0.18, 'sine', 0.12), 160); },
  fail() { blip(220, 0.25, 'sawtooth', 0.1); },
  tick() { blip(1100, 0.05, 'sine', 0.06); },
};
