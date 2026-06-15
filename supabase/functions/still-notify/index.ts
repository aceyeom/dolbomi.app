// STILL. — still-notify edge function.
//
// Drains the `still_notifications` queue and sends each pending row as an email
// via Resend, then stamps `sent_at`. It is *idempotent by queue*: it only ever
// touches rows where sent_at is null, so it can be safely invoked by either a
// Supabase Database Webhook (on insert to still_notifications) or pg_cron.
//
// Required secrets (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY    — your Resend API key
//   STILL_FROM_EMAIL  — verified sender, e.g. "STILL. <hello@dolbomi.app>"
// Provided automatically by the platform:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:  supabase functions deploy still-notify
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM = Deno.env.get('STILL_FROM_EMAIL') ?? 'STILL. <onboarding@resend.dev>';
const SITE = Deno.env.get('STILL_SITE_URL') ?? 'https://dolbomi.app';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

function emailHtml(self: string, other: string) {
  return `
  <div style="background:#0b0708;padding:40px 24px;font-family:Georgia,serif;color:#f5e9ec;text-align:center">
    <div style="font-size:18px;letter-spacing:6px;color:#f2a7b6">STILL<span style="color:#e8546f">.</span></div>
    <p style="font-style:italic;color:#b79aa3;margin:28px 0 6px;font-size:15px">it&rsquo;s mutual.</p>
    <h1 style="font-weight:400;font-size:30px;line-height:1.2;margin:0">
      @${other}<br/>still thinks <em style="color:#f2a7b6">about you.</em>
    </h1>
    <p style="color:#b79aa3;font-size:15px;margin:22px 0 28px">
      You entered them. They entered you back. You both know now.
    </p>
    <a href="${SITE}" style="display:inline-block;background:#e8546f;color:#fff;text-decoration:none;
       padding:13px 26px;border-radius:12px;font-family:Inter,Arial,sans-serif;font-size:15px">open STILL.</a>
    <p style="color:#6f5860;font-size:11px;margin-top:32px;font-family:Inter,Arial,sans-serif">
      You got this because you entered an @ on STILL. and it was mutual. We never reveal one-sided entries.
    </p>
  </div>`;
}

async function sendEmail(to: string, self: string, other: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to,
      subject: `it's mutual — @${other} still thinks about you`,
      html: emailHtml(self, other),
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
}

Deno.serve(async () => {
  const { data: pending, error } = await supabase
    .from('still_notifications')
    .select('id, to_email, self_handle, other_handle')
    .is('sent_at', null)
    .limit(100);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;
  const failed: string[] = [];
  for (const n of pending ?? []) {
    try {
      await sendEmail(n.to_email, n.self_handle, n.other_handle);
      await supabase.from('still_notifications').update({ sent_at: new Date().toISOString() }).eq('id', n.id);
      sent++;
    } catch (e) {
      console.error('send failed', n.id, e);
      failed.push(n.id);
    }
  }

  return new Response(JSON.stringify({ sent, failed }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
