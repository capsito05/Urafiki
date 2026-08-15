import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { useRealtimeAnswers } from '../hooks/useRealtimeAnswers';
import { QuizCard } from '../components/QuizCard';
import { RevealAnswer } from '../components/RevealAnswer';
import { Timer } from '../components/Timer';
import { checkAnswer, hasAutoCorrection } from '../lib/scoring';
import type { SessionItem } from '../types';

interface SessionPageProps {
  userId: string;
  pseudos: Record<string, string>; // { userId: pseudo } des membres du couple
}

export function SessionPage({ userId, pseudos }: SessionPageProps) {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { getSessionItems, endSession } = useSession();

  const [items, setItems] = useState<SessionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState({ correct: 0, gradable: 0, total: 0 });
  const scoredItemIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!sessionId) return;
    getSessionItems(sessionId).then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, [sessionId, getSessionItems]);

  const currentItem = items[currentIndex];
  const { answers, revealed, submitAnswer } = useRealtimeAnswers(currentItem?.id ?? null);

  // Réinitialise l'état "timeout" à chaque nouvelle question
  useEffect(() => {
    setTimedOut(false);
  }, [currentItem?.id]);

  // Calcule le score une seule fois par question, dès que les réponses sont révélées
  useEffect(() => {
    if (!revealed || !currentItem || scoredItemIds.current.has(currentItem.id)) return;
    scoredItemIds.current.add(currentItem.id);

    const myAnswer = answers.find((a) => a.user_id === userId);
    const content = currentItem.content;
    if (!content) return;

    setScore((s) => {
      const next = { ...s, total: s.total + 1 };
      if (hasAutoCorrection(content.answer)) {
        next.gradable += 1;
        if (myAnswer && checkAnswer(myAnswer.answer, content.answer, content.type)) {
          next.correct += 1;
        }
      }
      return next;
    });
  }, [revealed, currentItem, answers, userId]);

  const handleSubmit = (answer: string) => {
    submitAnswer(userId, answer);
  };

  const handleTimeout = useCallback(() => {
    setTimedOut(true);
    const alreadyAnswered = answers.some((a) => a.user_id === userId);
    if (!alreadyAnswered) {
      submitAnswer(userId, '');
    }
  }, [answers, userId, submitAnswer]);

  const handleNext = async () => {
    if (currentIndex + 1 < items.length) {
      setCurrentIndex((i) => i + 1);
    } else if (sessionId) {
      await endSession(sessionId);
      setFinished(true);
    }
  };

  if (loading) return <p>Chargement...</p>;

  if (finished) {
    const percent = score.gradable > 0 ? Math.round((score.correct / score.gradable) * 100) : null;
    return (
      <div className="session-page results-screen">
        <h1>Terminé ! 🎉</h1>
        {percent !== null ? (
          <>
            <div className="results-score">
              {score.correct} / {score.gradable}
            </div>
            <p>{percent}% de bonnes réponses</p>
          </>
        ) : (
          <p>Session terminée — ce thème n'a pas de "bonnes réponses" à noter, c'était pour discuter et se découvrir !</p>
        )}
        <p className="hint">{items.length} question(s) au total.</p>
        <button onClick={() => navigate('/accueil')}>Retour à l'accueil</button>
      </div>
    );
  }

  if (!currentItem) return <p>Aucune question disponible.</p>;

  const myAnswer = answers.find((a) => a.user_id === userId);
  const isCorrect =
    revealed && currentItem.content && hasAutoCorrection(currentItem.content.answer) && myAnswer
      ? checkAnswer(myAnswer.answer, currentItem.content.answer, currentItem.content.type)
      : null;

  return (
    <div className="session-page">
      <div className="session-header">
        <div className="session-progress">
          Question {currentIndex + 1} / {items.length}
        </div>
        {score.gradable > 0 && (
          <div className="session-score">
            {score.correct} / {score.gradable} pts
          </div>
        )}
      </div>

      {currentItem.time_limit ? (
        <Timer key={currentItem.id} seconds={currentItem.time_limit} onExpire={handleTimeout} />
      ) : null}

      {currentItem.content && (
        <QuizCard
          key={currentItem.id}
          content={currentItem.content}
          onSubmit={handleSubmit}
          disabled={revealed || timedOut}
        />
      )}

      {revealed && (
        <>
          {isCorrect !== null && (
            <div className={`answer-verdict ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
              {isCorrect ? '✅ Bonne réponse !' : '❌ Mauvaise réponse'}
            </div>
          )}
          <RevealAnswer
            answers={answers}
            currentUserId={userId}
            correctAnswer={currentItem.content?.answer}
            answerType={currentItem.content?.type}
            pseudos={pseudos}
          />
          <button onClick={handleNext}>
            {currentIndex + 1 < items.length ? 'Question suivante' : 'Voir le résultat'}
          </button>
        </>
      )}
    </div>
  );
}
