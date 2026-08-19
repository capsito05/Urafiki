import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCouple } from '../hooks/useCouple';
import { useCoupleMembers } from '../hooks/useCoupleMembers';
import { shareInviteCode } from '../lib/shareCode';
import type { Couple } from '../types';

interface MesGroupesProps {
  userId: string;
}

function GroupMembers({ group, userId }: { group: Couple; userId: string }) {
  const { members, loading, removeMember } = useCoupleMembers(group.id);
  const isCreator = group.created_by === userId;
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleRemove = async (memberId: string) => {
    if (!confirm('Retirer ce membre du groupe ?')) return;
    setBusyId(memberId);
    await removeMember(memberId);
    setBusyId(null);
  };

  if (loading) return <p className="hint">Chargement des membres...</p>;

  return (
    <ul className="group-members-list">
      {members.map((m) => (
        <li key={m.user_id}>
          <span>{m.pseudo}{m.user_id === userId ? ' (toi)' : ''}</span>
          {isCreator && m.user_id !== userId && (
            <button disabled={busyId === m.user_id} onClick={() => handleRemove(m.user_id)}>
              Retirer du groupe
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export function MesGroupes({ userId }: MesGroupesProps) {
  const navigate = useNavigate();
  const { groups, loading, setActiveGroup } = useCouple(userId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleEnter = (couple: Couple) => {
    setActiveGroup(couple.id);
    navigate('/accueil');
  };

  if (loading) return <p>Chargement...</p>;

  return (
    <div className="mes-groupes-page">
      <h1>Mes groupes</h1>

      {groups.length === 0 && (
        <p className="hint">
          Tu n'appartiens à aucun groupe pour l'instant. Crée-en un ou rejoins-en un depuis le choix du mode.
        </p>
      )}

      <ul className="groups-list">
        {groups.map((g) => (
          <li key={g.id} className="group-card">
            <div className="group-card-header">
              <div>
                <strong>{g.nom}</strong>
                <span className="hint"> · {g.mode === 'couple' ? 'Couple' : 'Ami·e·s'}</span>
              </div>
              <div className="group-card-actions">
                <button onClick={() => handleEnter(g)}>Revenir dans ce groupe</button>
                <button className="link" onClick={() => setExpandedId(expandedId === g.id ? null : g.id)}>
                  {expandedId === g.id ? 'Masquer les membres' : 'Voir les membres'}
                </button>
                <button className="link" onClick={() => shareInviteCode(g.nom, g.invite_code)}>
                  📋 Code
                </button>
              </div>
            </div>
            {expandedId === g.id && <GroupMembers group={g} userId={userId} />}
          </li>
        ))}
      </ul>

      <button className="link" onClick={() => navigate('/rejoindre-groupe')}>
        + Créer ou rejoindre un autre groupe
      </button>
    </div>
  );
}
