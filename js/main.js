import { settings, setSetting, onSettingChange, DEFAULTS } from './settings.js';
import { DECKS, getDeck } from './decks/index.js';
import { createBackground } from './ui/background.js';
import { createGameController } from './ui/game.js';
import { staticCard } from './ui/board.js';
import { sfx, unlock, startMusic, setTheme } from './audio/audio.js';
import { getStats, recordGame, resetStats } from './stats.js';
import { leaderboardEnabled, fetchTop, submitScore } from './leaderboard.js';
import { remove } from './storage.js';
import { burst } from './ui/fx.js';
import { APP_VERSION } from './version.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const bg = createBackground($('#bg'));
let current = 'menu';
let backTo = 'menu';

// ---------- Ajustes visuales globales ----------
function applyVisuals() {
  document.body.classList.toggle('no-crt', !settings.crt);
  document.documentElement.style.setProperty('--speed', settings.speed);
  const deck = getDeck(settings.deck);
  document.documentElement.style.setProperty('--accent', deck.palette.accent);
  bg.setPalette(deck.palette.swirl);
  setTheme(deck.music || deck.id);
}
applyVisuals();
onSettingChange((k) => {
  if (['crt', 'speed', 'deck'].includes(k)) applyVisuals();
  if (k === 'deck') game.setDeck(getDeck(settings.deck));
});

// ---------- Router ----------
function show(name) {
  if (current !== name) sfx.whoosh();
  game.setActive(name === 'game');
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
  current = name;
  if (name === 'menu') { renderMenu(); setTimeout(reloadIfIdle, 300); }
  if (name === 'settings') renderSettings();
  if (name === 'decks') renderDecks();
  if (name === 'ranking') renderRanking('global');
  if (name === 'game') requestAnimationFrame(() => game.relayout());
}

// ---------- Partida ----------
const game = createGameController({
  root: $('#screen-game'),
  getDeck: () => getDeck(settings.deck),
  onGameOver: showGameOver,
  onPulse: (a) => bg.pulse(a),
});

function newGame() {
  show('game');
  requestAnimationFrame(() => game.start());
}

function continueGame() {
  const saved = game.resumeSaved();
  if (!saved) return newGame();
  show('game');
  requestAnimationFrame(() => game.start(saved));
}

// ---------- Menú ----------
function renderMenu() {
  $('.app-version').textContent = APP_VERSION;
  const logo = $('.logo');
  if (!logo.childElementCount) {
    logo.innerHTML = [...'SCOUNDREL'].map((ch, i) => `<span style="animation-delay:${-i * 0.18}s">${ch}</span>`).join('');
  }
  $('[data-action="continue"]').hidden = !game.resumeSaved();
  const deck = getDeck(settings.deck);
  const fan = $('.menu-fan');
  fan.innerHTML = '';
  const sample = [
    { id: 'D7', suit: 'D', rank: 7, value: 7, type: 'weapon' },
    { id: 'S12', suit: 'S', rank: 12, value: 12, type: 'monster' },
    { id: 'H6', suit: 'H', rank: 6, value: 6, type: 'potion' },
  ];
  sample.forEach((c, i) => {
    const el = staticCard(deck, c);
    el.className = 'fan-card';
    const rot = (i - 1) * 14;
    Object.assign(el.style, {
      position: 'absolute', left: '50%', top: '50%', height: '88%', aspectRatio: '5 / 7',
      transform: `translate(-50%, -50%) translateX(${(i - 1) * 34}%) translateY(${Math.abs(i - 1) * 6}%) rotate(${rot}deg)`,
      filter: 'drop-shadow(0 6px 0 rgba(0,0,0,.45))', zIndex: i === 1 ? 2 : 1,
    });
    el.animate(
      [{ translate: '0 0' }, { translate: '0 -6px' }, { translate: '0 0' }],
      { duration: 2600 + i * 300, iterations: Infinity, easing: 'ease-in-out', delay: -i * 500 },
    );
    fan.appendChild(el);
  });
  $$('.fan-card svg', fan).forEach((s) => Object.assign(s.style, { width: '100%', height: '100%', display: 'block' }));
  const st = getStats();
  $('.menu-best').innerHTML = st.games
    ? `Récord <b>${st.best}</b> · ${st.wins}/${st.games} victorias`
    : `Mazo: <b>${esc(deck.name)}</b>`;
}

