// localStorage envuelto en try/catch (modo privado, almacenamiento bloqueado, etc.).
const P = 'scoundrel.';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(P + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(P + key, JSON.stringify(value));
  } catch { /* sin almacenamiento: el juego sigue funcionando */ }
}

export function remove(key) {
  try { localStorage.removeItem(P + key); } catch { /* idem */ }
}
