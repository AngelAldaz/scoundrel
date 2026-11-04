// Mazo Arcano: cartas de tarot en morado y oro, con números romanos.
import { svg, suitGlyph, text } from '../pixel.js';

const GOLD = '#e2b04a';
const GOLD_D = '#9c7424';
const BG = '#2a1640';
const BG_D = '#1a0d2a';
const TINT = { monster: '#ff6b81', weapon: '#8fd3ff', potion: '#8ff0b4' };

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV'];

function title(card) {
  if (card.type === 'weapon') return card.value >= 8 ? 'El Filo' : 'La Espada';
  if (card.type === 'potion') return card.value >= 8 ? 'El Cáliz' : 'La Copa';
  const v = card.value;
  if (v <= 5) return 'La Sombra';
  if (v <= 8) return 'El Colgado';
  if (v <= 10) return 'La Torre';
  return ['El Diablo', 'La Muerte', 'El Juicio', 'El Abismo'][v - 11];
}

function tarotFrame() {
  return `<rect x="0" y="0" width="100" height="140" rx="6" fill="${BG_D}"/>`
    + `<rect x="3" y="3" width="94" height="134" rx="5" fill="${BG}"/>`
    + `<rect x="7" y="7" width="86" height="126" rx="3" fill="none" stroke="${GOLD}" stroke-width="2"/>`
    + `<rect x="10" y="10" width="80" height="120" rx="2" fill="none" stroke="${GOLD_D}" stroke-width="1"/>`
    // esquinas ornamentales
    + [[10, 10], [90, 10], [10, 130], [90, 130]].map(([x, y]) => `<rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="${GOLD}" transform="rotate(45 ${x} ${y})"/>`).join('');
}

function face(card) {
  const tint = TINT[card.type];
  let b = tarotFrame();
  // numeral arriba
  b += text(ROMAN[card.rank], 50, 22, { size: 18, fill: GOLD });
  // halo con rayos
  b += `<circle cx="50" cy="66" r="26" fill="${BG_D}" stroke="${GOLD_D}" stroke-width="1.5"/>`;
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    const x1 = 50 + Math.cos(a) * 29, y1 = 66 + Math.sin(a) * 29;
    const x2 = 50 + Math.cos(a) * (i % 2 ? 33 : 36), y2 = 66 + Math.sin(a) * (i % 2 ? 33 : 36);
    b += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${GOLD}" stroke-width="2"/>`;
  }
  b += `<circle cx="50" cy="66" r="20" fill="none" stroke="${tint}" stroke-opacity=".35" stroke-width="4"/>`;
  b += suitGlyph(card.suit, tint, 50, 66, 3.6);
  // valor dentro de un rombo
  b += `<rect x="42" y="89" width="16" height="16" fill="${GOLD}" transform="rotate(45 50 97)"/>`;
  b += text(String(card.value), 50, 98, { size: 15, fill: BG_D });
  // cartela con el nombre
  b += `<rect x="14" y="110" width="72" height="16" fill="${BG_D}" stroke="${GOLD_D}" stroke-width="1"/>`;
  b += text(title(card), 50, 118.5, { size: 13, fill: GOLD });
  return svg(b, 'shape-rendering="geometricPrecision"');
}

function back() {
  let b = tarotFrame();
  // sol y luna
  b += `<circle cx="50" cy="70" r="24" fill="none" stroke="${GOLD}" stroke-width="2"/>`;
  b += `<circle cx="50" cy="70" r="15" fill="${GOLD}"/>`;
  b += `<circle cx="56" cy="65" r="13" fill="${BG}"/>`;
  for (let i = 0; i < 8; i++) {
    const a = (i * 45 * Math.PI) / 180;
    b += `<circle cx="${(50 + Math.cos(a) * 32).toFixed(1)}" cy="${(70 + Math.sin(a) * 32).toFixed(1)}" r="2" fill="${GOLD}"/>`;
  }
  // estrellas
  for (const [x, y] of [[22, 26], [78, 30], [26, 112], [74, 114], [50, 24], [50, 118]]) {
    b += `<rect x="${x - 2}" y="${y - 2}" width="4" height="4" fill="${GOLD_D}" transform="rotate(45 ${x} ${y})"/>`;
  }
  return svg(b, 'shape-rendering="geometricPrecision"');
}

export default {
  id: 'arcane',
  name: 'Arcano',
  description: 'Tarot en morado y oro. La Muerte, La Torre y El Abismo te esperan.',
  palette: { swirl: ['#4b2470', '#b8862b', '#140a20'], accent: '#e2b04a' },
  labels: { monster: 'Arcano', weapon: 'Espada', potion: 'Copa' },
  face,
  back,
};
