// Mazo Mazmorra: cada carta muestra la criatura, arma o poción que representa.
import { svg, frame, spriteAt, text, suitGlyph, rankLabel } from '../pixel.js';

const SLIME = [
  '....kkkk....',
  '..kkaaaakk..',
  '.kaabbaaaak.',
  '.kabbaaaaak.',
  'kaawwaawwaak',
  'kaawkaawkaak',
  'kaaaaaaaaaak',
  'kaaakkkkaaak',
  'kaaaaaaaaaak',
  '.kkkkkkkkkk.',
];
const BAT = [
  'k....k..k....k',
  'kk...kkkk...kk',
  'kak.kaaaak.kak',
  'kaakaeaaeakaak',
  'kaaaaaaaaaaaak',
  '.kaaawaawaaak.',
  '..kaaaaaaaak..',
  '...kk.kk.kk...',
];
const SKULL = [
  '...kkkkkk...',
  '..kaaaaaak..',
  '.kaaaaaaaak.',
  'kaaaaaaaaaak',
  'kakkkaakkkak',
  'kakekaakekak',
  'kakkkaakkkak',
  'kaaaakkaaaak',
  '.kaaaaaaaak.',
  '..kakakakk..',
  '..kaaaaaak..',
  '...kkkkkk...',
];
const GHOST = [
  '....kkkk....',
  '..kkaaaakk..',
  '.kaaaaaaaak.',
  '.kabaaaaaak.',
  'kabkkaakkaak',
  'kaakkaakkaak',
  'kaaaaaaaaaak',
  'kaaaakkaaaak',
  'kaaaakkaaaak',
  'kaaaaaaaaaak',
  'kakaakkaakak',
  'kk.kk..kk.kk',
];
const DEMON = [
  'k..........k',
  'kk........kk',
  '.kk.kkkk.kk.',
  '..kkaaaakk..',
  '.kaaaaaaaak.',
  'kaaeaaaaeaak',
  'kaaeeaaeeaak',
  'kaaaaaaaaaak',
  'kaakwkkwkaak',
  '.kaaaaaaaak.',
  '..kaakkaak..',
  '...kk..kk...',
];
const DRAGON = [
  '..........kk..',
  '.........kaak.',
  'kk......kaaeak',
  'kak....kaaaaak',
  'kaak..kaaaawwk',
  'kabak.kaaak...',
  'kabbakaaaak...',
  '.kabbaaaaak...',
  '..kaaaaaaaak..',
  '...kaaaaaaak..',
  '...kak..kak...',
  '...kk...kk....',
];
const SWORD = [
  '...w...',
  '..wsw..',
  '..wsw..',
  '..wsw..',
  '..wsw..',
  '..wsw..',
  '..wsw..',
  '..wsw..',
  'ggggggg',
  '.ggrgg.',
  '...h...',
  '...h...',
  '...h...',
  '..ggg..',
];
const POTION = [
  '...kkkk...',
  '...kcck...',
  '...kwwk...',
  '...kwwk...',
  '..kwwwwk..',
  '.kwwwwwwk.',
  'kwppppppwk',
  'kpbppppppk',
  'kpbppppppk',
  'kppppppppk',
  '.kppppppk.',
  '..kkkkkk..',
];

const K = '#14101c';
function monsterArt(card) {
  const v = card.value;
  const spade = card.suit === 'S';
  if (v <= 4) return [SLIME, { k: K, a: spade ? '#59c26b' : '#8bd450', b: '#c9f7a8', w: '#fff', e: '#e8413c' }, 'Limo'];
  if (v <= 6) return [BAT, { k: K, a: spade ? '#7b5aa6' : '#9b6fc9', e: '#ffd23f', w: '#fff' }, 'Murciélago'];
  if (v <= 8) return [SKULL, { k: K, a: '#efe6cf', e: '#e8413c' }, 'Esqueleto'];
  if (v <= 10) return [GHOST, { k: K, a: spade ? '#a7d8f0' : '#c3b6f2', b: '#ffffff' }, 'Espectro'];
  if (v <= 12) return [DEMON, { k: K, a: spade ? '#d1453b' : '#c2366e', e: '#ffd23f', w: '#fff' }, v === 11 ? 'Diablillo' : 'Demonio'];
  return [DRAGON, { k: K, a: spade ? '#3f8f6b' : '#b0412e', b: '#f2c14e', e: '#ffd23f', w: '#fff' }, v === 13 ? 'Wyrm' : 'Dragón'];
}

