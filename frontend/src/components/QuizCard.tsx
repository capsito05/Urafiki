import { useState } from 'react';
import type { ContentItem } from '../types';

interface QuizCardProps {
  content: ContentItem;
  onSubmit: (answer: string) => void;
  disabled?: boolean;
}

export function QuizCard({ content, onSubmit, disabled }: QuizCardProps) {
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (value: string) => {
    setSubmitted(true);
    onSubmit(value);
  };

  const isChoiceType = content.type === 'qcm' || content.type === 'tu_preferes';

  return (
    <div className="quiz-card">
      <div className="quiz-card-level">{content.level}</div>
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
