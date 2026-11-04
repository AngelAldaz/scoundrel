// Audio 100% sintetizado con Web Audio: sin archivos ni licencias.
// iOS exige crear/reanudar el AudioContext dentro de un gesto del usuario → unlock().
import { settings, onSettingChange } from '../settings.js';

let ctx = null;
let sfxBus, musicBus, noiseBuf;
let musicOn = false;
let musicTimer = null;

function init() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.connect(ctx.destination);
  sfxBus = ctx.createGain();
  musicBus = ctx.createGain();
  sfxBus.connect(comp);
  musicBus.connect(comp);
  applyVolumes();
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

function applyVolumes() {
  if (!ctx) return;
  sfxBus.gain.value = settings.sfx * 0.9;
  musicBus.gain.value = settings.music * 0.35;
}

onSettingChange((k) => {
  if (k === 'sfx' || k === 'music') applyVolumes();
});

export function unlock() {
  init();
  if (ctx && ctx.state !== 'running') ctx.resume();
}

document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend();
  else ctx.resume();
});

function tone({ type = 'square', f = 440, f2 = null, t = 0, dur = 0.1, vol = 0.3, attack = 0.005, bus = sfxBus, filter = null }) {
  if (!ctx) return;
  const at = ctx.currentTime + t;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, at);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  let node = o;
  if (filter) {
    const fl = ctx.createBiquadFilter();
    fl.type = 'lowpass';
    fl.frequency.value = filter;
    o.connect(fl);
    node = fl;
  }
  node.connect(g);
  g.connect(bus);
  o.start(at);
  o.stop(at + dur + 0.05);
}

function noise({ t = 0, dur = 0.1, vol = 0.3, type = 'bandpass', f = 2000, f2 = null, q = 1 }) {
  if (!ctx) return;
  const at = ctx.currentTime + t;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const fl = ctx.createBiquadFilter();
  fl.type = type;
  fl.Q.value = q;
  fl.frequency.setValueAtTime(f, at);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, at + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(fl);
  fl.connect(g);
  g.connect(sfxBus);
  src.start(at, Math.random() * 0.5);
  src.stop(at + dur + 0.05);
}

const jitter = (f) => f * (0.96 + Math.random() * 0.08);

export const sfx = {
  click() { tone({ f: jitter(700), f2: 1000, dur: 0.06, vol: 0.15 }); },
  hover() { tone({ type: 'triangle', f: jitter(1200), dur: 0.03, vol: 0.06 }); },
  deal(i = 0) {
    noise({ t: i * 0.06, dur: 0.07, vol: 0.25, f: 3000, f2: 1200, q: 0.8 });
    tone({ type: 'triangle', t: i * 0.06, f: jitter(500 + i * 60), dur: 0.05, vol: 0.06 });
  },
  equip() {
    noise({ dur: 0.25, vol: 0.18, type: 'highpass', f: 4000 });
    tone({ f: 880, dur: 0.18, vol: 0.12 });
    tone({ f: 1320, t: 0.05, dur: 0.25, vol: 0.1 });
    tone({ type: 'triangle', f: 1760, t: 0.08, dur: 0.35, vol: 0.08 });
  },
  slash(dmg = 0) {
    noise({ dur: 0.18, vol: 0.35, f: 5000, f2: 600, q: 0.7 });
    tone({ type: 'sawtooth', f: 400, f2: 90, dur: 0.15, vol: 0.12, filter: 2000 });
    if (dmg > 0) sfx.hurt(dmg, 0.08);
    else tone({ f: 1320, t: 0.08, dur: 0.12, vol: 0.08 });
  },
  punch(dmg) {
    tone({ type: 'sine', f: 160, f2: 40, dur: 0.22, vol: 0.5 });
    noise({ dur: 0.12, vol: 0.4, type: 'lowpass', f: 900 });
    sfx.hurt(dmg, 0.06);
  },
  hurt(dmg, t = 0) {
    const v = Math.min(0.25, 0.08 + dmg * 0.015);
    tone({ type: 'square', f: 300, f2: 70, t, dur: 0.25 + dmg * 0.01, vol: v, filter: 1500 });
  },
  heal() {
    [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f, t: i * 0.07, dur: 0.25, vol: 0.16 }));
    tone({ type: 'sine', f: 2093, t: 0.28, dur: 0.4, vol: 0.06 });
  },
  waste() {
    [500, 400, 300].forEach((f, i) => tone({ type: 'triangle', f, t: i * 0.08, dur: 0.12, vol: 0.12 }));
  },
  flee() {
    noise({ dur: 0.45, vol: 0.3, f: 300, f2: 3000, q: 2 });
    [0, 1, 2, 3].forEach((i) => sfx.deal(i + 4));
  },
  denied() {
    tone({ type: 'square', f: 150, dur: 0.12, vol: 0.12 });
    tone({ type: 'square', f: 140, t: 0.13, dur: 0.15, vol: 0.12 });
  },
  tick(i) { tone({ type: 'square', f: 400 + i * 25, dur: 0.04, vol: 0.07 }); },
  win() {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone({ type: 'square', f, t: i * 0.11, dur: 0.22, vol: 0.12, filter: 3000 }));
    tone({ type: 'triangle', f: 262, t: 0, dur: 1.2, vol: 0.15 });
  },
  lose() {
    [392, 370, 349, 262].forEach((f, i) => tone({ type: 'sawtooth', f, t: i * 0.22, dur: 0.4, vol: 0.1, filter: 1200 }));
    tone({ type: 'sine', f: 110, f2: 40, t: 0.7, dur: 1.2, vol: 0.3 });
  },
  record() {
    [784, 988, 1175, 1568].forEach((f, i) => tone({ type: 'triangle', f, t: i * 0.06, dur: 0.3, vol: 0.12 }));
  },
};

// ---- Música: progresión Am–F–C–G con bajo y arpegio suaves ----
const BPM = 92;
const STEP = 60 / BPM / 4; // semicorcheas
const CHORDS = [
  [57, 60, 64], // Am
  [53, 57, 60], // F
  [48, 52, 55], // C
  [55, 59, 62], // G
];
const ARP = [0, 1, 2, 1, 0, 2, 1, 2];
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
let step = 0;
let nextTime = 0;

function scheduleStep(s, at) {
  const t = at - ctx.currentTime;
  const chord = CHORDS[Math.floor(s / 32) % CHORDS.length];
  const inBar = s % 32;
  if (inBar % 8 === 0) tone({ type: 'triangle', f: midi(chord[0] - 24), t, dur: STEP * 7, vol: 0.5, bus: musicBus });
  if (inBar % 2 === 0) {
    const n = chord[ARP[(inBar / 2) % ARP.length]] + (inBar >= 16 ? 12 : 0);
    tone({ type: 'square', f: midi(n), t, dur: STEP * 1.6, vol: 0.12, bus: musicBus, filter: 1400 });
  }
  if (inBar % 8 === 4) {
    // "hi-hat" muy suave
    if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const fl = ctx.createBiquadFilter();
    fl.type = 'highpass';
    fl.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.08, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    src.connect(fl); fl.connect(g); g.connect(musicBus);
    src.start(at); src.stop(at + 0.06);
  }
}

function scheduler() {
  while (nextTime < ctx.currentTime + 0.15) {
    scheduleStep(step, nextTime);
    nextTime += STEP;
    step++;
  }
}

export function startMusic() {
  init();
  if (!ctx || musicOn) return;
  musicOn = true;
  nextTime = ctx.currentTime + 0.1;
  musicTimer = setInterval(scheduler, 30);
}

export function stopMusic() {
  musicOn = false;
  clearInterval(musicTimer);
}
