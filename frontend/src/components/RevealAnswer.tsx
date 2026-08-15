import { checkAnswer, hasAutoCorrection } from '../lib/scoring';
import type { SessionAnswer } from '../types';

interface RevealAnswerProps {
  answers: SessionAnswer[];
  currentUserId: string;
  correctAnswer?: string | null;
  answerType?: string;
  pseudos: Record<string, string>;
}

export function RevealAnswer({ answers, currentUserId, correctAnswer, answerType, pseudos }: RevealAnswerProps) {
  const gradable = hasAutoCorrection(correctAnswer);

  return (
    <div className="reveal-answer">
      <h4>Réponses</h4>
      <ul>
        {answers.map((a) => {
          const displayAnswer = a.answer?.trim() ? a.answer : '⏱ Temps écoulu (pas de réponse)';
          const correct = gradable && a.answer ? checkAnswer(a.answer, correctAnswer, answerType ?? '') : null;
          return (
            <li key={a.id} className={a.user_id === currentUserId ? 'is-self' : ''}>
              <strong>{pseudos[a.user_id] ?? (a.user_id === currentUserId ? 'Toi' : 'Autre joueur')}</strong> :{' '}
              {displayAnswer} {correct !== null && (correct ? '✅' : '❌')}
            </li>
          );
        })}
      </ul>
      {correctAnswer && <p className="reveal-correct">Bonne réponse : {correctAnswer}</p>}
    </div>
  );
}
