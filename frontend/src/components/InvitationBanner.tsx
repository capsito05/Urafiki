import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameInvitation } from '../hooks/useGameInvitations';
import { useCoupleMembers } from '../hooks/useCoupleMembers';

interface InvitationBannerProps {
  invitations: GameInvitation[];
  onRespond: (invitation: GameInvitation, accept: boolean) => Promise<{ session: { id: string } | null; error: string | null }>;
}

export function InvitationBanner({ invitations, onRespond }: InvitationBannerProps) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const invitation = invitations[0];
  const { pseudos } = useCoupleMembers(invitation?.couple_id ?? null);

  if (!invitation) return null;

  const handle = async (accept: boolean) => {
    setBusy(invitation.id);
    const { session } = await onRespond(invitation, accept);
    setBusy(null);
    if (accept && session) {
      navigate(`/session/${session.id}`);
    }
  };

  return (
    <div className="invitation-banner">
      <p>
        🎮 <strong>{pseudos[invitation.invited_by] ?? 'Un membre du groupe'}</strong> t'invite à jouer
        {invitation.subcategory ? ` (${invitation.subcategory})` : ''} !
      </p>
      <div className="invitation-banner-actions">
        <button disabled={busy === invitation.id} onClick={() => handle(true)}>Accepter</button>
        <button className="link" disabled={busy === invitation.id} onClick={() => handle(false)}>Refuser</button>
      </div>
    </div>
  );
}
