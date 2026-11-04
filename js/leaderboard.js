// Ranking global vía la API REST de Supabase (sin SDK).
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const leaderboardEnabled = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);

function headers() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function request(path, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: headers(), signal: ctrl.signal });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Error ${res.status}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timer);
  }
}

export function fetchTop(limit = 50) {
  return request(`scores?select=name,score,deck,rule,won,created_at&order=score.desc,created_at.asc&limit=${limit}`);
}

export function submitScore({ name, score, deck, won, rule }) {
  return request('rpc/submit_score', {
    method: 'POST',
    body: JSON.stringify({ p_name: name, p_score: score, p_deck: deck, p_won: won, p_rule: rule }),
  });
}
