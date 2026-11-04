// Mazo Océano: criaturas del fondo marino, tridentes y elixires.
import { svg, frame, spriteAt, text, suitGlyph, rankLabel } from '../pixel.js';
import { POTION } from '../dungeon/deck.js';

const FISH = [
  '....kkkk....',
  '..kkaaaak.kk',
  '.kaaabaaakak',
  'kawkaabaaaak',
  'kaaaaabaaaak',
  '.kaaaaaaakak',
  '..kkaaaak.kk',
  '....kkkk....',
];
const CRAB = [
  'kk........kk',
  'kak......kak',
  '.kk.k..k.kk.',
  '..k.w..w.k..',
  '..kkkkkkkk..',
  '.kaaaaaaaak.',
  'kaabaaaaaaak',
  '.kaaaaaaaak.',
  'k.k.k..k.k.k',
];
const JELLY = [
  '....kkkk....',
  '..kkaaaakk..',
  '.kaabbaaaak.',
  'kaabaaaaaaak',
  'kaaaaaaaaaak',
  'kkkkkkkkkkkk',
  '.a..a..a..a.',
  '.a..a..a..a.',
  '..a..a..a..a',
  '.a..a..a..a.',
  '..a..a..a...',
  '.....a......',
];
const OCTOPUS = [
  '...kkkkkk...',
  '..kaaaaaak..',
  '.kaabaaaaak.',
  '.kawkaawkak.',
  '.kaaaaaaaak.',
  '.kaaakkaaak.',
  '..kaaaaaak..',
  '.kakakakakak',
  'kak.kak.kak.',
  'ka..ka..ka..',
  'k...k...k...',
];
const SHARK = [
  '.....k........',
  '....kak.......',
  '...kaak.....kk',
  '.kkaaaakkkkkak',
  'kaawkaaaaaaaak',
  'kbbbbbaaaaaaak',
  '.kwkwkbbbbbkak',
  '..kkkkkkkkk.kk',
];
const TRIDENT = [
  'w...w...w',
  'w...w...w',
  'ww..w..ww',
  '.wwwwwww.',
  '....g....',
  '....h....',
  '....h....',
  '....h....',
  '....h....',
  '....h....',
  '....h....',
  '....g....',
  '....h....',
  '....h....',
];

const K = '#08141f';
function monsterArt(card) {
  const v = card.value;
  const spade = card.suit === 'S';
  if (v <= 4) return [FISH, { k: K, a: spade ? '#ffb347' : '#ff7f50', b: '#ffe0a3', w: '#fff' }, 'Pez globo'];
  if (v <= 6) return [CRAB, { k: K, a: spade ? '#e8413c' : '#ff6a3d', b: '#ffb199', w: '#fff' }, 'Cangrejo'];
  if (v <= 8) return [JELLY, { k: K, a: spade ? '#c38cff' : '#ff8fd8', b: '#ffffff' }, 'Medusa'];
  if (v <= 10) return [OCTOPUS, { k: K, a: spade ? '#d65db1' : '#9b5de5', b: '#f7c6ff', w: '#fff' }, 'Pulpo'];
  if (v <= 12) return [SHARK, { k: K, a: '#6c8ea4', b: '#dfe9ef', w: '#fff' }, v === 11 ? 'Tiburón' : 'Gran blanco'];
  return [OCTOPUS, { k: K, a: spade ? '#b3122e' : '#7a0f6b', b: '#ff6b81', w: '#ffd23f' }, v === 13 ? 'Kraken' : 'Leviatán'];
}

const BG = { monster: '#0e2a3d', weapon: '#123a3a', potion: '#14324a' };
const INK = { monster: '#ff8a65', weapon: '#7fe0d0', potion: '#9ad7ff' };

function face(card) {
  let b = frame({ fill: BG[card.type], border: K, inner: '#ffffff1a' });
  // burbujas de fondo
  for (const [x, y, r] of [[18, 96, 2], [24, 86, 1.5], [80, 40, 2.5], [86, 52, 1.5], [76, 92, 1.5]]) {
    b += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#9ad7ff55" stroke-width="1"/>`;
  }
  let name;
  if (card.type === 'monster') {
    const [rows, colors, n] = monsterArt(card);
    name = n;
    const px = rows[0].length > 12 ? 4.6 : 5.4;
    b += spriteAt(rows, colors, 50, 62, card.value >= 13 ? px * 1.08 : px);
  } else if (card.type === 'weapon') {
    name = card.value >= 8 ? 'Tridente real' : card.value >= 5 ? 'Tridente' : 'Arpón';
    const g = card.value >= 8 ? '#f2c14e' : '#b87333';
    b += `<g transform="rotate(30 50 62)">${spriteAt(TRIDENT, { w: '#d9f5ff', g, h: '#6b3e1f' }, 50, 62, 3.2 + card.value * 0.12)}</g>`;
  } else {
    name = card.value >= 8 ? 'Perla viva' : 'Agua clara';
    const p = card.value >= 8 ? '#5ce1e6' : '#4aa3ff';
    b += spriteAt(POTION, { k: K, c: '#a0703f', w: '#d8f1ff', p, b: '#ffffffaa' }, 50, 62, 3.4 + card.value * 0.14);
  }
  // ondas bajo la carta
  b += `<path d="M10 104 Q20 100 30 104 T50 104 T70 104 T90 104" fill="none" stroke="#9ad7ff44" stroke-width="1.5"/>`;
  b += text(name, 50, 112, { size: 15, fill: '#e8f6ff' });
  b += `<rect x="38" y="118" width="24" height="14" fill="${INK[card.type]}"/>`;
  b += text(String(card.value), 50, 125.5, { size: 16, fill: K });
  b += text(rankLabel(card.rank), 15, 17, { size: 22, fill: INK[card.type] });
  b += suitGlyph(card.suit, INK[card.type], 15, 31, 1.3);
  return svg(b);
}

function back() {
  let b = frame({ fill: '#0b3a5a', border: K });
  b += `<rect x="10" y="10" width="80" height="120" fill="#0e4a70"/>`;
  for (let i = 0; i < 9; i++) {
    const y = 20 + i * 13;
    b += `<path d="M10 ${y} Q17.5 ${y - 4} 25 ${y} T40 ${y} T55 ${y} T70 ${y} T90 ${y}" fill="none" stroke="#2f7fb0" stroke-width="2"/>`;
  }
  b += `<circle cx="50" cy="70" r="16" fill="#0b3a5a" stroke="#9ad7ff" stroke-width="2"/>`;
  b += spriteAt(FISH, { k: K, a: '#ffb347', b: '#ffe0a3', w: '#fff' }, 50, 70, 2);
  return svg(b);
}

export default {
  id: 'ocean',
  name: 'Océano',
  description: 'Bajo el agua todo muerde: medusas, tiburones y un kraken al fondo.',
  palette: { swirl: ['#0f5e8c', '#1fb5a8', '#06192a'], accent: '#5ce1e6' },
  labels: { monster: 'Criatura', weapon: 'Arma', potion: 'Elixir' },
  face,
  back,
};
