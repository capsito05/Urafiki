import { useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { checkAnswer, hasAutoCorrection } from '../lib/scoring';

export interface HeadToHeadCategoryRow {
  category: string;
  winsA: number;
  winsB: number;
  draws: number;
}

export interface HeadToHeadResult {
  totalSessions: number;
  winsA: number;
  winsB: number;
  draws: number;
  byCategory: HeadToHeadCategoryRow[];
}

/**
 * Calcule le bilan "face à face" entre deux membres d'un même groupe, à
 * partir des sessions terminées où les deux ont répondu. Contrairement à
 * la table `stats` (qui compare chaque joueur au MEILLEUR des autres du
 * groupe), ceci compare exactement les deux joueurs choisis l'un à
 * l'autre — utile dans un groupe ami·e·s de 3 personnes ou plus, où
 * "qui gagne contre qui" n'est pas la même chose que "qui gagne contre
 * le groupe".
 */
export function useHeadToHead(coupleId: string | null) {
  const compute = useCallback(
    async (userA: string, userB: string): Promise<HeadToHeadResult | null> => {
      if (!coupleId || userA === userB) return null;

      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, category')
        .eq('couple_id', coupleId)
        .eq('status', 'terminee');
      if (!sessions || sessions.length === 0) {
        return { totalSessions: 0, winsA: 0, winsB: 0, draws: 0, byCategory: [] };
      }

      const sessionIds = sessions.map((s) => s.id);
      const sessionCategoryById = new Map(sessions.map((s) => [s.id, s.category as string]));

      const { data: items } = await supabase
        .from('session_items')
        .select('id, session_id, content:content_items(answer, type)')
        .in('session_id', sessionIds);
      if (!items || items.length === 0) {
        return { totalSessions: 0, winsA: 0, winsB: 0, draws: 0, byCategory: [] };
      }

      const itemIds = items.map((i: any) => i.id);
      const { data: answers } = await supabase
        .from('session_answers')
        .select('session_item_id, user_id, answer')
        .in('session_item_id', itemIds);

      const { data: variantRows } = await supabase.from('answer_variants').select('canonical_answer, variant');
      const variantsByCanonical = new Map<string, string[]>();
      for (const v of variantRows ?? []) {
        const key = (v.canonical_answer as string).toLowerCase().trim();
        variantsByCanonical.set(key, [...(variantsByCanonical.get(key) ?? []), v.variant as string]);
      }

      const answersByItem = new Map<string, Map<string, string>>();
      for (const a of answers ?? []) {
        if (!answersByItem.has(a.session_item_id)) answersByItem.set(a.session_item_id, new Map());
        answersByItem.get(a.session_item_id)!.set(a.user_id, a.answer);
      }

      const itemsBySession = new Map<string, typeof items>();
      for (const it of items as any[]) {
        if (!itemsBySession.has(it.session_id)) itemsBySession.set(it.session_id, []);
        (itemsBySession.get(it.session_id) as any[]).push(it);
      }

      let winsA = 0;
      let winsB = 0;
      let draws = 0;
      let totalSessions = 0;
      const byCategoryMap = new Map<string, HeadToHeadCategoryRow>();

      for (const sessionId of sessionIds) {
        const sessionItems = (itemsBySession.get(sessionId) ?? []) as any[];
        let scoreA = 0;
        let scoreB = 0;
        let gradable = 0;
        let participatesA = false;
        let participatesB = false;

        for (const it of sessionItems) {
          const content = it.content;
          if (!content || !hasAutoCorrection(content.answer)) continue;
          const itemAnswers = answersByItem.get(it.id);
          if (!itemAnswers) continue;
          const ansA = itemAnswers.get(userA);
          const ansB = itemAnswers.get(userB);
          if (ansA !== undefined) participatesA = true;
          if (ansB !== undefined) participatesB = true;
          if (ansA === undefined && ansB === undefined) continue;
          gradable += 1;
          const variants = variantsByCanonical.get((content.answer as string).toLowerCase().trim()) ?? [];
          if (ansA && checkAnswer(ansA, content.answer, content.type, variants)) scoreA += 1;
          if (ansB && checkAnswer(ansB, content.answer, content.type, variants)) scoreB += 1;
        }

        if (gradable === 0 || !participatesA || !participatesB) continue;

        totalSessions += 1;
        const category = sessionCategoryById.get(sessionId) ?? 'general';
        const catRow = byCategoryMap.get(category) ?? { category, winsA: 0, winsB: 0, draws: 0 };

        if (scoreA > scoreB) {
          winsA += 1;
          catRow.winsA += 1;
        } else if (scoreB > scoreA) {
          winsB += 1;
          catRow.winsB += 1;
        } else {
          draws += 1;
          catRow.draws += 1;
        }
        byCategoryMap.set(category, catRow);
      }

      return { totalSessions, winsA, winsB, draws, byCategory: Array.from(byCategoryMap.values()) };
    },
    [coupleId]
  );

  return { compute };
}