// ---------- Ajustes ----------
function renderSettings() {
  const box = $('.settings-list');
  const row = (label, control, { wide = false, hint = '' } = {}) => `
    <div class="panel setting${wide ? ' wide' : ''}">
      <div class="s-label">${label}${hint ? `<small>${hint}</small>` : ''}</div>${control}
    </div>`;
  const toggle = (key) => `<button class="toggle${settings[key] ? ' on' : ''}" data-toggle="${key}" aria-pressed="${settings[key]}"></button>`;
  const seg = (key, options) => `<div class="seg" data-seg="${key}">${options.map(([v, l]) => `<button data-v="${v}" class="${String(settings[key]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  box.innerHTML = [
    row('Música', `<input type="range" min="0" max="1" step="0.05" value="${settings.music}" data-range="music">`),
    row('Efectos', `<input type="range" min="0" max="1" step="0.05" value="${settings.sfx}" data-range="sfx">`),
    row('Efecto CRT', toggle('crt'), { hint: 'Líneas de escaneo y viñeta' }),
    row('Temblor de pantalla', toggle('shake')),
    row('Velocidad', seg('speed', [[1.4, 'Lenta'], [1, 'Normal'], [0.6, 'Rápida']])),
    row('Confirmar jugadas', toggle('confirm'), { hint: 'Pociones sin efecto, cambiar a arma peor' }),
    row('Regla del arma', seg('weaponRule', [['strict', '< Original'], ['lte', '≤ Variante']]), { hint: 'Contra qué monstruos sirve un arma usada. Se aplica en la siguiente partida.', wide: true }),
    row('Nombre en el ranking', `<input class="text-input" maxlength="16" value="${esc(settings.name)}" placeholder="Anónimo" data-text="name">`),
    row('Estadísticas', `<button class="btn btn-red btn-sm" data-reset>Borrar</button>`, { hint: 'Récord, historial y racha' }),
  ].join('');

  $$('[data-range]', box).forEach((el) => el.addEventListener('input', () => setSetting(el.dataset.range, Number(el.value))));
  $$('[data-range="sfx"]', box).forEach((el) => el.addEventListener('change', () => sfx.click()));
  $$('[data-toggle]', box).forEach((el) => el.addEventListener('click', () => {
    const k = el.dataset.toggle;
    setSetting(k, !settings[k]);
    el.classList.toggle('on', settings[k]);
    sfx.toggle(settings[k]);
  }));
  $$('[data-seg]', box).forEach((segEl) => segEl.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const k = segEl.dataset.seg;
    const v = typeof DEFAULTS[k] === 'number' ? Number(b.dataset.v) : b.dataset.v;
    setSetting(k, v);
    $$('button', segEl).forEach((x) => x.classList.toggle('on', x === b));
    sfx.click();
  }));
  $$('[data-text]', box).forEach((el) => el.addEventListener('change', () => setSetting(el.dataset.text, el.value.trim().slice(0, 16))));
  $('[data-reset]', box).addEventListener('click', () => {
    confirmModal('¿Borrar estadísticas?', 'Se perderán tu récord y tu historial local.', 'Borrar', () => { resetStats(); sfx.waste(); });
  });
}

// ---------- Mazos ----------
function renderDecks() {
  const list = $('.deck-list');
  list.innerHTML = '';
  const sample = [
    { id: 'S13', suit: 'S', rank: 13, value: 13, type: 'monster' },
    { id: 'C5', suit: 'C', rank: 5, value: 5, type: 'monster' },
    { id: 'D9', suit: 'D', rank: 9, value: 9, type: 'weapon' },
    { id: 'H8', suit: 'H', rank: 8, value: 8, type: 'potion' },
  ];
  for (const deck of DECKS) {
    const item = document.createElement('div');
    item.className = `panel deck-item${deck.id === settings.deck ? ' selected' : ''}`;
    const prev = document.createElement('div');
    prev.className = 'deck-preview';
    const back = staticCard(deck, null, { faceDown: true });
    back.style.left = '0';
    prev.appendChild(back);
    sample.forEach((c, i) => {
      const el = staticCard(deck, c);
      el.style.left = `${(i + 1) * 15}%`;
      el.style.transform = `rotate(${(i - 1.5) * 4}deg)`;
      prev.appendChild(el);
    });
    item.appendChild(prev);
    item.insertAdjacentHTML('beforeend', `<h3>${esc(deck.name)}${deck.id === settings.deck ? '<span class="badge">EN USO</span>' : ''}</h3><p>${esc(deck.description)}</p>`);
    item.addEventListener('click', () => {
      setSetting('deck', deck.id);
      sfx.motif();
      const r = item.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, [deck.palette.accent, '#ffffff', '#ffcc33'], 18);
      renderDecks();
    });
    list.appendChild(item);
  }
}

