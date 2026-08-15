import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Abonne l'utilisateur aux notifications push navigateur et enregistre
 * l'abonnement dans push_subscriptions. Ne fait rien si la permission
 * n'a pas déjà été accordée (demandée depuis la page Réglages) ou si
 * VITE_VAPID_PUBLIC_KEY n'est pas configurée côté build.
 *
 * IMPORTANT : ceci ne couvre que l'ABONNEMENT côté client. L'envoi
 * effectif d'une notification quand l'app est fermée nécessite un
 * composant serveur (ex: Supabase Edge Function déclenchée par un
 * webhook sur INSERT de messages/session_answers/game_invitations,
 * utilisant web-push avec la clé privée VAPID) qui n'est pas fourni ici.
 */
export function usePushNotifications(userId: string | null) {
  useEffect(() => {
    if (!userId) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!VAPID_PUBLIC_KEY) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    let active = true;

    const subscribe = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }

        if (!active) return;

        const keys = subscription.toJSON().keys;
        if (!keys || !keys.p256dh || !keys.auth) return;

        await supabase.from('push_subscriptions').upsert(
          {
            user_id: userId,
            endpoint: subscription.endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
          },
          { onConflict: 'endpoint' }
        );
      } catch (err) {
        console.error('Push subscription failed', err);
      }
    };

    subscribe();

    return () => {
      active = false;
    };
  }, [userId]);
}
