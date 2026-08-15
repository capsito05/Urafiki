import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSession, type StartSessionParams } from '../hooks/useSession';
import { useRealtimeAnswers } from '../hooks/useRealtimeAnswers';
import { useCoupleMembers } from '../hooks/useCoupleMembers';
import { useAnswerVariants } from '../hooks/useAnswerVariants';
import { QuizCard } from '../components/QuizCard';
import { RevealAnswer } from '../components/RevealAnswer';
import { Timer } from '../components/Timer';
import { checkAnswer, hasAutoCorrection } from '../lib/scoring';
import type { Mode, SessionItem } from '../types';

interface SessionPageProps {
  userId: string;
  coupleId: string | null;
  mode: Mode;
}

type ReplayParams = Omit<StartSessionParams, 'userId' | 'coupleId' | 'mode'>;

export function SessionPage({ userId, coupleId, mode }: SessionPageProps) {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const replayParams = (location.state as { replayParams?: ReplayParams })?.replayParams;
  const { getSessionItems, endSession, startSession } = useSession();
  const { pseudos } = useCoupleMembers(coupleId);
  const { getVariants, addVariant } = useAnswerVariants();
  const [replaying, setReplaying] = useState(false);

  const [items, setItems] = useState<SessionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const [finished, setFinished] = useState(false);
  const [score, setScore] = useState({ correct: 0, gradable: 0, total: 0 });
  const [totalSeconds, setTotalSeconds] = useState(0);
  const scoredItemIds = useRef<Set<string>>(new Set());
  const questionStartRef = useRef(Date.now());

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    setCurrentIndex(0);
    setFinished(false);
    setScore({ correct: 0, gradable: 0, total: 0 });
    setTotalSeconds(0);
    scoredItemIds.current = new Set();
    getSessionItems(sessionId).then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, [sessionId, getSessionItems]);

  const currentItem = items[currentIndex];
  const { answers, revealed, submitAnswer } = useRealtimeAnswers(currentItem?.id ?? null);

  // Réinitialise l'état "timeout" et le chrono de la question à chaque nouvelle question
  useEffect(() => {
    setTimedOut(false);
    questionStartRef.current = Date.now();
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
        if (myAnswer && checkAnswer(myAnswer.answer, content.answer, content.type, getVariants(content.answer))) {
          next.correct += 1;
        }
      }
      return next;
    });
  }, [revealed, currentItem, answers, userId, getVariants]);

  const handleSubmit = (answer: string) => {
    if (currentItem?.content?.type === 'discussion') {
      // Pas de correction ni d'attente pour les échanges oraux : on avance directement.
      handleNext();
      return;
    }
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
    const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000);
    setTotalSeconds((t) => t + elapsed);
    if (currentIndex + 1 < items.length) {
      setCurrentIndex((i) => i + 1);
    } else if (sessionId) {
      await endSession(sessionId, userId, coupleId);
      setFinished(true);
    }
  };

  const handleQuit = () => navigate('/choix-mode');

  const handleReplay = async () => {
    if (!replayParams) {
      navigate('/accueil');
      return;
    }
    setReplaying(true);
    const session = await startSession({ userId, coupleId, mode, ...replayParams });
    setReplaying(false);
    if (session) {
      navigate(`/session/${session.id}`, { state: { replayParams }, replace: true });
    }
  };

  if (loading) return <p>Chargement...</p>;

  if (finished) {
    const percent = score.gradable > 0 ? Math.round((score.correct / score.gradable) * 100) : null;
    const minutes = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const formattedTime = minutes > 0 ? `${minutes} min ${secs.toString().padStart(2, '0')} s` : `${secs} s`;
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
        <p className="session-total-time">⏱ Temps total : {formattedTime}</p>
        <div className="results-actions">
          {replayParams && (
            <button disabled={replaying} onClick={handleReplay}>
              {replaying ? 'Préparation...' : '🔁 Rejouer'}
            </button>
          )}
          <button className="link" onClick={() => navigate('/accueil')}>Retour à l'accueil</button>
        </div>
      </div>
    );
  }

  if (!currentItem) return <p>Aucune question disponible.</p>;

  const myAnswer = answers.find((a) => a.user_id === userId);
  const isCorrect =
    revealed && currentItem.content && hasAutoCorrection(currentItem.content.answer) && myAnswer
      ? checkAnswer(
          myAnswer.answer,
          currentItem.content.answer,
          currentItem.content.type,
          getVariants(currentItem.content.answer)
        )
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
        <button className="session-quit-btn" onClick={handleQuit}>Quitter</button>
      </div>

      {currentItem.time_limit && currentItem.content?.type !== 'discussion' ? (
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
            knownVariants={getVariants(currentItem.content?.answer)}
            onValidateVariant={(variant) =>
              currentItem.content?.answer && addVariant(currentItem.content.answer, variant, userId)
            }
          />
          <button onClick={handleNext}>
            {currentIndex + 1 < items.length ? 'Question suivante' : 'Voir le résultat'}
          </button>
        </>
      )}
    </div>
  );
}
