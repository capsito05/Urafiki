import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export interface CoupleMember {
  user_id: string;
  pseudo: string;
}

/**
 * Liste des membres d'un groupe (couple ou ami·e·s) avec leur pseudo,
 * utilisée pour afficher les vrais noms (RevealAnswer, invitations,
 * gestion de groupe) au lieu de "Autre joueur".
 */
export function useCoupleMembers(coupleId: string | null) {
  const [members, setMembers] = useState<CoupleMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    if (!coupleId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('couple_members')
      .select('user_id, users(pseudo)')
      .eq('couple_id', coupleId);
    const rows = (data ?? []).map((r: any) => ({
      user_id: r.user_id as string,
      pseudo: (r.users?.pseudo as string) ?? 'Joueur',
    }));
    setMembers(rows);
    setLoading(false);
  }, [coupleId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const pseudos: Record<string, string> = Object.fromEntries(members.map((m) => [m.user_id, m.pseudo]));

  const removeMember = useCallback(
    async (userId: string) => {
      if (!coupleId) return { error: 'Groupe invalide.' };
      const { error } = await supabase
        .from('couple_members')
        .delete()
        .eq('couple_id', coupleId)
        .eq('user_id', userId);
      if (error) return { error: "Impossible de retirer ce membre." };
      await fetchMembers();
      return { error: null };
    },
    [coupleId, fetchMembers]
  );

  return { members, pseudos, loading, refetch: fetchMembers, removeMember };
}
