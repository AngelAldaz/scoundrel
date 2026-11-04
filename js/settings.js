import { load, save } from './storage.js';

export const DEFAULTS = {
  music: 0.5,
  sfx: 0.8,
  crt: true,
  shake: true,
  speed: 1, // multiplicador de duración de animaciones: 1.4 lento, 1 normal, 0.6 rápido
  weaponRule: 'strict', // 'strict' = regla original (<), 'lte' = ≤
  confirm: true, // pedir confirmación en jugadas dudosas (poción sin efecto, cambiar arma usada)
  name: '',
  deck: 'classic',
};

const listeners = new Set();
export const settings = { ...DEFAULTS, ...load('settings', {}) };

export function setSetting(key, value) {
  settings[key] = value;
  save('settings', settings);
  listeners.forEach((fn) => fn(key, value));
}

export function onSettingChange(fn) {
  listeners.add(fn);
}
