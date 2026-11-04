// Motor de reglas de Scoundrel (Zach Gage & Kurt Bieg, 2011).
// Puro: no toca el DOM. El estado es JSON serializable para poder guardar/continuar.
// Cada acción muta el estado y devuelve una lista de eventos para que la UI los anime.

import { makeRng, shuffle, randomSeed } from './rng.js';

export const MAX_HP = 20;
export const ROOM_SIZE = 4;
export const SUITS = ['S', 'C', 'D', 'H'];

export function cardType(suit) {
  if (suit === 'S' || suit === 'C') return 'monster';
  if (suit === 'D') return 'weapon';
  return 'potion';
}

// 52 cartas sin jokers, quitando J, Q, K y A de corazones y diamantes → 44.
export function buildDeck() {
  const cards = [];
  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank++) {
      const red = suit === 'H' || suit === 'D';
      if (red && rank > 10) continue;
      cards.push({ id: suit + rank, suit, rank, value: rank, type: cardType(suit) });
    }
  }
  return cards;
}

export function createGame({ seed = randomSeed(), weaponRule = 'strict' } = {}) {
  const rng = makeRng(seed);
  const state = {
    seed,
    weaponRule, // 'strict' (<, regla original) | 'lte' (≤)
    dungeon: shuffle(buildDeck(), rng),
    room: [],
    discard: [],
    weapon: null,
    weaponStack: [], // monstruos derrotados con el arma actual
    hp: MAX_HP,
    avoidedLast: false,
    roomPlayed: 0,
    potionUsed: false,
    lastCard: null,
    turn: 0,
    over: false,
    won: false,
    score: null,
  };
  fillRoom(state);
  return state;
}

function fillRoom(state) {
  const events = [];
  while (state.room.length < ROOM_SIZE && state.dungeon.length > 0) {
    const card = state.dungeon.shift();
    state.room.push(card);
    events.push({ type: 'deal', card: card.id });
  }
  state.roomPlayed = 0;
  state.potionUsed = false;
  state.turn++;
  return events;
}

export function canAvoid(state) {
  return !state.over && !state.avoidedLast && state.roomPlayed === 0 && state.room.length === ROOM_SIZE;
}

// Valor máximo (inclusive) de monstruo contra el que se puede usar el arma, o Infinity.
export function weaponLimit(state) {
  if (!state.weapon) return -1;
  const last = state.weaponStack[state.weaponStack.length - 1];
  if (!last) return Infinity;
  return state.weaponRule === 'lte' ? last.value : last.value - 1;
}

export function canUseWeapon(state, monster) {
  return !!state.weapon && monster.type === 'monster' && monster.value <= weaponLimit(state);
}

export function previewDamage(state, monster, useWeapon) {
  if (useWeapon && canUseWeapon(state, monster)) return Math.max(0, monster.value - state.weapon.value);
  return monster.value;
}

export function avoid(state) {
  if (!canAvoid(state)) throw new Error('No puedes huir de esta sala');
  const events = state.room.map((c) => ({ type: 'toBottom', card: c.id }));
  state.dungeon.push(...state.room);
  state.room = [];
  state.avoidedLast = true;
  events.push(...fillRoom(state));
  return events;
}

export function play(state, cardId, { useWeapon = true } = {}) {
  if (state.over) throw new Error('La partida terminó');
  const idx = state.room.findIndex((c) => c.id === cardId);
  if (idx < 0) throw new Error('Esa carta no está en la sala');
  const card = state.room[idx];
  state.room.splice(idx, 1);
  const events = [];

  if (card.type === 'weapon') {
    if (state.weapon) {
      events.push({ type: 'discardWeapon', cards: [state.weapon.id, ...state.weaponStack.map((c) => c.id)] });
      state.discard.push(state.weapon, ...state.weaponStack);
    }
    state.weapon = card;
    state.weaponStack = [];
    events.push({ type: 'equip', card: card.id, value: card.value });
  } else if (card.type === 'potion') {
    if (state.potionUsed) {
      state.discard.push(card);
      events.push({ type: 'wastePotion', card: card.id });
    } else {
      const before = state.hp;
      state.hp = Math.min(MAX_HP, state.hp + card.value);
      state.potionUsed = true;
      state.discard.push(card);
      events.push({ type: 'heal', card: card.id, amount: state.hp - before, hp: state.hp });
    }
  } else {
    const armed = useWeapon && canUseWeapon(state, card);
    const dmg = previewDamage(state, card, armed);
    state.hp -= dmg;
    if (armed) {
      state.weaponStack.push(card);
      events.push({ type: 'slayWeapon', card: card.id, damage: dmg, hp: state.hp });
    } else {
      state.discard.push(card);
      events.push({ type: 'slayBare', card: card.id, damage: dmg, hp: state.hp });
    }
  }

  state.lastCard = card;
  state.roomPlayed++;

  if (state.hp <= 0) {
    finish(state, false);
    events.push({ type: 'lose', score: state.score });
    return events;
  }

  // Tras resolver 3 de 4, la que queda se lleva a la sala siguiente.
  if (state.room.length <= 1 && state.dungeon.length > 0) {
    state.avoidedLast = false;
    events.push(...fillRoom(state));
  } else if (state.room.length === 0 && state.dungeon.length === 0) {
    finish(state, true);
    events.push({ type: 'win', score: state.score });
  }
  return events;
}

function finish(state, won) {
  state.over = true;
  state.won = won;
  state.score = computeScore(state);
}

export function computeScore(state) {
  if (state.hp > 0 && state.room.length === 0 && state.dungeon.length === 0) {
    const bonus = state.hp === MAX_HP && state.lastCard && state.lastCard.type === 'potion' ? state.lastCard.value : 0;
    return state.hp + bonus;
  }
  const remaining = [...state.dungeon, ...state.room].filter((c) => c.type === 'monster').reduce((s, c) => s + c.value, 0);
  return Math.min(state.hp, 0) - remaining;
}