const TIERS = [
  { max: 4, g: '#b87333', w: '#c9c9c9', s: '#8a8a8a', name: 'Daga' },
  { max: 7, g: '#7a8a99', w: '#e6eef5', s: '#9fb2c2', name: 'Espada' },
  { max: 10, g: '#f2c14e', w: '#d9f5ff', s: '#6fc3e8', name: 'Hoja rúnica' },
];
const POTIONS = [
  { max: 4, p: '#ff7aa8', name: 'Tónico' },
  { max: 7, p: '#e8413c', name: 'Poción' },
  { max: 10, p: '#c23bd4', name: 'Elixir' },
];

const BG = { monster: '#2a2036', weapon: '#1f2c3a', potion: '#3a1f2a' };
const INK = { monster: '#ff6b5b', weapon: '#7fd3ff', potion: '#ff8fc1' };

function face(card) {
  let b = frame({ fill: BG[card.type], inner: '#ffffff22' });
  let name;
  if (card.type === 'monster') {
    const [rows, colors, n] = monsterArt(card);
    name = n;
    const px = rows[0].length > 12 ? 4.6 : 5.4;
    b += spriteAt(rows, colors, 50, 62, px);
  } else if (card.type === 'weapon') {
    const t = TIERS.find((x) => card.value <= x.max);
    name = t.name;
    b += `<g transform="rotate(35 50 62)">${spriteAt(SWORD, { w: t.w, s: t.s, g: t.g, h: '#6b3e1f', r: '#e8413c' }, 50, 62, 3.6 + card.value * 0.12)}</g>`;
  } else {
    const t = POTIONS.find((x) => card.value <= x.max);
    name = t.name;
    b += spriteAt(POTION, { k: K, c: '#a0703f', w: '#d8f1ff', p: t.p, b: '#ffffffaa' }, 50, 62, 3.4 + card.value * 0.14);
  }
  b += text(name, 50, 112, { size: 15, fill: '#f4ecd8' });
  b += `<rect x="38" y="118" width="24" height="14" fill="${INK[card.type]}"/>`;
  b += text(String(card.value), 50, 125.5, { size: 16, fill: K });
  b += text(rankLabel(card.rank), 15, 17, { size: 22, fill: INK[card.type] });
  b += suitGlyph(card.suit, INK[card.type], 15, 31, 1.3);
  return svg(b);
}

function back() {
  let b = frame({ fill: '#3b2a1f' });
  b += `<rect x="10" y="10" width="80" height="120" fill="#4a3526"/>`;
  // ladrillos
  for (let y = 0; y < 12; y++) {
    const off = y % 2 ? 0 : 10;
    for (let x = -1; x < 5; x++) {
      const bx = 10 + x * 20 + off;
      const l = Math.max(bx + 1, 10), r = Math.min(bx + 19, 90);
      if (r > l) b += `<rect x="${l}" y="${11 + y * 10}" width="${r - l}" height="8" fill="#5c4331"/>`;
    }
  }
  // puerta
  b += `<path d="M34 112V62H38V56H42V52H58V56H62V62H66V112Z" fill="${K}"/>`;
  b += `<path d="M38 112V64H42V58H46V56H54V58H58V64H62V112Z" fill="#1d1426"/>`;
  b += `<rect x="54" y="84" width="3" height="3" fill="#f2c14e"/>`;
  return svg(b);
}

export default {
  id: 'dungeon',
  name: 'Mazmorra',
  description: 'Limos, espectros y dragones. Cada carta es lo que es.',
  palette: { swirl: ['#4a2a5a', '#b0412e', '#1a1022'], accent: '#ff6b5b' },
  labels: { monster: 'Monstruo', weapon: 'Arma', potion: 'Poción' },
  face,
  back,
};


// Sprites reutilizados por otros mazos.
export { POTION };
