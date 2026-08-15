import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { notifyLocal } from '../lib/notify';
import { useSession, type StartSessionParams } from './useSession';

export interface GameInvitation {
  id: string;
  couple_id: string;
  invited_by: string;
  invited_user: string;
  category: string;
  subcategory: string | null;
  level: string | null;
  count: number;
  time_per_item: number | null;
  status: 'proposee' | 'acceptee' | 'refusee';
  session_id: string | null;
  created_at: string;
}

/**
 * Gère les invitations à jouer entre membres d'un groupe (2.6) : réception en
 * temps réel des invitations reçues, et notification en temps réel à celui
 * qui a invité dès que l'invitation est acceptée (pour naviguer vers la
 * session créée par l'invité·e).
 */
export function useGameInvitations(userId: string | null, coupleId: string | null) {
  const [incoming, setIncoming] = useState<GameInvitation[]>([]);
  const [acceptedSentSessionId, setAcceptedSentSessionId] = useState<string | null>(null);
  const { startSession } = useSession();

  const fetchIncoming = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('game_invitations')
      .select('*')
      .eq('invited_user', userId)
      .eq('status', 'proposee')
      .order('created_at', { ascending: false });
    setIncoming((data ?? []) as GameInvitation[]);
  }, [userId]);

  useEffect(() => {
    fetchIncoming();
  }, [fetchIncoming]);

  useEffect(() => {
    if (!userId || !coupleId) return;
    const channel = supabase
      .channel(`invitations_${coupleId}_${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_invitations', filter: `invited_user=eq.${userId}` },
        (payload) => {
          setIncoming((prev) => [payload.new as GameInvitation, ...prev]);
          notifyLocal('Urafiki', 'Tu as reçu une invitation à jouer !');
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_invitations', filter: `invited_by=eq.${userId}` },
        (payload) => {
          const row = payload.new as GameInvitation;
          if (row.status === 'acceptee' && row.session_id) {
            setAcceptedSentSessionId(row.session_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, coupleId]);

  const sendInvitation = useCallback(
    async (params: Omit<StartSessionParams, 'userId' | 'coupleId' | 'mode'>, invitedUser: string) => {
      if (!userId || !coupleId) return { error: 'Groupe invalide.' };
      const { error } = await supabase.from('game_invitations').insert({
        couple_id: coupleId,
        invited_by: userId,
        invited_user: invitedUser,
        category: params.category,
        subcategory: params.subcategory ?? null,
        level: params.level ?? null,
        count: params.count,
        time_per_item: params.timePerItem ?? null,
      });
      if (error) return { error: "Impossible d'envoyer l'invitation." };
      return { error: null };
    },
    [userId, coupleId]
  );

  const respond = useCallback(
    async (invitation: GameInvitation, accept: boolean) => {
      if (!userId) return { session: null, error: 'Non connecté.' };
      if (!accept) {
        await supabase.from('game_invitations').update({ status: 'refusee' }).eq('id', invitation.id);
        setIncoming((prev) => prev.filter((i) => i.id !== invitation.id));
        return { session: null, error: null };
      }

      const { data: couple } = await supabase
        .from('couples')
        .select('mode')
        .eq('id', invitation.couple_id)
        .single();

      const session = await startSession({
        userId,
        coupleId: invitation.couple_id,
        mode: (couple?.mode as 'couple' | 'amis') ?? 'couple',
        category: invitation.category as any,
        subcategory: invitation.subcategory ?? undefined,
        level: (invitation.level ?? undefined) as any,
        count: invitation.count,
        timePerItem: invitation.time_per_item ?? undefined,
      });

      if (!session) return { session: null, error: 'Aucun contenu disponible pour cette invitation.' };

      await supabase
        .from('game_invitations')
        .update({ status: 'acceptee', session_id: session.id })
        .eq('id', invitation.id);

      setIncoming((prev) => prev.filter((i) => i.id !== invitation.id));
      return { session, error: null };
    },
    [userId, startSession]
  );

  return { incoming, acceptedSentSessionId, clearAcceptedSentSessionId: () => setAcceptedSentSessionId(null), sendInvitation, respond };
}
