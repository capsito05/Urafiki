import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';

export function InstallPage() {
  const navigate = useNavigate();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const url = window.location.origin;

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 260,
      margin: 2,
      color: { dark: '#0d0d0d', light: '#ffffff' },
    }).then(setQrDataUrl);
  }, [url]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // ignore
    }
  };

  return (
    <div className="install-page">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Retour
      </button>
      <h1>Installer l'appli 📲</h1>
      <p>Fais scanner ce code par la personne que tu veux inviter — elle ouvrira directement le lien.</p>

      {qrDataUrl && (
        <div className="qr-card">
          <img src={qrDataUrl} alt="QR code pour installer l'application" width={220} height={220} />
        </div>
      )}

      <div className="install-link-row">
        <input readOnly value={url} onFocus={(e) => e.target.select()} />
        <button onClick={copyLink}>Copier</button>
      </div>

      <div className="install-instructions">
        <h2>Sur Android (Chrome)</h2>
        <p>Ouvre le lien → menu ⋮ en haut à droite → "Ajouter à l'écran d'accueil" (ou "Installer l'application").</p>
        <h2>Sur iPhone (Safari)</h2>
        <p>Ouvre le lien dans Safari → icône Partager (carré + flèche) → "Sur l'écran d'accueil" → Ajouter.</p>
      </div>
    </div>
  );
}
