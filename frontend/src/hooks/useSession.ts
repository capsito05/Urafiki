import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Category, ContentItem, GameSession, Mode, SessionItem } from '../types';

interface StartSessionParams {
  userId: string;
  coupleId: string | null;
  mode: Mode;
  category: Category;
  subcategory?: string;
  level?: string;
  count: number; // 1 à 30
  timePerItem?: number; // secondes, optionnel
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
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_content_with_fallback', {
        p_category: params.category,
        p_subcategory: params.subcategory ?? null,
        p_level: params.level ?? null,
        p_mode: params.mode,
        p_couple_id: params.coupleId,
        p_user_id: params.coupleId ? null : params.userId,
        p_limit: params.count,
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

  const endSession = useCallback(async (sessionId: string) => {
    await supabase.from('sessions').update({ status: 'terminee', ended_at: new Date().toISOString() }).eq('id', sessionId);
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
