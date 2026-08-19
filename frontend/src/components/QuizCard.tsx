import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { ContentItem } from '../types';

interface QuizCardProps {
  content: ContentItem;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
  userId?: string;
}

export function QuizCard({ content, onSubmit, disabled, userId }: QuizCardProps) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isFavori, setIsFavori] = useState(false);
  const [favoriBusy, setFavoriBusy] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('favoris')
      .select('id')
      .eq('user_id', userId)
      .eq('content_id', content.id)
      .maybeSingle()
      .then(({ data }) => setIsFavori(!!data));
  }, [userId, content.id]);

  const toggleFavori = async () => {
    if (!userId || favoriBusy) return;
    setFavoriBusy(true);
    if (isFavori) {
      await supabase.from('favoris').delete().eq('user_id', userId).eq('content_id', content.id);
      setIsFavori(false);
    } else {
      await supabase.from('favoris').insert({ user_id: userId, content_id: content.id });
      setIsFavori(true);
    }
    setFavoriBusy(false);
  };

  const handleSubmit = (value: string) => {
    setSubmitted(true);
    onSubmit(value);
  };

  const isChoiceType = content.type === 'qcm' || content.type === 'tu_preferes';

  return (
    <div className="quiz-card">
      <div className="quiz-card-header">
        <div className="quiz-card-level">{content.level}</div>
        {userId && (
          <button
            className="favori-toggle"
            disabled={favoriBusy}
            onClick={toggleFavori}
            aria-label={isFavori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            {isFavori ? '⭐' : '☆'}
          </button>
        )}
      </div>
      <p className="quiz-card-text">{content.text}</p>

      {content.content_type === 'defi' ? (
        <div className="quiz-card-defi-actions">
          <button className="is-fait" disabled={disabled || submitted} onClick={() => handleSubmit('Fait')}>
            ✅ Fait
          </button>
          <button className="is-pas-fait" disabled={disabled || submitted} onClick={() => handleSubmit('Pas fait')}>
            ❌ Pas fait
          </button>
        </div>
      ) : content.type === 'discussion' ? (
        <div className="quiz-card-discussion">
          <button disabled={disabled || submitted} onClick={() => handleSubmit('discute')}>
            Discuté, suivant →
          </button>
        </div>
      ) : isChoiceType && content.variants?.choix ? (
        <div className="quiz-card-choices">
          {content.variants.choix.map((choix) => (
            <button key={choix} disabled={disabled || submitted} onClick={() => handleSubmit(choix)}>
              {choix}
            </button>
          ))}
        </div>
      ) : content.type === 'vrai_faux' ? (
        <div className="quiz-card-choices">
          <button disabled={disabled || submitted} onClick={() => handleSubmit('Vrai')}>Vrai</button>
          <button disabled={disabled || submitted} onClick={() => handleSubmit('Faux')}>Faux</button>
        </div>
      ) : (
        <div className="quiz-card-freeform">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={disabled || submitted}
            placeholder="Ta réponse..."
          />
          <button disabled={disabled || submitted || !answer.trim()} onClick={() => handleSubmit(answer)}>
            Valider
          </button>
        </div>
      )}

      {submitted && content.type !== 'discussion' && (
        <p className="quiz-card-waiting">Réponse envoyée, en attente de l'autre joueur...</p>
      )}
    </div>
  );
}
