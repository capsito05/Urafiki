/**
 * Partage (ou copie dans le presse-papiers si le partage natif n'est pas
 * disponible) le code d'invitation d'un groupe.
 */
export async function shareInviteCode(nom: string | null, code: string) {
  const text = `Rejoins mon groupe "${nom ?? 'Urafiki'}" sur Urafiki avec le code : ${code}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Code d\'invitation Urafiki', text });
      return;
    } catch {
      // l'utilisateur a annulé ou le partage a échoué : on tente la copie ci-dessous
    }
  }
  try {
    await navigator.clipboard.writeText(code);
    alert(`Code copié dans le presse-papiers : ${code}`);
  } catch {
    alert(`Code d'invitation : ${code}`);
  }
}
