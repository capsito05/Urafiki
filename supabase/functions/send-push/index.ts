// Supabase Edge Function : envoie une notification push web à tous les
// appareils enregistrés d'un utilisateur (table push_subscriptions).
//
// Appelée par les triggers Postgres définis dans migration_v3_push.sql
// (via l'extension pg_net) à chaque nouveau message de chat, réponse de
// partenaire, ou invitation à jouer.
//
// Secrets requis (supabase secrets set ...) : VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY, VAPID_SUBJECT, PUSH_TRIGGER_SECRET.
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont injectés automatiquement
// par la plateforme, pas besoin de les définir.

import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:contact@example.com';
const TRIGGER_SECRET = Deno.env.get('PUSH_TRIGGER_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

interface PushRequestBody {
  user_id: string;
  title: string;
  body: string;
  url?: string;
}

async function deleteSubscription(endpoint: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
    method: 'DELETE',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.headers.get('x-trigger-secret') !== TRIGGER_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response('VAPID keys not configured', { status: 500 });
  }

  let payload: PushRequestBody;
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  if (!payload.user_id || !payload.title) {
    return new Response('Missing user_id or title', { status: 400 });
  }

  const subsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${payload.user_id}&select=endpoint,p256dh,auth`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    }
  );
  const subs: { endpoint: string; p256dh: string; auth: string }[] = await subsRes.json();

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/accueil',
  });

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          notificationPayload
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await deleteSubscription(sub.endpoint);
        }
        throw err;
      }
    })
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  return new Response(JSON.stringify({ sent, total: subs.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
