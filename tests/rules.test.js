import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeck, createGame, play, avoid, canAvoid, canUseWeapon, computeScore, MAX_HP,
} from '../js/engine/rules.js';

const C = (id) => {
  const suit = id[0];
  const rank = Number(id.slice(1));
  const type = suit === 'D' ? 'weapon' : suit === 'H' ? 'potion' : 'monster';
  return { id, suit, rank, value: rank, type };
};

// Partida con sala y mazmorra controladas.
function setup(room, dungeon = [], opts = {}) {
  const s = createGame({ seed: 1, ...opts });
  s.room = room.map(C);
  s.dungeon = dungeon.map(C);
  return s;
}

test('mazo de 44 cartas sin figuras ni ases rojos', () => {
  const d = buildDeck();
  assert.equal(d.length, 44);
  assert.equal(d.filter((c) => c.type === 'monster').length, 26);
  assert.equal(d.filter((c) => c.type === 'weapon').length, 9);
  assert.equal(d.filter((c) => c.type === 'potion').length, 9);
  assert.ok(!d.some((c) => (c.suit === 'H' || c.suit === 'D') && c.rank > 10));
  assert.equal(new Set(d.map((c) => c.id)).size, 44);
});

test('partida nueva: 4 en sala, 40 en mazmorra, 20 de vida', () => {
  const s = createGame({ seed: 42 });
  assert.equal(s.room.length, 4);
  assert.equal(s.dungeon.length, 40);
  assert.equal(s.hp, MAX_HP);
});

test('misma semilla → mismo orden', () => {
  assert.deepEqual(createGame({ seed: 7 }).dungeon, createGame({ seed: 7 }).dungeon);
});

test('huir manda la sala al fondo y no se puede dos veces seguidas', () => {
  const s = setup(['S2', 'S3', 'S4', 'S5'], ['H2', 'H3', 'H4', 'H5', 'C9']);
  assert.ok(canAvoid(s));
  avoid(s);
  assert.deepEqual(s.room.map((c) => c.id), ['H2', 'H3', 'H4', 'H5']);
  assert.deepEqual(s.dungeon.map((c) => c.id), ['C9', 'S2', 'S3', 'S4', 'S5']);
  assert.ok(!canAvoid(s));
  assert.throws(() => avoid(s));
});

test('tras completar una sala se puede volver a huir', () => {
  const s = setup(['S2', 'S3', 'S4', 'S5'], ['H2', 'H3', 'H4', 'H5', 'C9', 'C8', 'C7']);
  avoid(s);
  play(s, 'H2'); play(s, 'H3'); play(s, 'H4');
  assert.equal(s.room.length, 4);
  assert.equal(s.room[0].id, 'H5', 'la carta sobrante se queda');
  assert.ok(canAvoid(s));
});

test('no se puede huir después de jugar una carta', () => {
  const s = setup(['S2', 'S3', 'S4', 'S5'], ['H2']);
  play(s, 'S2', { useWeapon: false });
  assert.ok(!canAvoid(s));
});

test('se reparten 3 nuevas al resolver 3 de 4', () => {
  const s = setup(['S2', 'S3', 'S4', 'S5'], ['H2', 'H3', 'H4', 'H5']);
  play(s, 'S2'); play(s, 'S3');
  assert.equal(s.room.length, 2);
  play(s, 'S4');
  assert.deepEqual(s.room.map((c) => c.id), ['S5', 'H2', 'H3', 'H4']);
  assert.equal(s.roomPlayed, 0);
});

test('a mano: daño completo', () => {
  const s = setup(['C10', 'S3', 'S4', 'S5'], ['H2']);
  play(s, 'C10');
  assert.equal(s.hp, 10);
});

test('equipar arma y luchar resta su valor, mínimo 0', () => {
  const s = setup(['D5', 'S9', 'S3', 'C2'], ['H2', 'H3', 'H4']);
  play(s, 'D5');
  play(s, 'S9');
  assert.equal(s.hp, 16);
  assert.deepEqual(s.weaponStack.map((c) => c.id), ['S9']);
  play(s, 'S3');
  assert.equal(s.hp, 16, 'monstruo menor que el arma no hace daño');
});

test('regla estricta: el arma solo sirve contra monstruos menores que el último', () => {
  const s = setup(['D5', 'S9', 'C9', 'C8'], ['H2', 'H3', 'H4']);
  play(s, 'D5'); play(s, 'S9');
  assert.ok(!canUseWeapon(s, C('C9')));
  assert.ok(canUseWeapon(s, C('C8')));
  play(s, 'C9'); // forzado a mano
  assert.equal(s.hp, 20 - 4 - 9);
  assert.equal(s.weaponStack.length, 1);
});

