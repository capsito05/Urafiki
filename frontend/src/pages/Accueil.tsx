import { useNavigate } from 'react-router-dom';
import type { Category, Mode } from '../types';

interface AccueilProps {
  mode: Mode;
}

const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'general', label: 'Général', emoji: '🧠' },
  { value: 'jeux_ensemble', label: 'Jeux ensemble', emoji: '🎲' },
  { value: 'mieux_connaitre', label: 'Pour mieux se connaître', emoji: '💬' },
  { value: 'manga', label: 'Manga / Anime', emoji: '🎌' },
];

export function Accueil({ mode }: AccueilProps) {
  const navigate = useNavigate();

  return (
    <div className="accueil">
      <h1>Que veux-tu faire ?</h1>
      <div className="category-grid">
        {CATEGORIES.map((c, i) => (
          <button key={c.value} className={`category-card swatch-${i % 8}`} onClick={() => navigate(`/categorie/${c.value}`)}>
            <span className="emoji">{c.emoji}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>
      <div className="nav-links">
        <button onClick={() => navigate('/chat')}>💌 Chat</button>
        <button onClick={() => navigate('/statistiques')}>📊 Statistiques</button>
        <button onClick={() => navigate('/installer')}>📲 Installer / Inviter</button>
      </div>
      {mode === 'couple' && (
        <button className="defi-discret-btn" onClick={() => navigate('/defi-discret')}>
          Défi discret 🤫
        </button>
      )}
    </div>
  );
}
