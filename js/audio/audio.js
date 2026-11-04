// Audio 100% sintetizado con Web Audio: sin archivos ni licencias.
// iOS exige crear/reanudar el AudioContext dentro de un gesto del usuario → unlock().
// Cada mazo tiene su tema musical y un "timbre" para algunos efectos (ver THEMES).
import { settings, onSettingChange } from '../settings.js';

let ctx = null;
let sfxBus, musicBus, musicGain, delayIn, noiseBuf;
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
  sfxBus.connect(comp);
  // música → musicGain (fundidos al cambiar de tema) → musicBus (volumen del usuario)
  musicBus = ctx.createGain();
  musicBus.connect(comp);
  musicGain = ctx.createGain();
  musicGain.connect(musicBus);
  // eco para melodías y algunos efectos
  delayIn = ctx.createGain();
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.32;
  const fb = ctx.createGain();
  fb.gain.value = 0.32;
  const wet = ctx.createGain();
  wet.gain.value = 0.45;
  delayIn.connect(delay);
  delay.connect(fb);
  fb.connect(delay);
  delay.connect(wet);
  wet.connect(musicGain);
  applyVolumes();
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

function applyVolumes() {
  if (!ctx) return;
  sfxBus.gain.value = settings.sfx * 0.9;
  musicBus.gain.value = settings.music * 0.4;
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

// ---------- Primitivas ----------
function tone({ type = 'square', f = 440, f2 = null, t = 0, dur = 0.1, vol = 0.3, attack = 0.005, bus = sfxBus, filter = null, echo = false }) {
  if (!ctx) return;
  const at = ctx.currentTime + Math.max(0, t);
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
  if (echo) g.connect(delayIn);
  o.start(at);
  o.stop(at + dur + 0.05);
}

function noise({ t = 0, dur = 0.1, vol = 0.3, type = 'bandpass', f = 2000, f2 = null, q = 1, bus = sfxBus, attack = 0 }) {
  if (!ctx) return;
  const at = ctx.currentTime + Math.max(0, t);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const fl = ctx.createBiquadFilter();
  fl.type = type;
  fl.Q.value = q;
  fl.frequency.setValueAtTime(f, at);
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, at + dur);
  const g = ctx.createGain();
  if (attack) {
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + attack);
  } else {
    g.gain.setValueAtTime(vol, at);
  }
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(fl);
  fl.connect(g);
  g.connect(bus);
  src.start(at, Math.random() * 0.5);
  src.stop(at + dur + 0.05);
}

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const jitter = (f) => f * (0.96 + Math.random() * 0.08);

