// Registro de mazos. Para añadir uno nuevo:
//   1. Crea js/decks/<id>/deck.js exportando por defecto { id, name, description, palette, labels, face(card), back() }
//      - face(card) y back() devuelven un string SVG (o HTML, p. ej. un <img src="js/decks/<id>/img/S14.png">).
//      - card = { id, suit: 'S'|'C'|'D'|'H', rank: 2..14, value, type: 'monster'|'weapon'|'potion' }
//      - palette.swirl = 3 colores para el fondo animado; palette.accent = color de realce de la UI.
//   2. Impórtalo y añádelo a DECKS abajo. Aparecerá automáticamente en la pantalla "Mazos".
import classic from './classic/deck.js';
import dungeon from './dungeon/deck.js';
import neon from './neon/deck.js';

export const DECKS = [classic, dungeon, neon];

export function getDeck(id) {
  return DECKS.find((d) => d.id === id) || DECKS[0];
}
