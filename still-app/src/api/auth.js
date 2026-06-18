// auth.js — "Meta auth up front" for CELESTE.
//
// Product decision: every star should be a real, verified person, so the main
// app gates on a Meta (Facebook/Instagram) login BEFORE the flow. The /demo
// route bypasses this entirely (zero verification, zero paywall).
//
// Real provider wiring uses Supabase's Facebook OAuth provider (same Supabase
// project the app already talks to). To go live:
//   1. Create a Meta app, add Facebook Login (+ Instagram for the handle).
//   2. In Supabase → Authentication → Providers → Facebook, paste the App ID/secret.
//   3. Set VITE_META_ENABLED=1 in Vercel.
// Until then `metaConfigured()` is false and we run a local stub user so the
// flow is fully testable in dev/preview without bricking on a missing provider.
//
// Note on the Instagram @: Meta login proves identity, but reading the user's
// *verified* Instagram handle requires Instagram Login (Business) + app review.
// We store whatever handle we get on the session; the user can confirm/correct
// it. The verified flag drives whether match email is optional (auth.notifyOff).
import { supabase, hasSupabase } from './supabase.js'

const STORE = 'celeste:auth'
export const metaConfigured = () => import.meta.env.VITE_META_ENABLED === '1' && hasSupabase

export function getSession() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE))
    return s && s.email ? s : null
  } catch {
    return null
  }
}

function persist(session) {
  try {
    localStorage.setItem(STORE, JSON.stringify(session))
  } catch {
    /* ignore */
  }
}

export function signOut() {
  try {
    localStorage.removeItem(STORE)
  } catch {
    /* ignore */
  }
  if (metaConfigured()) supabase.auth.signOut().catch(() => {})
}

// Begin Meta login. With a real provider this hands off to the OAuth redirect
// and resolves on return (see resumeSession). Without one it returns a stub so
// dev/preview keep working; production sets VITE_META_ENABLED=1.
export async function signInWithMeta() {
  if (!metaConfigured()) {
    const stub = { email: 'you@meta.dev', name: 'Demo Account', handle: '', verified: true, provider: 'stub' }
    persist(stub)
    return stub
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: { redirectTo: window.location.origin + window.location.pathname, scopes: 'public_profile,email' },
  })
  if (error) throw error
  // OAuth redirects away; resumeSession() picks it up on return.
  return null
}

// Called once on load to capture a returning OAuth session into our local store.
export async function resumeSession() {
  if (!metaConfigured()) return getSession()
  const { data } = await supabase.auth.getSession()
  const u = data?.session?.user
  if (u) {
    const meta = u.user_metadata || {}
    const session = {
      email: u.email || meta.email || '',
      name: meta.full_name || meta.name || '',
      handle: meta.user_name || meta.preferred_username || '',
      verified: true,
      provider: 'facebook',
    }
    persist(session)
    return session
  }
  return getSession()
}
