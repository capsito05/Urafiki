import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [age, setAge] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);

    if (isSignUp) {
      const ageNumber = parseInt(age, 10);
      if (!age || Number.isNaN(ageNumber) || ageNumber < 13 || ageNumber > 120) {
        setError('Merci de renseigner un âge valide (13 ans minimum).');
        return;
      }
      const { error: authError } = await signUp(email, password, pseudo, ageNumber);
      if (authError) setError(authError.message);
      return;
    }

    const { error: authError } = await signIn(email, password);
    if (authError) setError(authError.message);
  };

  return (
    <div className="auth-page">
      <h1>{isSignUp ? 'Créer un compte' : 'Connexion'}</h1>
      {isSignUp && (
        <>
          <input placeholder="Pseudo" value={pseudo} onChange={(e) => setPseudo(e.target.value)} />
          <input
            placeholder="Âge"
            type="number"
            min={13}
            max={120}
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
          <p className="hint">
            ⚠️ L'âge ne pourra plus être modifié après l'inscription. Le mode Couple est réservé aux 20 ans et
            plus.
          </p>
        </>
      )}
      <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button onClick={handleSubmit}>{isSignUp ? "S'inscrire" : 'Se connecter'}</button>
      <button className="link" onClick={() => setIsSignUp((s) => !s)}>
        {isSignUp ? 'Déjà un compte ? Se connecter' : "Pas de compte ? S'inscrire"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
