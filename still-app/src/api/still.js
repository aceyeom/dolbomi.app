// STILL. — the one call the whole product makes.
//
// submitStill records a one-way "I still think about @them" and tells you, and
// only you, whether it's mutual. All the matching + anonymity logic lives in the
// `still_submit` SECURITY DEFINER RPC (see supabase/migrations/0006_still.sql):
// the client can never read who entered whom, only learn YES/NO for its own pair.
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

export async function submitStill({ me, ex, email }) {
  if (!hasSupabase) {
    // Offline demo: pretend. Enter "demo" as the ex to see the mutual reveal.
    await new Promise((r) => setTimeout(r, 600));
    return { matched: normHandle(ex) === 'demo', them: ex };
  }

  const { data, error } = await supabase.rpc('still_submit', {
    p_from: me,
    p_to: ex,
    p_email: email ? email.trim() : null,
  });
  if (error) throw error;
  return data; // { matched: boolean, them?: string }
}
