// Genera los iconos PNG de la PWA a partir de un diseño pixel (sin dependencias).
// Uso: node tools/make-icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const SPADE = [
  '....X....',
  '...XXX...',
  '..XXXXX..',
  '.XXXXXXX.',
  'XXXXXXXXX',
  'XXXXXXXXX',
  '.XX.X.XX.',
  '....X....',
  '...XXX...',
];

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// Dibuja en una rejilla lógica de n×n con margen m.
function design(n, m) {
  const g = Array.from({ length: n }, () => Array(n).fill(hex('#1a2427')));
  const rect = (x0, y0, w, h, c) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (g[y]?.[x]) g[y][x] = hex(c);
  };
  const o = m; // desplazamiento
  // carta trasera (azul) y sombra
  rect(o + 12, o + 6, 16, 24, '#0b1012');
  rect(o + 11, o + 5, 16, 24, '#1462b0');
  rect(o + 12, o + 6, 14, 22, '#1e90ff');
  // carta delantera
  rect(o + 6, o + 4, 16, 24, '#0b1012');
  rect(o + 7, o + 5, 14, 22, '#f4ecd8');
  SPADE.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'X') rect(o + 9 + x, o + 11 + y, 1, 1, '#e8413c'); }));
  // índice de esquina
  rect(o + 8, o + 6, 2, 1, '#22223a');
  rect(o + 8, o + 7, 1, 2, '#22223a');
  return g;
}

function png(size, grid) {
  const n = grid.length;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const c = grid[Math.floor((y * n) / size)][Math.floor((x * n) / size)];
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = c[0]; raw[i + 1] = c[1]; raw[i + 2] = c[2];
    }
  }
  const crcTable = Array.from({ length: 256 }, (_, k) => {
    let c = k;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('icons', { recursive: true });
const normal = design(32, 0);
const maskable = design(42, 5);
writeFileSync('icons/apple-touch-icon.png', png(180, normal));
writeFileSync('icons/icon-192.png', png(192, normal));
writeFileSync('icons/icon-512.png', png(512, normal));
writeFileSync('icons/icon-maskable-512.png', png(512, maskable));
console.log('Iconos generados en icons/');
