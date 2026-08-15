import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCouple } from '../hooks/useCouple';
import type { Mode } from '../types';

interface RejoindreGroupeProps {
  userId: string;
}

export function RejoindreGroupe({ userId }: RejoindreGroupeProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = (location.state as { mode?: Mode })?.mode ?? 'couple';
  const { createCouple, joinCouple } = useCouple(userId);
  const [inviteCode, setInviteCode] = useState('');
  const [nom, setNom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    setError(null);
    setBusy(true);
    const { couple, error: createError } = await createCouple(mode, nom);
    setBusy(false);
    if (couple) {
      setCreatedCode(couple.invite_code);
    } else {
      setError(createError);
    }
  };

  const handleJoin = async () => {
    setError(null);
    setBusy(true);
    const { couple, error: joinError } = await joinCouple(inviteCode);
    setBusy(false);
    if (couple) navigate('/accueil');
    else setError(joinError);
  };

  if (createdCode) {
    return (
      <div className="rejoindre-groupe">
        <h1>Groupe créé 🎉</h1>
        <p>Voici ton code d'invitation, partage-le avec l'autre personne :</p>
        <div className="invite-code-display">{createdCode}</div>
        <p className="hint">
          Elle pourra l'entrer quand elle veut dans "Rejoindre avec un code". En attendant, tu peux déjà jouer
          seul·e pour tester que tout fonctionne bien.
        </p>
        <button onClick={() => navigate('/accueil')}>Continuer</button>
      </div>
    );
  }

  return (
    <div className="rejoindre-groupe">
      <h1>{mode === 'couple' ? 'Ton couple' : "Ton groupe d'amis"}</h1>

      <section>
        <h2>Créer un nouveau groupe</h2>
        <input
          placeholder="Nom du groupe (doit être unique)"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
        />
        <button disabled={busy || !nom.trim()} onClick={handleCreate}>
          Créer et obtenir un code d'invitation
        </button>
        <p className="hint">
          Tu peux créer le groupe seul·e et commencer à jouer tout de suite pour tester — l'autre personne
          rejoindra avec le code quand elle sera prête.
        </p>
      </section>

      <section>
        <h2>Rejoindre avec un code</h2>
        <input placeholder="Code d'invitation" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
        <button disabled={busy || !inviteCode.trim()} onClick={handleJoin}>
          Rejoindre
        </button>
      </section>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
