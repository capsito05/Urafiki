import { useNavigate } from 'react-router-dom';
import type { Mode } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useProfile } from '../hooks/useProfile';

interface ChoixModeProps {
  userId: string;
}

const ALL_MODES: { value: Mode; label: string; description: string; minAge?: number }[] = [
  { value: 'couple', label: 'Couple', description: 'Questions et défis pour vous deux', minAge: 20 },
  { value: 'amis', label: 'Ami·e·s', description: 'Souvenirs et délires entre amis' },
  { value: 'solo', label: 'Solo', description: 'Culture générale, manga, réflexion personnelle' },
];

export function ChoixMode({ userId }: ChoixModeProps) {
  const navigate = useNavigate();
  const { profile, loading } = useProfile(userId);

  if (loading) return <p>Chargement...</p>;

  const age = profile?.age ?? 0;
  const modes = ALL_MODES.filter((m) => !m.minAge || age >= m.minAge);

  const handleChoice = async (mode: Mode) => {
    await supabase.from('users').update({ mode_prefere: mode }).eq('id', userId);
    navigate(mode === 'solo' ? '/accueil' : '/rejoindre-groupe', { state: { mode } });
  };

  return (
    <div className="choix-mode">
      <h1>Comment veux-tu jouer ?</h1>
      {age < 20 && (
        <p className="hint">Le mode Couple est réservé aux 20 ans et plus — tu peux jouer en mode Ami·e·s ou Solo.</p>
      )}
      <div className="mode-cards">
        {modes.map((m, i) => (
          <button key={m.value} className={`mode-card swatch-${i % 8}`} onClick={() => handleChoice(m.value)}>
            <h2>{m.label}</h2>
            <p>{m.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
