import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function normKey(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

/**
 * Charge une fois toutes les réponses alternatives validées par les joueurs
 * (table answer_variants) et les indexe par réponse canonique normalisée,
 * pour qu'elles s'appliquent à TOUTE question qui partage la même bonne
 * réponse exacte, partout dans l'application (2.4).
 */
export function useAnswerVariants() {
  const [byCanonical, setByCanonical] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('answer_variants').select('canonical_answer, variant');
    const grouped: Record<string, string[]> = {};
    for (const row of data ?? []) {
      const key = normKey(row.canonical_answer as string);
      (grouped[key] ??= []).push(row.variant as string);
    }
    setByCanonical(grouped);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const getVariants = useCallback(
    (correctAnswer: string | null | undefined): string[] => {
      if (!correctAnswer) return [];
      return byCanonical[normKey(correctAnswer)] ?? [];
    },
    [byCanonical]
  );

  const addVariant = useCallback(
    async (canonicalAnswer: string, variant: string, userId: string) => {
      const { error } = await supabase.from('answer_variants').insert({
        canonical_answer: canonicalAnswer,
        variant,
        created_by: userId,
      });
      if (!error) {
        const key = normKey(canonicalAnswer);
        setByCanonical((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), variant] }));
      }
      return { error };
    },
    []
  );

  return { getVariants, addVariant, loading };
}
