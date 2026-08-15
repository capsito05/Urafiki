import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { checkAnswer, hasAutoCorrection } from '../lib/scoring';
import type { ContentItem } from '../types';

interface DefiDuJourProps {
  userId: string;
}

export function DefiDuJour({ userId }: DefiDuJourProps) {
  const navigate = useNavigate();
  const [content, setContent] = useState<ContentItem | null>(null);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [streak, setStreak] = useState(0);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState<'correct' | 'wrong' | 'done' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: completion } = await supabase
        .from('daily_challenge_completions')
        .select('streak_count, challenge_date')
        .eq('user_id', userId)
        .order('challenge_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (completion?.challenge_date === today) {
        setAlreadyDone(true);
        setStreak(completion.streak_count);
      } else if (completion) {
        setStreak(completion.streak_count);
      }

      const { data: challenge } = await supabase.rpc('get_daily_challenge');
      setContent(((challenge as ContentItem[]) ?? [])[0] ?? null);
      setLoading(false);
    })();
  }, [userId]);

  const handleComplete = async (givenAnswer?: string) => {
    if (!content) return;
    if (hasAutoCorrection(content.answer) && givenAnswer !== undefined) {
      setResult(checkAnswer(givenAnswer, content.answer, content.type) ? 'correct' : 'wrong');
    } else {
      setResult('done');
    }
    const { data: newStreak } = await supabase.rpc('complete_daily_challenge', {
      p_user_id: userId,
      p_content_id: content.id,
    });
    if (typeof newStreak === 'number') setStreak(newStreak);
    setAlreadyDone(true);
  };

  if (loading) return <p>Chargement...</p>;
  if (!content) return <p>Aucun défi disponible aujourd'hui.</p>;

  return (
    <div className="defi-du-jour-page">
      <h1>🔥 Défi du jour</h1>
      {streak > 0 && <p className="streak-badge">🔥 {streak} jour{streak > 1 ? 's' : ''} d'affilée</p>}

      <div className="quiz-card">
        <p className="quiz-card-text">{content.text}</p>

        {alreadyDone ? (
          <p className="hint">
            {result === 'correct' && '✅ Bonne réponse ! '}
            {result === 'wrong' && `❌ Pas tout à fait. Réponse : ${content.answer} `}
            Reviens demain pour continuer ta série !
          </p>
        ) : hasAutoCorrection(content.answer) ? (
          <div className="quiz-card-freeform">
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Ta réponse..." />
            <button disabled={!answer.trim()} onClick={() => handleComplete(answer)}>Valider</button>
          </div>
        ) : (
          <button onClick={() => handleComplete()}>Fait, valider mon défi du jour</button>
        )}
      </div>

      <button className="link" onClick={() => navigate('/accueil')}>Retour à l'accueil</button>
    </div>
  );
}
