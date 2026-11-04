// Mazo Neón: cartas oscuras con trazos brillantes, un color por tipo.
import { svg, suitGlyph, text, rankLabel } from '../pixel.js';

const GLOW = { monster: '#ff3df2', weapon: '#2ef2ff', potion: '#b6ff3d' };
const BG = '#0d0221';

function neonFrame(color) {
  return `<rect x="1" y="1" width="98" height="138" rx="8" fill="#05010f"/>`
    + `<rect x="3" y="3" width="94" height="134" rx="7" fill="${BG}"/>`
    + `<rect x="7" y="7" width="86" height="126" rx="5" fill="none" stroke="${color}" stroke-opacity=".25" stroke-width="5"/>`
    + `<rect x="7" y="7" width="86" height="126" rx="5" fill="none" stroke="${color}" stroke-width="1.5"/>`;
}

function face(card) {
  const c = GLOW[card.type];
  let b = neonFrame(c);
  // retícula de fondo
  for (let y = 20; y < 130; y += 12) b += `<rect x="9" y="${y}" width="82" height="0.6" fill="${c}" fill-opacity=".12"/>`;
  b += `<g opacity=".35">${suitGlyph(card.suit, c, 50, 66, 6.2)}</g>`;
  b += suitGlyph(card.suit, c, 50, 66, 5.4);
  b += suitGlyph(card.suit, BG, 50, 66, 3.8);
  b += text(rankLabel(card.rank), 50, 68, { size: 40, fill: '#ffffff', stroke: c });
  b += text(rankLabel(card.rank), 16, 18, { size: 20, fill: c });
  b += text(rankLabel(card.rank), 84, 122, { size: 20, fill: c, rot: 180 });
  b += text(card.type === 'monster' ? 'HOSTIL' : card.type === 'weapon' ? 'ARMA' : 'CURA', 50, 116, { size: 12, fill: c });
  return svg(b);
}

function back() {
  let b = neonFrame('#ff3df2');
  for (let i = 0; i < 9; i++) {
    const y = 80 + i * i * 0.9;
    b += `<rect x="9" y="${y}" width="82" height="0.8" fill="#2ef2ff" fill-opacity=".6"/>`;
  }
  for (let x = -40; x <= 140; x += 14) b += `<line x1="50" y1="80" x2="${x}" y2="132" stroke="#2ef2ff" stroke-opacity=".5" stroke-width=".8"/>`;
  b += `<circle cx="50" cy="56" r="20" fill="#ff3df2" fill-opacity=".9"/>`;
  for (let i = 0; i < 5; i++) b += `<rect x="28" y="${58 + i * 4}" width="44" height="${1 + i * 0.4}" fill="${BG}"/>`;
  return svg(b, 'shape-rendering="geometricPrecision"');
}

export default {
  id: 'neon',
  name: 'Neón',
  description: 'Synthwave a medianoche. Rosa hostil, cian afilado, verde vital.',
  palette: { swirl: ['#5b1a8c', '#0f9fb3', '#0d0221'], accent: '#ff3df2' },
  labels: { monster: 'Hostil', weapon: 'Arma', potion: 'Cura' },
  face,
  back,
};
