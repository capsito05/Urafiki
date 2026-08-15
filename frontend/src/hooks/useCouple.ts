import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Couple, Mode } from '../types';

const ACTIVE_GROUP_KEY = 'urafiki_active_group_id';

export function useCouple(userId: string | null) {
  const [groups, setGroups] = useState<Couple[]>([]);
  const [activeId, setActiveId] = useState<string | null>(() => localStorage.getItem(ACTIVE_GROUP_KEY));
  const [loading, setLoading] = useState(true);

  const fetchCouple = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('couple_members')
      .select('couple_id, couples(*)')
      .eq('user_id', userId);
    const all = (data ?? []).map((d) => d.couples as unknown as Couple).filter(Boolean);
    setGroups(all);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchCouple();
  }, [fetchCouple]);

  // Le groupe actif : celui choisi manuellement (sauvegardé en local) s'il existe
  // toujours parmi les groupes de l'utilisateur, sinon le premier disponible.
  const couple = useMemo<Couple | null>(() => {
    if (groups.length === 0) return null;
    return groups.find((g) => g.id === activeId) ?? groups[0];
  }, [groups, activeId]);

  const setActiveGroup = useCallback((coupleId: string) => {
    localStorage.setItem(ACTIVE_GROUP_KEY, coupleId);
    setActiveId(coupleId);
  }, []);

  /**
   * Crée un groupe. Le nom doit être unique (l'app affiche une erreur
   * claire si le nom est déjà pris). Retourne { couple, error }.
   */
  const createCouple = async (
    mode: Mode,
    nom: string
  ): Promise<{ couple: Couple | null; error: string | null }> => {
    if (!userId || mode === 'solo') return { couple: null, error: 'Mode invalide.' };
    const trimmedNom = nom.trim();
    if (!trimmedNom) return { couple: null, error: 'Le nom du groupe est obligatoire.' };

    const { data: newCouple, error } = await supabase
      .from('couples')
      .insert({ mode, nom: trimmedNom, created_by: userId })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { couple: null, error: 'Ce nom de groupe est déjà pris, choisis-en un autre.' };
      }
      return { couple: null, error: "Impossible de créer le groupe. Réessaie." };
    }
    if (!newCouple) return { couple: null, error: 'Erreur inconnue.' };

    const { error: memberError } = await supabase
      .from('couple_members')
      .insert({ couple_id: newCouple.id, user_id: userId });

    if (memberError) {
      if (memberError.message?.includes('AGE_RESTRICTED')) {
        // Le groupe a été créé mais on ne peut pas y adhérer : on le supprime pour ne pas laisser de trace orpheline.
        await supabase.from('couples').delete().eq('id', newCouple.id);
        return { couple: null, error: 'Le mode Couple est réservé aux personnes de 20 ans et plus.' };
      }
      return { couple: null, error: "Impossible de rejoindre le groupe créé. Réessaie." };
    }

    await fetchCouple();
    setActiveGroup(newCouple.id);
    return { couple: newCouple as Couple, error: null };
  };

  const joinCouple = async (inviteCode: string): Promise<{ couple: Couple | null; error: string | null }> => {
    if (!userId) return { couple: null, error: 'Non connecté.' };
    const { data: targetCouple } = await supabase
      .from('couples')
      .select('*')
      .eq('invite_code', inviteCode.trim())
      .maybeSingle();
    if (!targetCouple) return { couple: null, error: 'Code invalide.' };

    const { error: memberError } = await supabase
      .from('couple_members')
      .insert({ couple_id: targetCouple.id, user_id: userId });

    if (memberError) {
      if (memberError.message?.includes('AGE_RESTRICTED')) {
        return { couple: null, error: 'Le mode Couple est réservé aux personnes de 20 ans et plus.' };
      }
      if (memberError.code === '23505') {
        return { couple: null, error: 'Tu es déjà membre de ce groupe.' };
      }
      return { couple: null, error: 'Impossible de rejoindre ce groupe.' };
    }

    await fetchCouple();
    setActiveGroup(targetCouple.id);
    return { couple: targetCouple as Couple, error: null };
  };

  return { couple, groups, loading, createCouple, joinCouple, setActiveGroup, refetch: fetchCouple };
}
