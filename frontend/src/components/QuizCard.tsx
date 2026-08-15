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

  return (
    <div className="quiz-card">
      <div className="quiz-card-level">{content.level}</div>
      <p className="quiz-card-text">{content.text}</p>

      {content.type === 'qcm' && content.variants?.choix ? (
        <div className="quiz-card-choices">
          {content.variants.choix.map((choix) => (
            <button
              key={choix}
              disabled={disabled || submitted}
              onClick={() => handleSubmit(choix)}
            >
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

      {submitted && <p className="quiz-card-waiting">Réponse envoyée, en attente de l'autre joueur...</p>}
    </div>
  );
}
