import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { useCoupleMembers } from '../hooks/useCoupleMembers';
import { useGameInvitations } from '../hooks/useGameInvitations';
import type { Category, Level, Mode } from '../types';

interface InviterProps {
  userId: string;
  coupleId: string;
  mode: Mode;
}

const STYLE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tous les styles' },
  { value: 'quiz', label: 'Quiz (QCM / vrai-faux)' },
  { value: 'reponse_libre', label: 'Réponse libre' },
  { value: 'enigme', label: 'Énigmes' },
  { value: 'tu_preferes', label: 'Tu préfères' },
  { value: 'discussion', label: 'Échange oral / discussion' },
  { value: 'defi', label: 'Défis / gages' },
];

const HOT_SUBCATEGORIES = new Set(['hot_questions', 'hot_defis']);

export function Inviter({ userId, coupleId, mode }: InviterProps) {
  const { category } = useParams<{ category: Category }>();
  const navigate = useNavigate();
  const { getSubcategories } = useSession();
  const { members } = useCoupleMembers(coupleId);
  const { sendInvitation, acceptedSentSessionId, clearAcceptedSentSessionId } = useGameInvitations(userId, coupleId);

  const others = members.filter((m) => m.user_id !== userId);

  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [subcategory, setSubcategory] = useState('');
  const [level, setLevel] = useState<Level | ''>('');
  const [style, setStyle] = useState('');
  const [hot, setHot] = useState(false);
  const [count, setCount] = useState(10);
  const [timePerItem, setTimePerItem] = useState(30);
  const [invitedUser, setInvitedUser] = useState<string>('');
  const [waitingFor, setWaitingFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visibleSubcategories = subcategories.filter((s) => HOT_SUBCATEGORIES.has(s) === hot);

  const toggleHot = (value: boolean) => {
    setHot(value);
    if (HOT_SUBCATEGORIES.has(subcategory) !== value) setSubcategory('');
  };

  useEffect(() => {
    if (category) getSubcategories(category).then(setSubcategories);
  }, [category, getSubcategories]);

  useEffect(() => {
    if (acceptedSentSessionId) {
      navigate(`/session/${acceptedSentSessionId}`);
      clearAcceptedSentSessionId();
    }
  }, [acceptedSentSessionId, navigate, clearAcceptedSentSessionId]);

  const handleInvite = async () => {
    if (!invitedUser) {
      setError('Choisis à qui envoyer l\'invitation.');
      return;
    }
    setError(null);
    const { error: sendError } = await sendInvitation(
      {
        category: category as Category,
        subcategory: subcategory || undefined,
        level: level || undefined,
        style: style || undefined,
        hot,
        count,
        timePerItem,
      },
      invitedUser
    );
    if (sendError) setError(sendError);
    else setWaitingFor(others.find((o) => o.user_id === invitedUser)?.pseudo ?? 'ton/ta partenaire');
  };

  if (waitingFor) {
    return (
      <div className="inviter-page">
        <h1>Invitation envoyée 📨</h1>
        <p>En attente que {waitingFor} accepte...</p>
      </div>
    );
  }

  return (
    <div className="inviter-page">
      <h1>Inviter à jouer</h1>
      <p className="hint">Vous êtes plusieurs dans ce groupe : choisis avec qui jouer avant de lancer la partie.</p>

      <label>
        Avec qui ?
        <select value={invitedUser} onChange={(e) => setInvitedUser(e.target.value)}>
          <option value="">Choisir...</option>
          {others.map((m) => (
            <option key={m.user_id} value={m.user_id}>{m.pseudo}</option>
          ))}
        </select>
      </label>

      {mode === 'couple' && (
        <label className="hot-toggle">
          <input type="checkbox" checked={hot} onChange={(e) => toggleHot(e.target.checked)} />
          🔥 Contenu hot (au lieu du contenu classique)
        </label>
      )}

      <label>
        Thème
        <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
          <option value="">Tous les thèmes</option>
          {visibleSubcategories.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>

      <label>
        Style de jeu
        <select value={style} onChange={(e) => setStyle(e.target.value)}>
          {STYLE_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </label>

      <label>
        Niveau
        <select value={level} onChange={(e) => setLevel(e.target.value as Level | '')}>
          <option value="">Tous</option>
          <option value="facile">Facile</option>
          <option value="moyen">Moyen</option>
          <option value="difficile">Difficile</option>
          <option value="impossible">Impossible 🔥</option>
        </select>
      </label>

      <label>
        Nombre de questions ({count})
        <input type="range" min={1} max={30} value={count} onChange={(e) => setCount(Number(e.target.value))} />
      </label>

      <label>
        Temps par question : {timePerItem}s
        <input type="range" min={10} max={180} step={10} value={timePerItem} onChange={(e) => setTimePerItem(Number(e.target.value))} />
      </label>

      <button onClick={handleInvite}>Inviter</button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
