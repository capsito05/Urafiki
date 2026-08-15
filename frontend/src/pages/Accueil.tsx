import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Category, Mode } from '../types';
import { useCoupleMembers } from '../hooks/useCoupleMembers';
import { supabase } from '../lib/supabaseClient';

interface AccueilProps {
  mode: Mode;
  userId: string;
  coupleId: string | null;
}

const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: 'general', label: 'Général', emoji: '🧠' },
  { value: 'jeux_ensemble', label: 'Jeux ensemble', emoji: '🎲' },
  { value: 'mieux_connaitre', label: 'Pour mieux se connaître', emoji: '💬' },
  { value: 'manga', label: 'Manga / Anime', emoji: '🎌' },
];

export function Accueil({ mode, userId, coupleId }: AccueilProps) {
  const navigate = useNavigate();
  const { members } = useCoupleMembers(coupleId);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    supabase
      .from('daily_challenge_completions')
      .select('streak_count, challenge_date')
      .eq('user_id', userId)
      .order('challenge_date', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const today = new Date().toISOString().slice(0, 10);
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        if (data && (data.challenge_date === today || data.challenge_date === yesterday)) {
          setStreak(data.streak_count);
        }
      });
  }, [userId]);

  const handleCategoryClick = (category: Category) => {
    if (coupleId && members.length >= 2) {
      navigate(`/inviter/${category}`);
    } else {
      navigate(`/categorie/${category}`);
    }
  };

  return (
    <div className="accueil">
      <h1>Que veux-tu faire ?</h1>
      {streak > 0 && <p className="streak-badge">🔥 {streak} jour{streak > 1 ? 's' : ''} d'affilée</p>}
      <div className="category-grid">
        {CATEGORIES.map((c, i) => (
          <button key={c.value} className={`category-card swatch-${i % 8}`} onClick={() => handleCategoryClick(c.value)}>
            <span className="emoji">{c.emoji}</span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>
      <div className="nav-links">
        <button onClick={() => navigate('/defi-du-jour')}>🔥 Défi du jour</button>
        <button onClick={() => navigate('/chat')}>💌 Chat</button>
        <button onClick={() => navigate('/statistiques')}>📊 Statistiques</button>
        {coupleId && <button onClick={() => navigate('/mes-groupes')}>👥 Mes groupes</button>}
        <button onClick={() => navigate('/installer')}>📲 Installer / Inviter</button>
        <button onClick={() => navigate('/reglages')}>⚙️ Réglages</button>
      </div>
      {mode === 'couple' && (
        <button className="defi-discret-btn" onClick={() => navigate('/defi-discret')}>
          Défi discret 🤫
        </button>
      )}
    </div>
  );
}
