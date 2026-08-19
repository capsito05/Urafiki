import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { checkAnswer, hasAutoCorrection } from '../lib/scoring';
import type { Category, ContentItem, GameSession, Mode, SessionItem } from '../types';

export interface StartSessionParams {
  userId: string;
  coupleId: string | null;
  mode: Mode;
  category: Category;
  subcategory?: string;
  level?: string;
  style?: string; // 'quiz' | 'reponse_libre' | 'enigme' | 'tu_preferes' | 'discussion' | 'defi'
  count: number; // 1 à 30
  timePerItem?: number; // secondes, optionnel
  hot?: boolean; // contenu "hot" réservé au mode Couple
}

/**
 * Sélectionne du contenu non vu récemment (rotation gérée côté serveur
 * via la fonction get_content_with_fallback, ce qui évite le bug de
 * répétition dû aux limites de longueur d'URL des requêtes client).
 */
export function useSession() {
  const [creating, setCreating] = useState(false);

  const startSession = useCallback(async (params: StartSessionParams): Promise<GameSession | null> => {
    setCreating(true);
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_content_with_fallback_v3', {
        p_category: params.category,
        p_subcategory: params.subcategory ?? null,
        p_level: params.level ?? null,
        p_mode: params.mode,
        p_couple_id: params.coupleId,
        p_user_id: params.coupleId ? null : params.userId,
        p_limit: params.count,
        p_style: params.style ?? null,
        p_hot: params.hot ?? false,
      });
      const candidates = rpcData as unknown as ContentItem[] | null;

      if (rpcError || !candidates || candidates.length === 0) {
        setCreating(false);
        return null;
      }

      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          mode: params.mode,
          couple_id: params.coupleId,
          created_by: params.userId,
          category: params.category,
          subcategory: params.subcategory ?? null,
          status: 'en_cours',
        })
        .select()
        .single();

      if (sessionError || !session) return null;

      const itemsToInsert = candidates.map((content, index) => ({
        session_id: session.id,
        content_id: content.id,
        order_index: index,
        time_limit: params.timePerItem ?? content.temps_suggere,
      }));

      await supabase.from('session_items').insert(itemsToInsert);

      const seenInserts = candidates.map((content) => ({
        couple_id: params.coupleId,
        user_id: params.coupleId ? null : params.userId,
        content_id: content.id,
      }));
      await supabase.from('content_seen').insert(seenInserts);

      return session as GameSession;
    } finally {
      setCreating(false);
    }
  }, []);

  const getSessionItems = useCallback(async (sessionId: string): Promise<SessionItem[]> => {
    const { data } = await supabase
      .from('session_items')
      .select('*, content:content_items(*)')
      .eq('session_id', sessionId)
      .order('order_index');
    return (data ?? []) as SessionItem[];
  }, []);

  /**
   * Termine la session ET enregistre les statistiques (victoire/défaite/nul
   * pour l'utilisateur courant). Avant ce correctif, rien n'écrivait jamais
   * dans la table "stats", donc l'onglet Statistiques restait vide.
   */
  const endSession = useCallback(async (sessionId: string, userId: string, coupleId: string | null) => {
    await supabase.from('sessions').update({ status: 'terminee', ended_at: new Date().toISOString() }).eq('id', sessionId);

    const { data: session } = await supabase.from('sessions').select('category').eq('id', sessionId).single();
    const category = session?.category as string | undefined;
    if (!category) return;

    const { data: items } = await supabase
      .from('session_items')
      .select('id, content:content_items(answer, type)')
      .eq('session_id', sessionId);

    const itemIds = (items ?? []).map((i: any) => i.id);
    const gradableItemIds = new Set(
      (items ?? []).filter((i: any) => hasAutoCorrection(i.content?.answer)).map((i: any) => i.id)
    );

    let result: 'victoire' | 'defaite' | 'nul' | null = null;

    if (gradableItemIds.size > 0 && itemIds.length > 0) {
      const { data: allAnswers } = await supabase
        .from('session_answers')
        .select('session_item_id, user_id, answer')
        .in('session_item_id', itemIds);

      const { data: variantRows } = await supabase.from('answer_variants').select('canonical_answer, variant');
      const variantsByCanonical = new Map<string, string[]>();
      for (const v of variantRows ?? []) {
        const key = (v.canonical_answer as string).toLowerCase().trim();
        variantsByCanonical.set(key, [...(variantsByCanonical.get(key) ?? []), v.variant as string]);
      }

      const contentById = new Map((items ?? []).map((i: any) => [i.id, i.content]));
      const scoreByUser = new Map<string, number>();
      for (const a of allAnswers ?? []) {
        if (!gradableItemIds.has(a.session_item_id)) continue;
        const content = contentById.get(a.session_item_id);
        const variants = content ? variantsByCanonical.get((content.answer as string).toLowerCase().trim()) ?? [] : [];
        const correct = content && checkAnswer(a.answer, content.answer, content.type, variants);
        scoreByUser.set(a.user_id, (scoreByUser.get(a.user_id) ?? 0) + (correct ? 1 : 0));
      }

      const myScore = scoreByUser.get(userId) ?? 0;
      if (coupleId) {
        const otherScores = Array.from(scoreByUser.entries())
          .filter(([uid]) => uid !== userId)
          .map(([, s]) => s);
        if (otherScores.length > 0) {
          const bestOther = Math.max(...otherScores);
          result = myScore > bestOther ? 'victoire' : myScore < bestOther ? 'defaite' : 'nul';
        }
      }
    }

    await supabase.rpc('record_session_stats', {
      p_user_id: userId,
      p_couple_id: coupleId,
      p_category: category,
      p_result: result,
    });
  }, []);

  const getSubcategories = useCallback(async (category: Category): Promise<string[]> => {
    const { data } = await supabase
      .from('content_subcategories')
      .select('subcategory')
      .eq('category', category);
    const unique = Array.from(new Set((data ?? []).map((d) => d.subcategory as string)));
    return unique.sort();
  }, []);

  return { creating, startSession, getSessionItems, endSession, getSubcategories };
}
