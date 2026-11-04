import { load, save, remove } from './storage.js';

const EMPTY = { games: 0, wins: 0, best: null, streak: 0, bestStreak: 0, history: [] };

export function getStats() {
  return { ...EMPTY, ...load('stats', {}) };
}

// Registra una partida terminada. Devuelve { stats, newBest }.
export function recordGame({ score, won, deck }) {
  const s = getStats();
  s.games++;
  if (won) {
    s.wins++;
    s.streak++;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
  } else {
    s.streak = 0;
  }
  const newBest = s.best == null || score > s.best;
  if (newBest) s.best = score;
  s.history = [{ score, won, deck, at: Date.now() }, ...s.history].slice(0, 20);
  save('stats', s);
  return { stats: s, newBest };
}

export function resetStats() {
  remove('stats');
}
