import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import type { Category, Level, Mode } from '../types';

interface CategorieProps {
  userId: string;
  coupleId: string | null;
  mode: Mode;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'Général',
  jeux_ensemble: 'Jeux ensemble',
  mieux_connaitre: 'Pour mieux se connaître',
  manga: 'Manga / Anime',
};

const SUBCATEGORY_LABELS: Record<string, string> = {
  histoire: 'Histoire',
  geographie: 'Géographie',
  sciences: 'Sciences',
  sport: 'Sport',
  musique: 'Musique',
  arts: 'Arts',
  insolite: 'Insolite',
  pop_culture: 'Pop culture',
  cinema: 'Cinéma',
  litterature: 'Littérature',
  gastronomie: 'Gastronomie',
  philosophie: 'Philosophie',
  politique_lois: 'Politique & lois',
  souvenirs: 'Souvenirs',
  tu_preferes: 'Tu préfères',
  qui_de_nous_deux: 'Qui de nous deux',
  farfelues: 'Farfelues',
  defis_gages: 'Défis / gages',
  enigmes: 'Énigmes',
  existentiel_jeu: 'Existentiel',
  petits_jeux_cooperatifs: 'Jeux coopératifs',
  petits_jeux_competitifs: 'Jeux compétitifs',
  questions_souvenir: 'Questions souvenir',
  enfance: 'Enfance',
  reves: 'Rêves',
  peurs: 'Peurs',
  valeurs: 'Valeurs',
  amour: 'Amour',
  amitie: 'Amitié',
  futur: 'Futur',
  quotidien: 'Quotidien',
  famille: 'Famille',
  qui_est_ce: 'Qui est-ce ?',
  hot_questions: 'Questions 🔥',
  hot_defis: 'Défis 🔥',
};

const HOT_SUBCATEGORIES = new Set(['hot_questions', 'hot_defis']);

const STYLE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tous les styles' },
  { value: 'quiz', label: 'Quiz (QCM / vrai-faux)' },
  { value: 'reponse_libre', label: 'Réponse libre' },
  { value: 'enigme', label: 'Énigmes' },
  { value: 'tu_preferes', label: 'Tu préfères' },
  { value: 'discussion', label: 'Échange oral / discussion' },
  { value: 'defi', label: 'Défis / gages' },
];

export function Categorie({ userId, coupleId, mode }: CategorieProps) {
  const { category } = useParams<{ category: Category }>();
  const navigate = useNavigate();
  const { startSession, creating, getSubcategories } = useSession();

  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [subcategory, setSubcategory] = useState<string>('');
  const [level, setLevel] = useState<Level | ''>('');
  const [style, setStyle] = useState<string>('');
  const [count, setCount] = useState(10);
  const [useTimer, setUseTimer] = useState(true);
  const [timePerItem, setTimePerItem] = useState(30);
  const [hot, setHot] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (category) {
      getSubcategories(category).then(setSubcategories);
    }
  }, [category, getSubcategories]);

  const visibleSubcategories = subcategories.filter((s) => HOT_SUBCATEGORIES.has(s) === hot);

  const toggleHot = (value: boolean) => {
    setHot(value);
    if (HOT_SUBCATEGORIES.has(subcategory) !== value) setSubcategory('');
  };

  const handleStart = async () => {
    setError(null);
    const session = await startSession({
      userId,
      coupleId,
      mode,
      category: category as Category,
      subcategory: subcategory || undefined,
      level: level || undefined,
      style: style || undefined,
      count,
      timePerItem: useTimer ? timePerItem : undefined,
      hot,
    });
    if (session) {
      navigate(`/session/${session.id}`, {
        state: {
          replayParams: {
            category: category as Category,
            subcategory: subcategory || undefined,
            level: level || undefined,
            style: style || undefined,
            count,
            timePerItem: useTimer ? timePerItem : undefined,
            hot,
          },
        },
      });
    } else {
      setError("Aucun contenu disponible pour cette sélection. Essaie d'élargir les filtres (thème, niveau ou style).");
    }
  };

  return (
    <div className="categorie-config">
      <h1>{category ? (CATEGORY_LABELS[category] ?? category) : ''}</h1>

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
          {visibleSubcategories.map((s) => (
            <option key={s} value={s}>
              {SUBCATEGORY_LABELS[s] ?? s}
            </option>
          ))}
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
        <input type="checkbox" checked={useTimer} onChange={(e) => setUseTimer(e.target.checked)} />
        Timer par question
      </label>

      {useTimer && (
        <label>
          Temps par question : {timePerItem}s
          <input
            type="range"
            min={10}
            max={180}
            step={10}
            value={timePerItem}
            onChange={(e) => setTimePerItem(Number(e.target.value))}
          />
        </label>
      )}

      <button disabled={creating} onClick={handleStart}>
        {creating ? 'Préparation...' : 'Commencer'}
      </button>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