// ---------- Temas por mazo ----------
// Pasos de semicorchea; cada acorde dura `bar` pasos. En bass/lead los números son índices del acorde.
const THEMES = {
  classic: {
    bpm: 100, swing: 0.2, bar: 16,
    chords: [[62, 65, 69, 72], [55, 59, 62, 65], [60, 64, 67, 71], [57, 61, 64, 67]],
    bass: { wave: 'triangle', vol: 0.5, filter: 900, oct: -24, len: 3.5, steps: { 0: 0, 4: 2, 8: 1, 12: 3 } },
    stab: { wave: 'square', vol: 0.04, filter: 1800, len: 1.5, steps: [2, 10] },
    lead: { wave: 'triangle', vol: 0.09, oct: 12, len: 2, pattern: [, , , , , , 3, , 2, , , , 1] },
    drums: { snare: [4, 12], hat: [0, 4, 8, 12, 14], kick: [], soft: true },
    sfx: { wave: 'triangle', pitch: 1 },
  },
  dungeon: {
    bpm: 72, swing: 0, bar: 16,
    chords: [[57, 60, 64], [53, 57, 60], [50, 53, 57, 62], [52, 56, 59]],
    pad: { wave: 'sawtooth', vol: 0.05, filter: 650 },
    bass: { wave: 'sine', vol: 0.55, oct: -24, len: 7, steps: { 0: 0, 8: 0 } },
    lead: { wave: 'square', vol: 0.05, filter: 1100, oct: 12, len: 2.5, echo: true, pattern: [0, , , 2, , , 1, , , , 2] },
    drums: { kick: [0, 10], snare: [], hat: [] },
    sfx: { wave: 'square', pitch: 0.85 },
  },
  neon: {
    bpm: 112, swing: 0, bar: 16,
    chords: [[57, 60, 64, 69], [53, 57, 60, 65], [48, 52, 55, 60], [55, 59, 62, 67]],
    pad: { wave: 'sawtooth', vol: 0.03, filter: 1200 },
    bass: { wave: 'sawtooth', vol: 0.22, filter: 600, oct: -24, len: 1.6, steps: { 0: 0, 2: 0, 4: 0, 6: 0, 8: 0, 10: 0, 12: 0, 14: 0 } },
    lead: { wave: 'square', vol: 0.05, filter: 2400, oct: 12, len: 1, echo: true, pattern: [0, 1, 2, 3, 2, 1, 0, 1, 0, 1, 2, 3, 2, 3, 2, 1] },
    drums: { kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14] },
    sfx: { wave: 'sawtooth', pitch: 1.1 },
  },
  arcane: {
    bpm: 66, swing: 0, bar: 16,
    chords: [[62, 65, 69], [58, 62, 65], [55, 58, 62], [57, 61, 64]],
    pad: { wave: 'sine', vol: 0.08, filter: 2000 },
    bass: { wave: 'triangle', vol: 0.35, oct: -24, len: 14, steps: { 0: 0 } },
    lead: { wave: 'sine', vol: 0.13, oct: 12, len: 4, echo: true, pattern: [0, , 2, , 1, , , , 2, , 0] },
    drums: { kick: [], snare: [], hat: [] },
    sfx: { wave: 'sine', pitch: 1.2, echo: true },
  },
  ocean: {
    bpm: 80, swing: 0.1, bar: 16,
    chords: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]],
    pad: { wave: 'triangle', vol: 0.05, filter: 1400 },
    bass: { wave: 'sine', vol: 0.45, oct: -24, len: 4, steps: { 0: 0, 6: 0, 10: 2 } },
    lead: { wave: 'triangle', vol: 0.1, oct: 12, len: 3, echo: true, pattern: [0, , 1, , 2, , 3, , 2, , 1] },
    drums: { kick: [], snare: [], hat: [] },
    waves: true,
    sfx: { wave: 'sine', pitch: 1, bubbles: true },
  },
  lcd: {
    bpm: 132, swing: 0, bar: 16,
    chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]],
    bass: { wave: 'square', vol: 0.1, filter: 1500, oct: -24, len: 3, steps: { 0: 0, 4: 0, 8: 2, 12: 0 } },
    lead: { wave: 'square', vol: 0.05, filter: 4000, oct: 12, len: 0.9, pattern: [0, 1, 2, 1, 0, 1, 2, 1, 0, 2, 1, 2, 0, 2, 1, 2] },
    drums: { kick: [0, 8], snare: [4, 12], hat: [2, 6, 10, 14], chip: true },
    sfx: { wave: 'square', pitch: 1.25 },
  },
  clean: {
    bpm: 84, swing: 0.15, bar: 16,
    chords: [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]],
    pad: { wave: 'triangle', vol: 0.05, filter: 1500 },
    bass: { wave: 'sine', vol: 0.45, oct: -24, len: 5, steps: { 0: 0, 10: 0 } },
    lead: { wave: 'sine', vol: 0.1, oct: 12, len: 3, pattern: [, , 3, , , , 2, , , 1, , , 0] },
    drums: { kick: [0, 7, 10], snare: [4, 12], hat: [2, 6, 10, 14], soft: true },
    sfx: { wave: 'triangle', pitch: 1 },
  },
};

let theme = THEMES.classic;
const flavor = () => theme.sfx;

