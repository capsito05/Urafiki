import { useState } from 'react';
import { checkAnswer, hasAutoCorrection } from '../lib/scoring';
import type { SessionAnswer } from '../types';

interface RevealAnswerProps {
  answers: SessionAnswer[];
  currentUserId: string;
  correctAnswer?: string | null;
  answerType?: string;
  pseudos: Record<string, string>;
  knownVariants?: string[];
  onValidateVariant?: (variant: string) => void;
}

export function RevealAnswer({
  answers,
  currentUserId,
  correctAnswer,
  answerType,
  pseudos,
  knownVariants = [],
  onValidateVariant,
}: RevealAnswerProps) {
  const gradable = hasAutoCorrection(correctAnswer);
  const [validated, setValidated] = useState<Set<string>>(new Set());

  return (
    <div className="reveal-answer">
      <h4>Réponses</h4>
      <ul>
        {answers.map((a) => {
          const displayAnswer = a.answer?.trim() ? a.answer : '⏱ Temps écoulu (pas de réponse)';
          const correct =
            gradable && a.answer ? checkAnswer(a.answer, correctAnswer, answerType ?? '', knownVariants) : null;
          const canProposeVariant =
            gradable &&
            correct === false &&
            answerType !== 'qcm' &&
            answerType !== 'vrai_faux' &&
            a.answer?.trim() &&
            onValidateVariant;
          return (
            <li key={a.id} className={a.user_id === currentUserId ? 'is-self' : ''}>
              <strong>{pseudos[a.user_id] ?? (a.user_id === currentUserId ? 'Toi' : 'Autre joueur')}</strong> :{' '}
              {displayAnswer} {correct !== null && (correct ? '✅' : '❌')}
              {canProposeVariant && (
                <label className="variant-checkbox">
                  <input
                    type="checkbox"
                    checked={validated.has(a.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onValidateVariant!(a.answer);
                        setValidated((prev) => new Set(prev).add(a.id));
                      }
                    }}
                  />
                  Autoriser comme bonne réponse
                </label>
              )}
            </li>
          );
        })}
      </ul>
      {correctAnswer && <p className="reveal-correct">Bonne réponse : {correctAnswer}</p>}
    </div>
  );
}
