/**
 * Notification locale (tant que l'app est ouverte/en arrière-plan), utilisée
 * pour "c'est ton tour", "ton/ta partenaire a répondu", "nouveau message" et
 * "invitation reçue". Ne fonctionne PAS app fermée : ça nécessiterait un
 * vrai envoi push serveur (voir usePushNotifications + résumé final).
 */
export function notifyLocal(title: string, body: string) {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  if (localStorage.getItem('urafiki_notifications_enabled') === 'false') return;
  if (document.visibilityState === 'visible') return; // pas besoin de notifier si l'app est déjà sous les yeux
  new Notification(title, { body, icon: '/icon-192.png' });
}
