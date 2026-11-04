// "Juice": textos flotantes, partículas, destellos y temblor de pantalla.
import { settings } from '../settings.js';

const layer = () => document.getElementById('fx');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

export function floatText(x, y, str, color = '#fff') {
  const el = document.createElement('div');
  el.className = 'float-text';
  el.textContent = str;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.color = color;
  layer().appendChild(el);
  setTimeout(() => el.remove(), 1200 * settings.speed + 100);
}

export function burst(x, y, color = '#fff', n = 14, power = 1) {
  if (reduced) return;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.background = Array.isArray(color) ? color[i % color.length] : color;
    const a = Math.random() * Math.PI * 2;
    const d = (40 + Math.random() * 70) * power;
    const dx = Math.cos(a) * d;
    const dy = Math.sin(a) * d - 20;
    const size = 4 + Math.round(Math.random() * 5);
    p.style.width = p.style.height = `${size}px`;
    layer().appendChild(p);
    p.animate(
      [
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 30}px)) scale(0.2) rotate(${Math.random() * 360}deg)`, opacity: 0 },
      ],
      { duration: (500 + Math.random() * 400) * settings.speed, easing: 'cubic-bezier(.1,.8,.3,1)' },
    ).onfinish = () => p.remove();
  }
}

export function flash(color = '#ff0000') {
  const el = document.createElement('div');
  el.className = 'flash';
  el.style.background = color;
  layer().appendChild(el);
  setTimeout(() => el.remove(), 400);
}

export function shake(intensity = 6) {
  if (!settings.shake || reduced) return;
  const app = document.getElementById('app');
  const k = [];
  for (let i = 0; i < 6; i++) {
    const f = intensity * (1 - i / 6);
    k.push({ transform: `translate(${(Math.random() - 0.5) * 2 * f}px, ${(Math.random() - 0.5) * 2 * f}px) rotate(${(Math.random() - 0.5) * f * 0.15}deg)` });
  }
  k.push({ transform: 'none' });
  app.animate(k, { duration: 320, easing: 'ease-out' });
}

export function popClass(el) {
  if (!el) return;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}

export function centerOf(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
