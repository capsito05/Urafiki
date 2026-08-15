import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { notifyLocal } from '../lib/notify';
import type { SessionAnswer, SessionItem } from '../types';

/**
 * Écoute en temps réel les réponses d'un session_item donné.
 * Le champ `revealed` de session_items passe à true automatiquement
 * côté base (trigger check_and_reveal) quand tous les joueurs ont répondu.
 */
export function useRealtimeAnswers(sessionItemId: string | null, currentUserId?: string) {
  const [answers, setAnswers] = useState<SessionAnswer[]>([]);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!sessionItemId) return;

    let active = true;

    const fetchInitial = async () => {
      const { data: item } = await supabase
        .from('session_items')
        .select('revealed')
        .eq('id', sessionItemId)
        .single<Pick<SessionItem, 'revealed'>>();
      if (active && item) setRevealed(item.revealed);

      const { data: existingAnswers } = await supabase
        .from('session_answers')
        .select('*')
        .eq('session_item_id', sessionItemId);
      if (active && existingAnswers) setAnswers(existingAnswers as SessionAnswer[]);
    };

    fetchInitial();

    const channel = supabase
      .channel(`session_item_${sessionItemId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_answers', filter: `session_item_id=eq.${sessionItemId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newAnswer = payload.new as SessionAnswer;
            setAnswers((prev) => [...prev, newAnswer]);
            if (currentUserId && newAnswer.user_id !== currentUserId) {
              notifyLocal('Urafiki', 'Ton/ta partenaire a répondu !');
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'session_items', filter: `id=eq.${sessionItemId}` },
        (payload) => {
          setRevealed((payload.new as SessionItem).revealed);
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [sessionItemId, currentUserId]);

  const submitAnswer = async (userId: string, answer: string, timeSpent?: number) => {
    if (!sessionItemId) return;
    await supabase.from('session_answers').insert({
      session_item_id: sessionItemId,
      user_id: userId,
      answer,
      time_spent: timeSpent ?? null,
    });
  };

  return { answers, revealed, submitAnswer };
}
