// Controlador de la partida: conecta el motor, la mesa, el HUD, el sonido y los efectos.
import {
  createGame, play, avoid, canAvoid, canUseWeapon, previewDamage, weaponLimit, MAX_HP,
} from '../engine/rules.js';
import { createBoard } from './board.js';
import { floatText, burst, flash, shake, popClass, centerOf } from './fx.js';
import { sfx, setHeartbeat } from '../audio/audio.js';
import { settings } from '../settings.js';
import { save, load, remove } from '../storage.js';
import { rankLabel } from '../decks/pixel.js';

export function createGameController({ root, getDeck, onGameOver, onPulse }) {
  const $ = (s) => root.querySelector(s);
  const hud = {
    hpPanel: $('.hp-panel'),
    hpNum: $('.hp-num'),
    hpFill: $('.hp-fill'),
    dungeon: $('.dungeon-count'),
    room: $('.room-count'),
    weaponVal: $('.weapon-val'),
    weaponLimit: $('.weapon-limit'),
    potion: $('.potion-state'),
    flee: $('.btn-flee'),
    fleeHint: $('.flee-hint'),
    toast: $('#toast'),
  };
  const board = createBoard($('#table'), { onTap, getTag, onPress: () => sfx.pickup(), onCancel: () => sfx.cancel() });
  let active = false;
  let state = null;
  let busyUntil = 0;
  let shownHp = MAX_HP;
  let toastTimer;

  const dur = () => 0.42 * settings.speed;
  const busy = () => performance.now() < busyUntil;
  const lock = (sec) => { busyUntil = Math.max(busyUntil, performance.now() + sec * 1000); };
  const later = (sec, fn) => setTimeout(fn, sec * 1000);

  function toast(msg) {
    hud.toast.textContent = msg;
    hud.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => hud.toast.classList.remove('show'), 2200);
  }

  function persist() {
    if (state.over) remove('game');
    else save('game', state);
  }

  function updateHud({ hp: hpMode = 'animate' } = {}) {
    hud.dungeon.textContent = state.dungeon.length;
    hud.room.textContent = state.turn;
    const hp = state.hp;
    if (hpMode === 'skip') {
      // la vida se actualiza cuando el golpe/cura "aterriza"
    } else if (hpMode === 'instant' || hp === shownHp) {
      shownHp = hp;
      hud.hpNum.textContent = Math.max(0, hp);
    } else {
      // contador que sube/baja de uno en uno
      const from = shownHp;
      shownHp = hp;
      const steps = Math.abs(hp - from);
      const stepT = Math.min(60, 400 / steps);
      for (let i = 1; i <= steps; i++) {
        setTimeout(() => { hud.hpNum.textContent = Math.max(0, from + Math.sign(hp - from) * i); }, i * stepT);
      }
      popClass(hud.hpNum);
    }
    if (hpMode !== 'skip') {
      hud.hpFill.style.width = `${(Math.max(0, hp) / MAX_HP) * 100}%`;
      hud.hpPanel.classList.toggle('low', hp > 0 && hp <= 6);
      syncHeartbeat();
    }

    if (state.weapon) {
      hud.weaponVal.textContent = `♦ ${state.weapon.value}`;
      const lim = weaponLimit(state);
      const limText = lim === Infinity
        ? 'Sin usar: mata cualquiera'
        : lim < 2 ? 'Ya no mata a nadie' : `Mata hasta ${lim > 10 ? `${rankLabel(lim)} (${lim})` : lim}`;
      hud.weaponLimit.textContent = limText;
      board.setWeaponInfo(`<b>TU ARMA ♦${state.weapon.value}</b> · ${limText}`, lim < 2 ? 'dead' : '');
    } else {
      hud.weaponVal.textContent = '—';
      hud.weaponLimit.textContent = 'Lucha a mano';
      board.setWeaponInfo('<b>SIN ARMA</b> · coge un ♦ para equiparlo', 'none');
    }
    hud.potion.textContent = state.potionUsed ? 'Usada en esta sala' : 'Disponible';
    hud.potion.classList.toggle('used', state.potionUsed);
    hud.potion.classList.toggle('free', !state.potionUsed);

    const can = canAvoid(state);
    hud.flee.disabled = !can;
    hud.fleeHint.textContent = state.over ? ''
      : can ? 'Las 4 cartas al fondo'
        : state.avoidedLast && state.roomPlayed === 0 ? 'Huiste de la sala anterior'
          : state.roomPlayed > 0 ? 'Ya has entrado en la sala' : 'Sala incompleta';
  }

  // Vista previa de cada carta de la sala: qué pasará si la juegas.
  function getTag(card) {
    if (card.type === 'monster') {
      if (canUseWeapon(state, card)) {
        const dmg = previewDamage(state, card, true);
        return { text: `⚔ ${dmg ? '−' + dmg : '0'}`, cls: 'tag-weapon' };
      }
      return { text: `✊ −${card.value}`, cls: 'tag-bare' };
    }
    if (card.type === 'weapon') return { text: state.weapon ? `cambiar ♦${state.weapon.value}` : 'equipar', cls: 'tag-equip' };
    if (state.potionUsed) return { text: 'sin efecto', cls: 'tag-waste' };
    const heal = Math.min(card.value, MAX_HP - state.hp);
    return { text: heal ? `+${heal}` : 'vida llena', cls: heal ? 'tag-heal' : 'tag-waste' };
  }

  function screenPos(id) {
    const el = board.cardEl(id);
    return el ? centerOf(el) : { x: innerWidth / 2, y: innerHeight / 2 };
  }

  // Latido de fondo con 5 o menos de vida.
  function syncHeartbeat() {
    setHeartbeat(active && !!state && !state.over && state.hp > 0 && state.hp <= 5);
  }

  function choose(id, opts) {
    sfx.choiceOpen();
    board.showChoice(id, opts);
  }

  function start(saved = null) {
    state = saved || createGame({ weaponRule: settings.weaponRule });
    shownHp = state.hp;
    board.reset(state, getDeck());
    updateHud({ hp: 'instant' });
    requestAnimationFrame(() => {
      board.render(state, { dealt: state.room.map((c) => c.id), dealDelay: 0.35 });
      sfx.shuffle();
      state.room.forEach((_, i) => later(0.35 + i * 0.09 * settings.speed, () => sfx.deal(i)));
      lock(dur() + 0.75);
    });
    persist();
  }

  function resumeSaved() {
    const s = load('game', null);
    return s && !s.over && Array.isArray(s.room) ? s : null;
  }

  function onTap(id) {
    if (!state || state.over || busy()) return;
    const card = state.room.find((c) => c.id === id);
    if (!card) return;

    if (card.type === 'monster') {
      const armed = canUseWeapon(state, card);
      const bare = previewDamage(state, card, false);
      const opts = [];
      if (state.weapon) {
        const dmg = previewDamage(state, card, true);
        opts.push({
          label: `⚔ Con arma`,
          sub: armed ? (dmg ? `−${dmg} vida` : 'sin daño') : `solo hasta ${weaponLimit(state)}`,
          cls: 'btn-blue',
          disabled: !armed,
          onPick: () => act(id, { useWeapon: true }),
        });
      }
      opts.push({ label: '✊ A mano', sub: `−${bare} vida${bare >= state.hp ? ' · MORTAL' : ''}`, cls: 'btn-red', onPick: () => act(id, { useWeapon: false }) });
      choose(id, opts);
      return;
    }

    if (card.type === 'weapon' && settings.confirm && state.weapon && card.value < state.weapon.value && state.weaponStack.length === 0) {
      choose(id, [
        { label: 'Equipar', sub: `cambia tu ♦${state.weapon.value}`, cls: 'btn-blue', onPick: () => act(id) },
        { label: 'Cancelar', cls: 'btn-slate', onPick: () => {} },
      ]);
      return;
    }

    if (card.type === 'potion' && settings.confirm && (state.potionUsed || state.hp === MAX_HP)) {
      choose(id, [
        { label: 'Beber', sub: state.potionUsed ? 'sin efecto' : 'vida llena', cls: 'btn-green', onPick: () => act(id) },
        { label: 'Cancelar', cls: 'btn-slate', onPick: () => {} },
      ]);
      return;
    }
    act(id);
  }

  function act(id, opts) {
    if (busy() || state.over) return;
    const from = screenPos(id);
    const events = play(state, id, opts);
    resolve(events, from);
  }

  function flee() {
    if (!state || busy() || !canAvoid(state)) { sfx.denied(); return; }
    const events = avoid(state);
    sfx.flee();
    onPulse?.(2);
    resolve(events, null);
  }

  function resolve(events, from) {
    const d = dur();
    const dealt = events.filter((e) => e.type === 'deal').map((e) => e.card);
    const refillDelay = dealt.length ? d * 0.9 : 0;
    board.render(state, { dealt, dealDelay: refillDelay });
    const hpPos = centerOf(hud.hpNum);

    for (const e of events) {
      switch (e.type) {
        case 'equip': {
          sfx.equip();
          later(d * 0.8, () => {
            const p = centerOf(board.slotEls.weapon);
            burst(p.x, p.y, ['#46e0ff', '#ffffff', '#1e90ff'], 16);
            floatText(p.x, p.y - 30, `♦ ${e.value}`, '#46e0ff');
          });
          break;
        }
        case 'discardWeapon':
          break;
        case 'slayWeapon':
        case 'slayBare': {
          const armed = e.type === 'slayWeapon';
          if (armed) sfx.slash(e.damage); else sfx.punch(e.damage);
          if (armed && state.weapon && weaponLimit(state) < 2) {
            later(d + 0.2, () => { sfx.weaponBreak(); toast('Tu arma ya no puede matar más monstruos'); });
          }
          if (from) floatText(from.x, from.y, armed ? '⚔ CON ARMA' : '✊ A MANO', armed ? '#46e0ff' : '#ff4d4d');
          later(d * 0.7, () => {
            const p = screenPos(e.card);
            burst(p.x, p.y, armed ? ['#ffffff', '#46e0ff', '#ffcc33'] : ['#ff4d4d', '#ffffff', '#b52f2f'], armed ? 14 : 20, armed ? 0.9 : 1.2);
            const el = board.cardEl(e.card);
            el?.classList.remove('hit'); void el?.offsetWidth; el?.classList.add('hit');
            if (e.damage > 0) {
              floatText(hpPos.x, hpPos.y, `−${e.damage}`, '#ff4d4d');
              shake(Math.min(14, 3 + e.damage));
              if (e.damage >= 5) flash('rgba(255,40,40,.5)');
              onPulse?.(1 + e.damage / 4);
            } else {
              floatText(p.x, p.y - 20, '¡Bloqueado!', '#46e0ff');
            }
            updateHud();
          });
          break;
        }
        case 'heal': {
          sfx.heal();
          later(d * 0.6, () => {
            floatText(hpPos.x, hpPos.y, e.amount ? `+${e.amount}` : 'Lleno', '#3ccf6a');
            burst(hpPos.x, hpPos.y, ['#3ccf6a', '#ffffff', '#ff6bd6'], 16);
            updateHud();
          });
          break;
        }
        case 'wastePotion': {
          sfx.waste();
          toast('Solo cura una poción por sala: esta se pierde');
          if (from) later(d * 0.5, () => floatText(from.x, from.y, 'Sin efecto', '#b9c3c4'));
          break;
        }
        case 'win':
        case 'lose':
          break;
        default:
          break;
      }
    }

    dealt.forEach((_, i) => later(refillDelay + i * 0.09 * settings.speed, () => sfx.deal(i)));
    if (dealt.length && !events.some((e) => e.type === 'toBottom')) later(refillDelay * 0.8, () => sfx.roomClear());
    if (dealt.length) later(refillDelay + d, () => updateHud({ hp: 'skip' }));
    updateHud({ hp: 'skip' });
    lock(refillDelay + d + (dealt.length ? dealt.length * 0.09 * settings.speed : 0) + 0.05);
    persist();

    const end = events.find((e) => e.type === 'win' || e.type === 'lose');
    if (end) {
      lock(10);
      later(d + 0.9, () => {
        if (end.type === 'win') { sfx.win(); onPulse?.(4); } else { sfx.lose(); flash('rgba(0,0,0,.6)'); }
        busyUntil = 0;
        syncHeartbeat();
        onGameOver(state);
      });
    }
  }

  hud.flee.addEventListener('click', flee);

  return {
    start,
    resumeSaved,
    setDeck: (deck) => board.setDeck(deck),
    relayout: () => board.relayout(),
    setActive(on) { active = on; syncHeartbeat(); },
    get state() { return state; },
  };
}
