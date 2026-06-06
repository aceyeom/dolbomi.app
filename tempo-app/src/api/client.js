// Thin fetch client for the TEMPO API. Stores the JWT in localStorage and
// attaches it as a Bearer token. Same-origin paths (/auth, /api) are proxied
// to the backend by Vite in dev and by your reverse proxy in prod.

const TOKEN_KEY = 'tempo_token';
const DEMO = { login: 'demo', password: 'tempo' };

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function setToken(t) {
  try { localStorage.setItem(TOKEN_KEY, t); } catch { /* ignore */ }
}
export function clearToken() {
  try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

async function req(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (auth) {
    const t = getToken();
    if (t) headers.authorization = `Bearer ${t}`;
  }
  const res = await fetch(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.error || `${method} ${path} → ${res.status}`);
  }
  return res.json();
}

export async function login(login = DEMO.login, password = DEMO.password) {
  const { token } = await req('/auth/login', { method: 'POST', body: { login, password }, auth: false });
  setToken(token);
  return token;
}

// Ensure we have a usable session; auto-login as the demo soldier if needed.
export async function ensureSession() {
  if (!getToken()) await login();
}

export const getState        = () => req('/api/state');
export const toggleTonight   = (questId) => req(`/api/tonight/${questId}/toggle`, { method: 'POST' });
export const toggleSubquest  = (oppId, subquestId, verified) =>
  req(`/api/opportunities/${oppId}/subquests/${subquestId}/toggle`, { method: 'POST', body: { verified: !!verified } });
export const checkin         = (mood, energy) => req('/api/checkin', { method: 'POST', body: { mood, energy } });
