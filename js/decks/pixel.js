// Utilidades para dibujar pixel art como SVG. Cada sprite es un array de strings;
// cada carácter se mapea a un color ('.' o ' ' = transparente).
// Se agrupan los píxeles contiguos de una fila en un solo <rect> para que el DOM sea ligero.

export const W = 100; // viewBox de las cartas
export const H = 140;

export function sprite(rows, colors, x, y, px, { flip = false } = {}) {
  let out = '';
  rows.forEach((row, ry) => {
    const r = flip ? [...row].reverse().join('') : row;
    let i = 0;
    while (i < r.length) {
      const ch = r[i];
      if (ch === '.' || ch === ' ' || !colors[ch]) { i++; continue; }
      let j = i + 1;
      while (j < r.length && r[j] === ch) j++;
      out += `<rect x="${x + i * px}" y="${y + ry * px}" width="${(j - i) * px}" height="${px}" fill="${colors[ch]}"/>`;
      i = j;
    }
  });
  return out;
}

export function spriteSize(rows, px) {
  return { w: rows[0].length * px, h: rows.length * px };
}

// Dibuja un sprite centrado en (cx, cy). rot=180 para pips invertidos.
export function spriteAt(rows, colors, cx, cy, px, rot = 0) {
  const { w, h } = spriteSize(rows, px);
  const body = sprite(rows, colors, -w / 2, -h / 2, px);
  return `<g transform="translate(${cx} ${cy}) rotate(${rot})">${body}</g>`;
}

export function svg(inner, extra = '') {
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" ${extra}>${inner}</svg>`;
}

// Marco "de carta" común: borde oscuro grueso, esquinas en escalón (look pixel).
export function frame({ fill, border = '#1b1b2a', inner = null }) {
  let s = `<path d="M6 0H94V2H96V4H98V6H100V134H98V136H96V138H94V140H6V138H4V136H2V134H0V6H2V4H4V2H6Z" fill="${border}"/>`;
  s += `<path d="M7 3H93V5H95V7H97V133H95V135H93V137H7V135H5V133H3V7H5V5H7Z" fill="${fill}"/>`;
  if (inner) s += `<rect x="8" y="8" width="84" height="124" fill="none" stroke="${inner}" stroke-width="1.5"/>`;
  return s;
}

export const RANK_LABEL = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
export const rankLabel = (r) => RANK_LABEL[r] || String(r);

// Glifos de palo (pixel).
export const SUIT_GLYPH = {
  H: [
    '.XX...XX.',
    'XXXX.XXXX',
    'XXXXXXXXX',
    'XXXXXXXXX',
    '.XXXXXXX.',
    '..XXXXX..',
    '...XXX...',
    '....X....',
  ],
  D: [
    '...X...',
    '..XXX..',
    '.XXXXX.',
    'XXXXXXX',
    'XXXXXXX',
    '.XXXXX.',
    '..XXX..',
    '...X...',
  ],
  S: [
    '....X....',
    '...XXX...',
    '..XXXXX..',
    '.XXXXXXX.',
    'XXXXXXXXX',
    'XXXXXXXXX',
    '.XX.X.XX.',
    '....X....',
    '...XXX...',
  ],
  C: [
    '...XXX...',
    '...XXX...',
    '.X.XXX.X.',
    'XXXXXXXXX',
    'XXXXXXXXX',
    '.X..X..X.',
    '....X....',
    '...XXX...',
  ],
};

export function suitGlyph(suit, color, cx, cy, px, rot = 0) {
  return spriteAt(SUIT_GLYPH[suit], { X: color }, cx, cy, px, rot);
}

export function text(str, x, y, { size = 16, fill = '#1b1b2a', anchor = 'middle', rot = 0, weight = 400, stroke = null } = {}) {
  const st = stroke ? ` stroke="${stroke}" stroke-width="3" paint-order="stroke"` : '';
  const tr = rot ? ` transform="rotate(${rot} ${x} ${y})"` : '';
  return `<text x="${x}" y="${y}" font-family="'Jersey 10', monospace" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" dominant-baseline="central"${st}${tr}>${str}</text>`;
}

// Esquinas con índice (rango + palo) arriba-izquierda y abajo-derecha invertida.
export function corners(card, color, { size = 23, px = 1.4 } = {}) {
  const label = rankLabel(card.rank);
  const tl = text(label, 14, 16, { size, fill: color }) + suitGlyph(card.suit, color, 14, 31, px);
  const br = `<g transform="rotate(180 50 70)">${tl}</g>`;
  return tl + br;
}