// ---------- Ranking ----------
const DECK_NAME = (id) => esc(getDeck(id).id === id ? getDeck(id).name : id);

async function renderRanking(tab) {
  $$('#screen-ranking .tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  const body = $('.ranking-body');
  if (tab === 'local') {
    const s = getStats();
    const rows = s.history.map((h, i) => `<tr><td class="pos">${i + 1}</td><td>${new Date(h.at).toLocaleDateString('es')}</td><td>${DECK_NAME(h.deck)}</td><td>${h.won ? 'Victoria' : 'Derrota'}</td><td class="score ${h.won ? 'win' : 'loss'}">${h.score}</td></tr>`).join('');
    body.innerHTML = `
      <div class="stat-grid">
        <div class="panel"><div class="label">Partidas</div><div class="val">${s.games}</div></div>
        <div class="panel"><div class="label">Victorias</div><div class="val">${s.wins}</div></div>
        <div class="panel"><div class="label">Récord</div><div class="val">${s.best ?? '—'}</div></div>
        <div class="panel"><div class="label">Racha</div><div class="val">${s.streak}</div></div>
        <div class="panel"><div class="label">Mejor racha</div><div class="val">${s.bestStreak}</div></div>
      </div>
      ${rows ? `<table><thead><tr><th>#</th><th>Fecha</th><th>Mazo</th><th>Resultado</th><th style="text-align:right">Puntos</th></tr></thead><tbody>${rows}</tbody></table>` : '<div class="empty">Aún no has jugado ninguna partida.</div>'}`;
    return;
  }
  if (!leaderboardEnabled()) {
    body.innerHTML = '<div class="empty">El ranking mundial no está configurado.<br>Mira el README para conectarlo a Supabase (gratis).</div>';
    return;
  }
  body.innerHTML = '<div class="empty">Cargando…</div>';
  try {
    const top = await fetchTop(50);
    if (current !== 'ranking') return;
    const me = settings.name.trim().toLowerCase();
    body.innerHTML = top.length
      ? `<table><thead><tr><th>#</th><th>Jugador</th><th>Mazo</th><th>Regla</th><th style="text-align:right">Puntos</th></tr></thead><tbody>${top.map((r, i) => `
        <tr class="${me && r.name.toLowerCase() === me ? 'me' : ''}"><td class="pos">${i + 1}</td><td>${esc(r.name)}</td><td>${DECK_NAME(r.deck)}</td><td>${r.rule === 'lte' ? '≤' : '<'}</td><td class="score ${r.won ? 'win' : 'loss'}">${r.score}</td></tr>`).join('')}</tbody></table>`
      : '<div class="empty">Nadie ha enviado puntuaciones todavía. ¡Sé el primero!</div>';
  } catch (e) {
    body.innerHTML = `<div class="empty">No se pudo cargar el ranking.<br><small>${esc(e.message)}</small></div>`;
  }
}

// ---------- Modales ----------
const modal = $('#modal');
function openModal(html, cls = '') {
  modal.innerHTML = `<div class="modal-box ${cls}">${html}</div>`;
  modal.hidden = false;
  return modal.firstElementChild;
}
function closeModal() { modal.hidden = true; modal.innerHTML = ''; }

function confirmModal(title, text, okLabel, onOk) {
  const box = openModal(`<h2 style="font-size:28px">${title}</h2><p>${text}</p>
    <div class="modal-actions"><button class="btn btn-slate" data-no>Cancelar</button><button class="btn btn-red" data-ok>${okLabel}</button></div>`);
  $('[data-no]', box).onclick = () => { sfx.click(); closeModal(); };
  $('[data-ok]', box).onclick = () => { closeModal(); onOk(); };
}

function pauseMenu() {
  sfx.click();
  const box = openModal(`<h2>Pausa</h2>
    <div class="modal-actions" style="flex-direction:column;align-items:stretch">
      <button class="btn btn-blue" data-resume>Seguir jugando</button>
      <button class="btn btn-slate" data-howto>Cómo jugar</button>
      <button class="btn btn-orange" data-restart>Nueva partida</button>
      <button class="btn btn-red" data-quit>Salir al menú</button>
    </div><p>La partida se guarda sola: podrás continuarla desde el menú.</p>`);
  $('[data-resume]', box).onclick = () => { sfx.click(); closeModal(); };
  $('[data-howto]', box).onclick = () => { closeModal(); backTo = 'game'; show('howto'); };
  $('[data-restart]', box).onclick = () => confirmModal('¿Nueva partida?', 'La partida actual se perderá.', 'Empezar', () => { remove('game'); newGame(); });
  $('[data-quit]', box).onclick = () => { sfx.click(); closeModal(); show('menu'); };
}

function showGameOver(state) {
  const deckId = settings.deck;
  const { stats, newBest } = recordGame({ score: state.score, won: state.won, deck: deckId });
  const box = openModal(`
    <h2>${state.won ? '¡Has escapado!' : 'Has caído'}</h2>
    <p>${state.won ? `Sobreviviste con ${state.hp} de vida.` : 'La mazmorra se cobra otra víctima.'}</p>
    <div class="big-score ${state.won ? 'score win' : 'score loss'}">0</div>
    <div>${newBest && stats.games > 1 ? '<span class="new-best">¡Nuevo récord!</span>' : `<p>Récord: ${stats.best}</p>`}</div>
    ${leaderboardEnabled() ? `
      <div class="submit-row">
        <input class="text-input" maxlength="16" placeholder="Tu nombre" value="${esc(settings.name)}" data-name>
        <button class="btn btn-green btn-sm" data-submit>Enviar al ranking</button>
      </div>
      <div class="submit-msg"></div>` : ''}
    <div class="modal-actions">
      <button class="btn btn-blue" data-again>Otra partida</button>
      <button class="btn btn-orange" data-menu>Menú</button>
    </div>`, state.won ? 'result-win' : 'result-lose');

  // Contador de puntuación
  const el = $('.big-score', box);
  const target = state.score;
  const steps = Math.min(40, Math.abs(target));
  for (let i = 1; i <= steps; i++) {
    setTimeout(() => {
      el.textContent = Math.round((target * i) / steps);
      sfx.tick(i);
      if (i === steps) {
        el.classList.add('pop');
        const r = el.getBoundingClientRect();
        if (state.won) burst(r.left + r.width / 2, r.top + r.height / 2, ['#ffcc33', '#3ccf6a', '#ffffff'], 28, 1.5);
        if (newBest && stats.games > 1) sfx.record();
      }
    }, 300 + i * 35);
  }
  if (!steps) el.textContent = '0';

  $('[data-again]', box).onclick = () => { closeModal(); newGame(); };
  $('[data-menu]', box).onclick = () => { closeModal(); show('menu'); };
  const submit = $('[data-submit]', box);
  if (submit) {
    submit.onclick = async () => {
      const name = $('[data-name]', box).value.trim().slice(0, 16);
      const msg = $('.submit-msg', box);
      if (!name) { msg.textContent = 'Escribe un nombre'; sfx.denied(); return; }
      setSetting('name', name);
      submit.disabled = true;
      msg.textContent = 'Enviando…';
      try {
        await submitScore({ name, score: state.score, deck: deckId, won: state.won, rule: state.weaponRule });
        msg.textContent = '¡Enviado! Míralo en Ranking.';
        sfx.record();
      } catch (e) {
        msg.textContent = `No se pudo enviar: ${e.message}`;
        submit.disabled = false;
      }
    };
  }
}

// ---------- Botones ----------
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-action]');
  if (!b || b.disabled) return;
  const a = b.dataset.action;
  if (a !== 'flee') sfx.click();
  if (a === 'new') {
    if (game.resumeSaved()) confirmModal('¿Nueva partida?', 'Tienes una partida guardada. Si empiezas otra se perderá.', 'Empezar', newGame);
    else newGame();
  }
  if (a === 'continue') continueGame();
  if (['decks', 'ranking', 'settings', 'howto'].includes(a)) { backTo = current === 'game' ? 'game' : 'menu'; show(a); }
  if (a === 'back') show(backTo);
  if (a === 'pause') pauseMenu();
});
$$('#screen-ranking .tab').forEach((t) => t.addEventListener('click', () => { sfx.click(); renderRanking(t.dataset.tab); }));

// ---------- iOS / PWA ----------
let unlocked = false;
document.addEventListener('pointerdown', () => {
  if (unlocked) return;
  unlocked = true;
  unlock();
  startMusic();
}, { capture: true });
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Actualizaciones: se busca versión nueva al abrir y al volver a la app. Cuando llega,
// la página se recarga sola, pero solo estando en el menú (la partida está guardada igualmente).
let updateReady = false;
function reloadIfIdle() {
  if (updateReady && current === 'menu' && modal.hidden) location.reload();
}
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', async () => {
    try {
      const hadController = !!navigator.serviceWorker.controller;
      const reg = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController) return; // primera instalación: no hace falta recargar
        updateReady = true;
        reloadIfIdle();
      });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    } catch { /* sin service worker el juego funciona igual, solo que sin modo offline */ }
  });
}

show('menu');
