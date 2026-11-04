// Mazo LCD: la baraja clásica en los cuatro verdes de una pantalla portátil antigua.
import { pokerDeck } from '../classic/deck.js';

const G0 = '#0f380f';
const G1 = '#306230';
const G2 = '#8bac0f';
const G3 = '#c4d98a';

export default pokerDeck({
  id: 'lcd',
  name: 'LCD',
  description: 'Cuatro tonos de verde y nada más. Como jugar con pilas.',
  palette: { swirl: ['#306230', '#8bac0f', '#0f380f'], accent: '#8bac0f' },
  labels: { monster: 'Monstruo', weapon: 'Arma', potion: 'Poción' },
}, {
  paper: G3,
  black: G0,
  red: G1,
  border: G0,
  faceFrame: G2,
  crown: G1,
  crownGem: G0,
  back: G1,
  backDark: G0,
  backLight: G1,
  backMark: G2,
});