export function setTheme(id) {
  const next = THEMES[id] || THEMES.classic;
  if (next === theme) return;
  theme = next;
  if (!ctx || !musicOn) return;
  // fundido rápido y vuelta a empezar el compás con el nuevo tema
  const now = ctx.currentTime;
  musicGain.gain.cancelScheduledValues(now);
  musicGain.gain.setValueAtTime(musicGain.gain.value, now);
  musicGain.gain.linearRampToValueAtTime(0.0001, now + 0.25);
  musicGain.gain.linearRampToValueAtTime(1, now + 0.9);
  step = 0;
  nextTime = now + 0.3;
}

// ---------- Efectos ----------
export const sfx = {
  click() {
    const fl = flavor();
    tone({ type: fl.wave, f: jitter(700 * fl.pitch), f2: 1000 * fl.pitch, dur: 0.06, vol: 0.15 });
  },
  pickup() {
    const fl = flavor();
    tone({ type: 'triangle', f: jitter(900 * fl.pitch), f2: 1300 * fl.pitch, dur: 0.05, vol: 0.08 });
    noise({ dur: 0.04, vol: 0.08, f: 5000, q: 1.5 });
  },
  choiceOpen() {
    const fl = flavor();
    tone({ type: fl.wave, f: 600 * fl.pitch, dur: 0.06, vol: 0.1, filter: 3000 });
    tone({ type: fl.wave, f: 900 * fl.pitch, t: 0.05, dur: 0.08, vol: 0.1, filter: 3000 });
  },
  cancel() {
    const fl = flavor();
    tone({ type: fl.wave, f: 700 * fl.pitch, f2: 400 * fl.pitch, dur: 0.1, vol: 0.08, filter: 2500 });
  },
  whoosh() {
    noise({ dur: 0.25, vol: 0.12, f: 600, f2: 2400, q: 1.2, attack: 0.05 });
  },
  toggle(on) {
    tone({ type: 'square', f: on ? 660 : 520, f2: on ? 990 : 330, dur: 0.07, vol: 0.09, filter: 2500 });
  },
  shuffle() {
    for (let i = 0; i < 14; i++) noise({ t: i * 0.025, dur: 0.03, vol: 0.14, f: 2500 + Math.random() * 2500, q: 2 });
    noise({ t: 0.36, dur: 0.12, vol: 0.2, f: 1200, q: 0.8 });
  },
  deal(i = 0) {
    const fl = flavor();
    noise({ t: i * 0.06, dur: 0.07, vol: 0.25, f: 3000, f2: 1200, q: 0.8 });
    tone({ type: 'triangle', t: i * 0.06, f: jitter((500 + i * 60) * fl.pitch), dur: 0.05, vol: 0.06 });
    if (fl.bubbles) tone({ type: 'sine', t: i * 0.06 + 0.03, f: jitter(500), f2: 1400, dur: 0.08, vol: 0.06 });
  },
  equip() {
    const fl = flavor();
    noise({ dur: 0.25, vol: 0.18, type: 'highpass', f: 4000 });
    tone({ f: 880 * fl.pitch, dur: 0.18, vol: 0.12 });
    tone({ f: 1320 * fl.pitch, t: 0.05, dur: 0.25, vol: 0.1, echo: fl.echo });
    tone({ type: 'triangle', f: 1760 * fl.pitch, t: 0.08, dur: 0.35, vol: 0.08 });
  },
  slash(dmg = 0) {
    noise({ dur: 0.18, vol: 0.35, f: 5000, f2: 600, q: 0.7 });
    tone({ type: 'sawtooth', f: 400, f2: 90, dur: 0.15, vol: 0.12, filter: 2000 });
    if (dmg > 0) sfx.hurt(dmg, 0.08);
    else tone({ f: 1320, t: 0.08, dur: 0.12, vol: 0.08 });
    sfx.death(0.12);
  },
  punch(dmg) {
    tone({ type: 'sine', f: 160, f2: 40, dur: 0.22, vol: 0.5 });
    noise({ dur: 0.12, vol: 0.4, type: 'lowpass', f: 900 });
    sfx.hurt(dmg, 0.06);
    sfx.death(0.14);
  },
  // "puf" del monstruo al desaparecer
  death(t = 0) {
    noise({ t, dur: 0.3, vol: 0.12, f: 1800, f2: 200, q: 0.6 });
    tone({ type: 'square', t, f: 300, f2: 60, dur: 0.25, vol: 0.05, filter: 900 });
  },
  hurt(dmg, t = 0) {
    const v = Math.min(0.25, 0.08 + dmg * 0.015);
    tone({ type: 'square', f: 300, f2: 70, t, dur: 0.25 + dmg * 0.01, vol: v, filter: 1500 });
  },
  heal() {
    const fl = flavor();
    [523, 659, 784, 1047].forEach((f, i) => tone({ type: fl.wave === 'sawtooth' ? 'triangle' : fl.wave, f: f * fl.pitch, t: i * 0.07, dur: 0.25, vol: 0.14, echo: fl.echo }));
    tone({ type: 'sine', f: 2093 * fl.pitch, t: 0.28, dur: 0.4, vol: 0.06 });
    if (fl.bubbles) for (let i = 0; i < 5; i++) tone({ type: 'sine', t: 0.1 + i * 0.07, f: jitter(600), f2: 1600, dur: 0.07, vol: 0.05 });
  },
  waste() {
    [500, 400, 300].forEach((f, i) => tone({ type: 'triangle', f, t: i * 0.08, dur: 0.12, vol: 0.12 }));
  },
  // el arma ya no puede matar a nadie
  weaponBreak() {
    tone({ type: 'square', f: 1200, f2: 300, dur: 0.35, vol: 0.1, filter: 3000 });
    noise({ dur: 0.3, vol: 0.2, type: 'highpass', f: 3000 });
    tone({ type: 'triangle', t: 0.12, f: 220, f2: 110, dur: 0.4, vol: 0.12 });
  },
  roomClear() {
    const fl = flavor();
    const c = theme.chords[0];
    c.slice(0, 3).forEach((n, i) => tone({ type: fl.wave === 'sawtooth' ? 'square' : fl.wave, f: midi(n + 12), t: 0.05 + i * 0.06, dur: 0.22, vol: 0.08, filter: 3500, echo: fl.echo }));
  },
  heartbeat() {
    tone({ type: 'sine', f: 70, f2: 45, dur: 0.14, vol: 0.45 });
    tone({ type: 'sine', t: 0.2, f: 65, f2: 42, dur: 0.12, vol: 0.32 });
  },
  lowHp() {
    [440, 330, 440, 330].forEach((f, i) => tone({ type: 'square', f, t: i * 0.1, dur: 0.08, vol: 0.06, filter: 1800 }));
  },
  flee() {
    noise({ dur: 0.45, vol: 0.3, f: 300, f2: 3000, q: 2 });
    [0, 1, 2, 3].forEach((i) => sfx.deal(i + 4));
  },
  denied() {
    tone({ type: 'square', f: 150, dur: 0.12, vol: 0.12 });
    tone({ type: 'square', f: 140, t: 0.13, dur: 0.15, vol: 0.12 });
  },
  tick(i) { tone({ type: flavor().wave, f: (400 + i * 25) * flavor().pitch, dur: 0.04, vol: 0.07, filter: 4000 }); },
  // motivo corto del tema (al elegir mazo)
  motif() {
    const fl = flavor();
    const [a, b] = theme.chords;
    [a[0], a[1], a[2], b[2] + 12].forEach((n, i) => tone({ type: fl.wave, f: midi(n + 12), t: i * 0.09, dur: 0.25, vol: 0.09, filter: 3500, echo: fl.echo }));
  },
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

// Latido con poca vida.
let heartTimer = null;
export function setHeartbeat(on) {
  if (on && !heartTimer) {
    sfx.lowHp();
    heartTimer = setInterval(() => { if (!document.hidden) sfx.heartbeat(); }, 1100);
  } else if (!on && heartTimer) {
    clearInterval(heartTimer);
    heartTimer = null;
  }
}

// ---------- Secuenciador ----------
let step = 0;
let nextTime = 0;

function drum(kind, at, th) {
  const t = at - ctx.currentTime;
  const soft = th.drums.soft ? 0.6 : 1;
  if (kind === 'kick') {
    tone({ type: 'sine', t, f: 130, f2: 42, dur: 0.18, vol: 0.55 * soft, bus: musicGain });
  } else if (kind === 'snare') {
    if (th.drums.chip) noise({ t, dur: 0.08, vol: 0.12, type: 'highpass', f: 2500, bus: musicGain });
    else noise({ t, dur: 0.14, vol: 0.13 * soft, f: 1800, q: 0.7, bus: musicGain });
  } else {
    noise({ t, dur: 0.04, vol: 0.06 * soft, type: 'highpass', f: 7500, bus: musicGain });
  }
}

function scheduleStep(s, at) {
  const th = theme;
  const t = at - ctx.currentTime;
  const stepDur = 60 / th.bpm / 4;
  const inBar = s % th.bar;
  const chord = th.chords[Math.floor(s / th.bar) % th.chords.length];

  if (th.pad && inBar === 0) {
    chord.forEach((n) => tone({ type: th.pad.wave, f: midi(n), t, dur: stepDur * th.bar, vol: th.pad.vol, attack: 0.4, filter: th.pad.filter, bus: musicGain }));
  }
  const b = th.bass;
  if (b && b.steps[inBar] !== undefined) {
    const n = chord[b.steps[inBar] % chord.length] + b.oct;
    tone({ type: b.wave, f: midi(n), t, dur: stepDur * b.len, vol: b.vol, filter: b.filter, bus: musicGain });
  }
  const st = th.stab;
  if (st && st.steps.includes(inBar)) {
    chord.forEach((n) => tone({ type: st.wave, f: midi(n), t, dur: stepDur * st.len, vol: st.vol, filter: st.filter, bus: musicGain }));
  }
  const l = th.lead;
  if (l) {
    const idx = l.pattern[inBar];
    if (idx !== undefined && idx !== null) {
      const n = chord[idx % chord.length] + l.oct + (idx >= chord.length ? 12 : 0);
      tone({ type: l.wave, f: midi(n), t, dur: stepDur * l.len, vol: l.vol, filter: l.filter, bus: musicGain, echo: l.echo });
    }
  }
  const dr = th.drums;
  if (dr) {
    if (dr.kick.includes(inBar)) drum('kick', at, th);
    if (dr.snare.includes(inBar)) drum('snare', at, th);
    if (dr.hat.includes(inBar)) drum('hat', at, th);
  }
  if (th.waves && inBar === 0 && (Math.floor(s / th.bar) % 2 === 0)) {
    noise({ t, dur: stepDur * th.bar * 1.6, vol: 0.05, type: 'lowpass', f: 500, f2: 1400, q: 0.5, attack: stepDur * 6, bus: musicGain });
  }
}

function scheduler() {
  while (nextTime < ctx.currentTime + 0.15) {
    const stepDur = 60 / theme.bpm / 4;
    const swing = step % 2 ? theme.swing * stepDur : 0;
    scheduleStep(step, nextTime + swing);
    nextTime += stepDur;
    step++;
  }
}

export function startMusic() {
  init();
  if (!ctx || musicOn) return;
  musicOn = true;
  musicGain.gain.value = 1;
  step = 0;
  nextTime = ctx.currentTime + 0.1;
  musicTimer = setInterval(scheduler, 30);
}

export function stopMusic() {
  musicOn = false;
  clearInterval(musicTimer);
}
