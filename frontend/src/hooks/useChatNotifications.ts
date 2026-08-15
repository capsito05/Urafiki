import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { notifyLocal } from '../lib/notify';
import type { ChatMessage } from '../types';

/**
 * Notifie "Nouveau message dans le chat" même quand on n'est pas sur la
 * page Chat (ChatWindow a sa propre écoute réservée à l'affichage des
 * messages pendant qu'on y est).
 */
export function useChatNotifications(userId: string | null, coupleId: string | null) {
  useEffect(() => {
    if (!userId || !coupleId) return;
    const channel = supabase
      .channel(`chat_notify_${coupleId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `couple_id=eq.${coupleId}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          if (msg.sender_id !== userId) {
            notifyLocal('Nouveau message', msg.content);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, coupleId]);
}
