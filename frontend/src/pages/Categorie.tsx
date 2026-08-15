import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import type { Category, Level, Mode } from '../types';

interface CategorieProps {
  userId: string;
  coupleId: string | null;
  mode: Mode;
}

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
};

export function Categorie({ userId, coupleId, mode }: CategorieProps) {
  const { category } = useParams<{ category: Category }>();
  const navigate = useNavigate();
  const { startSession, creating, getSubcategories } = useSession();

  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [subcategory, setSubcategory] = useState<string>('');
  const [level, setLevel] = useState<Level | ''>('');
  const [count, setCount] = useState(10);
  const [useTimer, setUseTimer] = useState(true);
  const [timePerItem, setTimePerItem] = useState(30);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (category) {
      getSubcategories(category).then(setSubcategories);
    }
  }, [category, getSubcategories]);

  const handleStart = async () => {
    setError(null);
    const session = await startSession({
      userId,
      coupleId,
      mode,
      category: category as Category,
      subcategory: subcategory || undefined,
      level: level || undefined,
      count,
      timePerItem: useTimer ? timePerItem : undefined,
    });
    if (session) {
      navigate(`/session/${session.id}`);
    } else {
      setError("Aucun contenu disponible pour cette sélection. Essaie d'élargir les filtres (thème ou niveau).");
    }
  };

  return (
    <div className="categorie-config">
      <h1>{category}</h1>

      <label>
        Thème
        <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
          <option value="">Tous les thèmes</option>
          {subcategories.map((s) => (
            <option key={s} value={s}>
              {SUBCATEGORY_LABELS[s] ?? s}
            </option>
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
