// The room's one database (Supabase), spoken to over its REST interface with
// nothing but fetch: two calls do not need a client library. The address and
// the key come from the environment, and both are public by design: the
// database decides what an anonymous visitor may do (supabase/migrations),
// which is read the index and leave a note, and nothing else.
//
// With neither set the site still stands: the index is drawn from
// src/data/works.js and the form says it is not taking notes.

const URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '')
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const hasDb = Boolean(URL && KEY)

async function rest(path, init = {}) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  })
  if (!res.ok) throw new Error(`db ${res.status}`)
  return res
}

/** The index as the database has it, in order, or null when it cannot be had. */
export async function fetchWorks() {
  if (!hasDb) return null
  try {
    const res = await rest('works?select=slug,title,kind,year,note,href,plate&published=is.true&order=position.asc')
    const rows = await res.json()
    return Array.isArray(rows) && rows.length ? rows : null
  } catch {
    return null
  }
}

/** Leave a note. Resolves when it is kept; rejects when it could not be. */
export async function leaveNote({ name, reach, body }) {
  if (!hasDb) throw new Error('no db')
  const clean = (v, max) => { const t = String(v || '').trim().slice(0, max); return t || null }
  await rest('notes', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ name: clean(name, 120), reach: clean(reach, 200), body: clean(body, 4000) }),
  })
}