test('regla ≤ opcional', () => {
  const s = setup(['D5', 'S9', 'C9', 'C10'], ['H2', 'H3', 'H4'], { weaponRule: 'lte' });
  play(s, 'D5'); play(s, 'S9');
  assert.ok(canUseWeapon(s, C('C9')));
  assert.ok(!canUseWeapon(s, C('C10')));
});

test('el jugador puede elegir luchar a mano aunque tenga arma', () => {
  const s = setup(['D5', 'S3', 'C9', 'C10'], ['H2', 'H3', 'H4']);
  play(s, 'D5');
  play(s, 'S3', { useWeapon: false });
  assert.equal(s.hp, 17);
  assert.equal(s.weaponStack.length, 0);
});

test('equipar otra arma descarta la anterior y sus monstruos', () => {
  const s = setup(['D5', 'S3', 'D7', 'C10'], ['H2', 'H3', 'H4']);
  play(s, 'D5'); play(s, 'S3'); play(s, 'D7');
  assert.equal(s.weapon.id, 'D7');
  assert.equal(s.weaponStack.length, 0);
  assert.ok(s.discard.some((c) => c.id === 'D5'));
  assert.ok(s.discard.some((c) => c.id === 'S3'));
});

test('solo una poción por sala y la vida no pasa de 20', () => {
  const s = setup(['C10', 'H5', 'H4', 'S2'], ['H2', 'H3', 'H6']);
  play(s, 'C10');
  play(s, 'H5');
  assert.equal(s.hp, 15);
  play(s, 'H4');
  assert.equal(s.hp, 15, 'la segunda poción no tiene efecto');
  assert.ok(s.discard.some((c) => c.id === 'H4'));
  const t = setup(['H9', 'S2', 'S3', 'S4'], ['H2']);
  play(t, 'H9');
  assert.equal(t.hp, 20);
});

test('la poción arrastrada a la sala siguiente sí cura', () => {
  const s = setup(['C10', 'H5', 'S2', 'H4'], ['S3', 'S4', 'S5']);
  play(s, 'C10'); play(s, 'H5'); play(s, 'S2');
  assert.equal(s.hp, 13);
  play(s, 'H4');
  assert.equal(s.hp, 17);
});

test('final de mazmorra: se resuelven todas las cartas restantes', () => {
  const s = setup(['S2', 'S3', 'S4', 'S5'], []);
  play(s, 'S2'); play(s, 'S3'); play(s, 'S4');
  assert.ok(!s.over);
  assert.equal(s.room.length, 1);
  play(s, 'S5');
  assert.ok(s.over && s.won);
  assert.equal(s.score, 20 - 14);
});

test('sala corta cuando quedan menos de 3 en la mazmorra', () => {
  const s = setup(['S2', 'S3', 'S4', 'H2'], ['C2']);
  play(s, 'S2'); play(s, 'S3'); play(s, 'S4');
  assert.deepEqual(s.room.map((c) => c.id), ['H2', 'C2']);
  assert.ok(!canAvoid(s));
});

test('derrota: vida menos monstruos restantes', () => {
  const s = setup(['S14', 'C13', 'H2', 'S5'], ['C4', 'H9', 'D3']);
  s.hp = 10;
  const ev = play(s, 'S14');
  assert.ok(s.over && !s.won);
  assert.equal(s.score, -4 - (13 + 5 + 4));
  assert.equal(ev.at(-1).type, 'lose');
});

test('victoria con 20 y última carta poción suma la poción', () => {
  const s = setup(['S2', 'H3', 'H7'], []);
  play(s, 'S2'); play(s, 'H3');
  assert.equal(s.hp, 20);
  s.potionUsed = false;
  play(s, 'H7');
  assert.ok(s.won);
  assert.equal(s.score, 27);
});

test('victoria sin bonus si la vida no es 20', () => {
  const s = setup(['S5', 'H2'], []);
  play(s, 'S5'); play(s, 'H2');
  assert.equal(s.score, 17);
  assert.equal(computeScore(s), 17);
});

test('partidas aleatorias completas terminan con estado coherente', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const s = createGame({ seed });
    let guard = 0;
    while (!s.over && guard++ < 200) {
      if (canAvoid(s) && seed % 3 === 0 && guard % 2) { avoid(s); continue; }
      const card = s.room.find((c) => c.type !== 'monster') || s.room.reduce((a, b) => (a.value < b.value ? a : b));
      play(s, card.id, { useWeapon: true });
    }
    assert.ok(s.over, `seed ${seed} terminó`);
    const total = s.dungeon.length + s.room.length + s.discard.length + s.weaponStack.length + (s.weapon ? 1 : 0);
    assert.equal(total, 44, 'ninguna carta se pierde');
    assert.ok(s.score >= -250 && s.score <= 30);
  }
});
