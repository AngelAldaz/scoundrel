// Mazo Claro: minimalista y muy legible. Número enorme y un color por tipo.
import { svg, frame, suitGlyph, text, rankLabel } from '../pixel.js';

const PAPER = '#fbf8f1';
const INK = '#1d2230';
const TYPE = {
  monster: { color: '#e5484d', label: 'MONSTRUO' },
  weapon: { color: '#2f7de1', label: 'ARMA' },
  potion: { color: '#2fa36b', label: 'POCIÓN' },
};

function face(card) {
  const t = TYPE[card.type];
  let b = frame({ fill: PAPER, border: INK });
  // banda superior con el tipo
  b += `<rect x="7" y="7" width="86" height="20" fill="${t.color}"/>`;
  b += text(t.label, 50, 17.5, { size: 15, fill: '#ffffff' });
  // número enorme
  b += text(String(card.value), 50, 70, { size: 66, fill: t.color, stroke: PAPER });
  // índice (J/Q/K/A cuando aplica) y palo
  const label = rankLabel(card.rank);
  if (label !== String(card.value)) b += text(label, 50, 103, { size: 20, fill: INK });
  else b += suitGlyph(card.suit, INK, 50, 103, 1.8);
  b += `<rect x="20" y="116" width="60" height="2" fill="${t.color}" opacity=".5"/>`;
  b += suitGlyph(card.suit, t.color, 30, 125, 1.1) + suitGlyph(card.suit, t.color, 50, 125, 1.1) + suitGlyph(card.suit, t.color, 70, 125, 1.1);
  return svg(b);
}

function back() {
  let b = frame({ fill: PAPER, border: INK });
  b += `<rect x="12" y="12" width="76" height="116" fill="none" stroke="${INK}" stroke-width="2"/>`;
  const cols = ['#e5484d', '#2f7de1', '#2fa36b'];
  cols.forEach((c, i) => { b += `<rect x="${26 + i * 18}" y="58" width="12" height="24" fill="${c}"/>`; });
  return svg(b);
}

export default {
  id: 'clean',
  name: 'Claro',
  description: 'Minimalista y fácil de leer: rojo hace daño, azul protege, verde cura.',
  palette: { swirl: ['#3a4a5c', '#8a5a44', '#141a22'], accent: '#2f7de1' },
  labels: { monster: 'Monstruo', weapon: 'Arma', potion: 'Poción' },
  face,
  back,
};
