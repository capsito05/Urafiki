import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

interface ReglagesProps {
  userId: string;
  onSignOut: () => Promise<{ error: unknown }>;
}

export function Reglages({ userId, onSignOut }: ReglagesProps) {
  const navigate = useNavigate();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [defaultTimer, setDefaultTimer] = useState(30);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase
      .from('users')
      .select('sound_enabled, notifications_enabled, default_timer')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setSoundEnabled(data.sound_enabled ?? true);
          setNotificationsEnabled(data.notifications_enabled ?? true);
          setDefaultTimer(data.default_timer ?? 30);
          localStorage.setItem('urafiki_notifications_enabled', String(data.notifications_enabled ?? true));
          localStorage.setItem('urafiki_sound_enabled', String(data.sound_enabled ?? true));
        }
        setLoading(false);
      });
  }, [userId]);

  const handleSave = async () => {
    if (notificationsEnabled && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    await supabase
      .from('users')
      .update({ sound_enabled: soundEnabled, notifications_enabled: notificationsEnabled, default_timer: defaultTimer })
      .eq('id', userId);
    localStorage.setItem('urafiki_notifications_enabled', String(notificationsEnabled));
    localStorage.setItem('urafiki_sound_enabled', String(soundEnabled));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Supprimer définitivement ton compte et toutes tes données ? Cette action est irréversible.')) return;
    if (!confirm('Es-tu vraiment sûr·e ? Il n\'y a pas de retour en arrière possible.')) return;
    const { error } = await supabase.rpc('delete_own_account');
    if (error) {
      alert("Impossible de supprimer le compte pour l'instant. Réessaie plus tard ou contacte le support.");
      return;
    }
    await onSignOut();
    navigate('/');
  };

  const handleSignOut = async () => {
    await onSignOut();
    navigate('/');
  };

  if (loading) return <p>Chargement...</p>;

  return (
    <div className="reglages-page">
      <h1>Réglages</h1>

      <label>
        <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
        Son activé
      </label>

      <label>
        <input
          type="checkbox"
          checked={notificationsEnabled}
          onChange={(e) => setNotificationsEnabled(e.target.checked)}
        />
        Notifications activées
      </label>

      <label>
        Timer par défaut préféré : {defaultTimer}s
        <input
          type="range"
          min={10}
          max={180}
          step={10}
          value={defaultTimer}
          onChange={(e) => setDefaultTimer(Number(e.target.value))}
        />
      </label>

      <button onClick={handleSave}>Enregistrer</button>
      {saved && <p className="hint">✅ Enregistré</p>}

      <hr />

      <button className="link" onClick={() => navigate('/mes-groupes')}>👥 Mes groupes</button>

      <hr />

      <button className="link" onClick={handleSignOut}>Se déconnecter</button>
      <button className="danger-btn" onClick={handleDeleteAccount}>Supprimer mon compte</button>
    </div>
  );
}
