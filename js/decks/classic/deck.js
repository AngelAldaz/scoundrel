// Mazo Clásico: baraja de póker en pixel art.
import { svg, frame, corners, suitGlyph, spriteAt, text, rankLabel } from '../pixel.js';

const INK = { S: '#22223a', C: '#22223a', H: '#e8413c', D: '#e8413c' };
const PAPER = '#f4ecd8';

// Posiciones de los pips (y > 70 se dibujan invertidos).
const L = 37, M = 50, R = 63;
const PIPS = {
  2: [[M, 34], [M, 106]],
  3: [[M, 34], [M, 70], [M, 106]],
  4: [[L, 34], [R, 34], [L, 106], [R, 106]],
  5: [[L, 34], [R, 34], [M, 70], [L, 106], [R, 106]],
  6: [[L, 34], [R, 34], [L, 70], [R, 70], [L, 106], [R, 106]],
  7: [[L, 34], [R, 34], [M, 52], [L, 70], [R, 70], [L, 106], [R, 106]],
  8: [[L, 34], [R, 34], [M, 52], [L, 70], [R, 70], [M, 88], [L, 106], [R, 106]],
  9: [[L, 32], [R, 32], [L, 56], [R, 56], [M, 70], [L, 84], [R, 84], [L, 108], [R, 108]],
  10: [[L, 32], [R, 32], [M, 44], [L, 56], [R, 56], [L, 84], [R, 84], [M, 96], [L, 108], [R, 108]],
};

const CROWN = [
  'y..y..y..y',
  'yy.yy.yy.y',
  'yyyyyyyyyy',
  'yryyyyyyry',
  'yyyyyyyyyy',
];

function face(card) {
  const ink = INK[card.suit];
  let body = frame({ fill: PAPER, inner: null });
  if (card.rank <= 10) {
    for (const [x, y] of PIPS[card.rank]) body += suitGlyph(card.suit, ink, x, y, 1.6, y > 70 ? 180 : 0);
  } else if (card.rank === 14) {
    body += suitGlyph(card.suit, ink, 50, 70, 4.4);
  } else {
    // Figura: panel con corona, letra grande y palo.
    body += `<rect x="24" y="26" width="52" height="88" fill="${ink}"/>`;
    body += `<rect x="27" y="29" width="46" height="82" fill="#e9c46a"/>`;
    body += `<rect x="30" y="32" width="40" height="76" fill="${PAPER}"/>`;
    body += spriteAt(CROWN, { y: '#e9a23b', r: '#e8413c' }, 50, 46, 3);
    body += text(rankLabel(card.rank), 50, 76, { size: 46, fill: ink });
    body += suitGlyph(card.suit, ink, 50, 98, 1.6);
  }
  body += corners(card, ink);
  return svg(body);
}

function back() {
  let b = frame({ fill: '#2f6fb3' });
  b += `<rect x="10" y="10" width="80" height="120" fill="#24548a"/>`;
  // patrón de rombos
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 5; x++) {
      const cx = 18 + x * 16 + (y % 2 ? 8 : 0);
      const cy = 18 + y * 15;
      if (cx > 84) continue;
      b += `<path d="M${cx} ${cy - 5}L${cx + 5} ${cy}L${cx} ${cy + 5}L${cx - 5} ${cy}Z" fill="#3d86d4"/>`;
    }
  }
  b += `<rect x="30" y="52" width="40" height="36" fill="#f4ecd8"/>`;
  b += `<rect x="32" y="54" width="36" height="32" fill="#e8413c"/>`;
  b += suitGlyph('S', '#f4ecd8', 50, 70, 2.2);
  return svg(b);
}

export default {
  id: 'classic',
  name: 'Clásico',
  description: 'La baraja de póker de toda la vida, en pixel.',
  palette: { swirl: ['#1e5a8c', '#c0392b', '#0f2a40'], accent: '#e8413c' },
  labels: { monster: 'Monstruo', weapon: 'Arma', potion: 'Poción' },
  face,
  back,
};

