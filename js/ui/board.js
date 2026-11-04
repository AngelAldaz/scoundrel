// Mesa de juego: crea un elemento por carta y lo coloca según la zona en la que está.
// Las animaciones salen solas: cada render cambia el transform y CSS hace la transición.
import { settings } from '../settings.js';

const BOTTOM_SCALE = 0.8;

// Hash estable para dar a cada carta un "desorden" propio en el descarte.
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);

export function createBoard(table, { onTap }) {
  const els = new Map(); // id → elemento
  let slots = [null, null, null, null]; // id de carta por hueco de la sala
  let geo = null;
  let deck = null;
  let lastState = null;

  const slotEls = {
    dungeon: table.querySelector('.slot-dungeon'),
    weapon: table.querySelector('.slot-weapon'),
    discard: table.querySelector('.slot-discard'),
  };
  const roomLabel = table.querySelector('.room-label');

  function computeGeo() {
    const W = table.clientWidth;
    const H = table.clientHeight;
    const g = Math.max(8, Math.min(16, W * 0.02));
    const label = 14;
    const cw1 = (W - 7 * g) / 5;
    const ch2 = (H - 2 * g - label) / (1 + BOTTOM_SCALE);
    const cw = Math.floor(Math.min(cw1, ch2 / 1.4));
    const ch = Math.round(cw * 1.4);
    const roomW = 4 * cw + 3 * g;
    // Centrar la sala en el espacio que queda a la izquierda de la mazmorra.
    const dungeonX = W - cw;
    const roomX = Math.max(0, (dungeonX - 2 * g - roomW) / 2);
    const roomY = label;
    const bw = cw * BOTTOM_SCALE;
    const bh = ch * BOTTOM_SCALE;
    const bottomY = H - bh;
    return {
      W, H, g, cw, ch, bw, bh,
      room: [0, 1, 2, 3].map((i) => ({ x: roomX + i * (cw + g), y: roomY })),
      dungeon: { x: dungeonX, y: roomY },
      weapon: { x: roomX, y: bottomY },
      discard: { x: W - bw, y: bottomY },
      roomLabel: { x: roomX, y: 0 },
    };
  }

  function placeSlots() {
    const p = (el, x, y, w, h) => Object.assign(el.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
    p(slotEls.dungeon, geo.dungeon.x, geo.dungeon.y, geo.cw, geo.ch);
    p(slotEls.weapon, geo.weapon.x, geo.weapon.y, geo.bw, geo.bh);
    p(slotEls.discard, geo.discard.x, geo.discard.y, geo.bw, geo.bh);
    roomLabel.style.left = `${geo.roomLabel.x}px`;
    roomLabel.style.top = `${geo.roomLabel.y}px`;
    table.style.setProperty('--cw', `${geo.cw}px`);
    table.style.setProperty('--ch', `${geo.ch}px`);
  }

  function makeCard(card) {
    const el = document.createElement('div');
    el.className = 'card down buried';
    el.dataset.id = card.id;
    el.innerHTML = `<div class="card-tilt"><div class="card-flip"><div class="face front"></div><div class="face back"></div></div></div>`;
    el.style.setProperty('--sway', `${-(Math.abs(hash(card.id)) % 3200) / 1000}s`);
    bindPress(el);
    table.appendChild(el);
    els.set(card.id, el);
    return el;
  }

  function paint(el, card) {
    el.querySelector('.front').innerHTML = deck.face(card);
    el.querySelector('.back').innerHTML = deck.back();
  }

  // Inclinación 3D al tocar + tap.
  function bindPress(el) {
    const tilt = () => el.querySelector('.card-tilt');
    let start = null;
    el.addEventListener('pointerdown', (e) => {
      if (!el.classList.contains('live')) return;
      start = { x: e.clientX, y: e.clientY };
      el.classList.add('pressed');
      const r = el.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      tilt().style.transform = `perspective(500px) rotateY(${nx * 22}deg) rotateX(${-ny * 22}deg) scale(1.06)`;
    });
    const end = (e, fire) => {
      if (!start) return;
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      start = null;
      el.classList.remove('pressed');
      tilt().style.transform = '';
      if (fire && moved < 30) onTap(el.dataset.id);
    };
    el.addEventListener('pointerup', (e) => end(e, true));
    el.addEventListener('pointercancel', (e) => end(e, false));
    el.addEventListener('pointerleave', (e) => end(e, false));
  }

  function setPos(el, { x, y, s = 1, r = 0, z = 1, down = false, buried = false, live = false, delay = 0 }) {
    el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${r}deg) scale(${s})`;
    el.style.transformOrigin = '0 0';
    el.style.zIndex = z;
    el.style.setProperty('--delay', `${delay}s`);
    el.style.transitionDelay = `${delay}s, calc(var(--dur) + ${delay}s)`;
    el.querySelector('.card-flip').style.transitionDelay = `${delay + 0.05 * settings.speed}s`;
    el.classList.toggle('down', down);
    el.classList.toggle('buried', buried);
    el.classList.toggle('live', live);
  }

  function syncSlots(room) {
    const ids = new Set(room.map((c) => c.id));
    slots = slots.map((id) => (id && ids.has(id) ? id : null));
    for (const c of room) {
      if (slots.includes(c.id)) continue;
      const free = slots.indexOf(null);
      if (free >= 0) slots[free] = c.id;
    }
  }

  // dealt: ids de cartas recién repartidas (se animan con retraso escalonado).
  function render(state, { dealt = [], dealDelay = 0 } = {}) {
    lastState = state;
    if (!geo) { geo = computeGeo(); placeSlots(); }
    syncSlots(state.room);
    const speed = settings.speed;

    state.dungeon.forEach((c, d) => {
      const el = els.get(c.id) || makeCard(c);
      const off = Math.min(d, 4);
      setPos(el, { x: geo.dungeon.x + off * 1.5, y: geo.dungeon.y + off * 2, z: 60 - Math.min(d, 50), down: true, buried: d > 4 });
    });

    state.room.forEach((c) => {
      const el = els.get(c.id) || makeCard(c);
      const i = slots.indexOf(c.id);
      const k = dealt.indexOf(c.id);
      const delay = k >= 0 ? dealDelay + k * 0.09 * speed : 0;
      setPos(el, { ...geo.room[i], z: 100 + i, live: !state.over, delay });
    });

    if (state.weapon) {
      const el = els.get(state.weapon.id) || makeCard(state.weapon);
      setPos(el, { ...geo.weapon, s: BOTTOM_SCALE, z: 70 });
      const n = state.weaponStack.length;
      const avail = geo.discard.x - geo.weapon.x - geo.bw - geo.g;
      const step = n ? Math.min(geo.bw * 0.42, avail / n) : 0;
      state.weaponStack.forEach((c, i) => {
        const m = els.get(c.id) || makeCard(c);
        setPos(m, { x: geo.weapon.x + (i + 1) * step, y: geo.weapon.y + 4, s: BOTTOM_SCALE, z: 71 + i, r: 0 });
      });
    }

    const nd = state.discard.length;
    state.discard.forEach((c, i) => {
      const el = els.get(c.id) || makeCard(c);
      const h = hash(c.id);
      setPos(el, {
        x: geo.discard.x + ((h % 7) - 3),
        y: geo.discard.y + (((h >> 3) % 5) - 2),
        r: ((h >> 5) % 13) - 6,
        s: BOTTOM_SCALE,
        z: 300 + i,
        buried: i < nd - 3,
      });
    });
  }

  function reset(state, newDeck) {
    deck = newDeck;
    for (const el of els.values()) el.remove();
    els.clear();
    slots = [null, null, null, null];
    geo = null;
    geo = computeGeo();
    placeSlots();
    // Todas las cartas empiezan apiladas en la mazmorra, sin transición; el primer render las reparte.
    const all = [...state.dungeon, ...state.room, ...state.discard, ...state.weaponStack, ...(state.weapon ? [state.weapon] : [])];
    all.forEach((c, i) => {
      const el = makeCard(c);
      paint(el, c);
      el.style.transition = 'none';
      setPos(el, { ...geo.dungeon, z: 60 - Math.min(i, 50), down: true });
    });
    void table.offsetWidth;
    for (const el of els.values()) el.style.transition = '';
  }

  function setDeck(newDeck) {
    deck = newDeck;
    if (!lastState) return;
    const s = lastState;
    const all = [...s.dungeon, ...s.room, ...s.discard, ...s.weaponStack, ...(s.weapon ? [s.weapon] : [])];
    for (const c of all) paint(els.get(c.id), c);
  }

  function relayout() {
    if (!lastState || !table.clientWidth) return;
    geo = computeGeo();
    placeSlots();
    render(lastState);
  }

  function cardEl(id) { return els.get(id); }

  // Menú contextual sobre una carta. options: [{ label, sub, cls, disabled, onPick }]
  function showChoice(id, options) {
    hideChoice();
    const el = els.get(id);
    const i = slots.indexOf(id);
    if (!el || i < 0) return;
    el.classList.add('selected');
    const back = document.createElement('div');
    back.className = 'choice-backdrop';
    back.addEventListener('pointerdown', (e) => { e.preventDefault(); hideChoice(); });
    const box = document.createElement('div');
    box.className = 'choice';
    box.style.left = `${geo.room[i].x + geo.cw / 2}px`;
    box.style.top = `${geo.room[i].y + geo.ch / 2}px`;
    for (const o of options) {
      const b = document.createElement('button');
      b.className = `btn ${o.cls}`;
      b.disabled = !!o.disabled;
      b.innerHTML = `${o.label}${o.sub ? `<small>${o.sub}</small>` : ''}`;
      b.addEventListener('click', () => { hideChoice(); o.onPick(); });
      box.appendChild(b);
    }
    table.append(back, box);
  }

  function hideChoice() {
    table.querySelectorAll('.choice, .choice-backdrop').forEach((n) => n.remove());
    table.querySelectorAll('.card.selected').forEach((n) => n.classList.remove('selected'));
  }

  return { render, reset, setDeck, relayout, cardEl, showChoice, hideChoice, get geo() { return geo; }, slotEls };
}

// Carta estática (menú, vista previa de mazos).
export function staticCard(deck, card, { faceDown = false } = {}) {
  const el = document.createElement('div');
  el.className = 'mini-card';
  el.innerHTML = faceDown ? deck.back() : deck.face(card);
  return el;
}
