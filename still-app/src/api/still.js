// CELESTE — the calls the whole product makes.
//
// submitStill records a one-way "I still think about @them". Per the deferred-
// reveal safety model (PRODUCT-ANALYSIS.md §2.3) the server NEVER tells the
// caller whether it's mutual — it returns only { recorded: true }. The "yes" is
// delivered solely through the owner-controlled channel (the match email to the
// earlier entrant). This closes the live prober oracle. All matching/anonymity
// logic lives in the `still_submit` SECURITY DEFINER RPC (see
// supabase/migrations/0006_still.sql, hardened in 0007/0008).
import { supabase, hasSupabase } from './supabase';

// Mirror of the server-side still_norm(): lowercase, drop a leading @, keep only
// IG-legal characters. Used purely for client-side validation + display.
export function normHandle(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9._]/g, '');
}

export function isValidHandle(h) {
  const n = normHandle(h);
  return n.length >= 1 && n.length <= 30;
}

// Record a one-way entry. Returns { recorded } and, when throttled/blocked, an
// `error` of 'rate_limited' | 'suppressed'. Never returns a match result.
export async function submitStill({ me, ex, email }) {
  if (!hasSupabase) {
    // Offline demo: just acknowledge — there is no live reveal anymore.
    await new Promise((r) => setTimeout(r, 600));
    return { recorded: true };
  }

  const { data, error } = await supabase.rpc('still_submit', {
    p_from: me,
    p_to: ex,
    p_email: email ? email.trim() : null,
  });
  if (error) throw error;
  return data; // { recorded: boolean, error?: 'rate_limited' | 'suppressed' }
}

// Un-send a one-way entry you made (§4.6).
export async function withdrawStill({ me, ex }) {
  if (!hasSupabase) {
    await new Promise((r) => setTimeout(r, 300));
    return { withdrawn: true };
  }
  const { data, error } = await supabase.rpc('still_withdraw', { p_from: me, p_to: ex });
  if (error) throw error;
  return data; // { withdrawn: boolean }
}

// Public erasure / "never let me be entered" for a handle (§2.5).
export async function suppressHandle(handle) {
  if (!hasSupabase) {
    await new Promise((r) => setTimeout(r, 300));
    return { suppressed: normHandle(handle), erased: 0 };
  }
  const { data, error } = await supabase.rpc('still_suppress', { p_handle: handle });
  if (error) throw error;
  return data; // { suppressed: string, erased: number }
}
