const DETERMINANTS = ['de la', 'de l', 'les', 'des', 'une', 'un', 'le', 'la', 'l', 'du'];

/**
 * Normalisation phonétique légère pour le français : rapproche des
 * variantes orthographiques qui se prononcent pareil ou presque
 * (ph/f, doublons de consonnes, terminaisons y/i/ie), pour que la
 * distance de Levenshtein qui suit n'ait plus qu'à absorber de
 * petites fautes de frappe réelles plutôt que des variations sonores.
 */
function phoneticFold(s: string): string {
  return s
    .replace(/ph/g, 'f')
    .replace(/([a-z])\1+/g, '$1') // doublons de lettres -> une seule (luffy -> lufy)
    .replace(/(ie|y)$/g, 'i') // terminaisons y / ie -> i (luffy -> lufi, angie -> angi)
    .replace(/qu/g, 'k')
    .replace(/c([ei])/g, 's$1');
}

function stripLeadingDeterminant(raw: string): string {
  const lower = raw.toLowerCase().trim();
  for (const d of DETERMINANTS) {
    const withApostrophe = `${d}'`;
    if (lower.startsWith(`${withApostrophe}`)) {
      return lower.slice(withApostrophe.length);
    }
    if (lower.startsWith(`${d} `)) {
      return lower.slice(d.length + 1);
    }
  }
  return lower;
}

function normalize(s: string): string {
  const withoutDeterminant = stripLeadingDeterminant(s);
  const stripped = withoutDeterminant
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // enlève les accents
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
  return stripped;
}

/**
 * Compare la réponse du joueur à la bonne réponse.
 * - QCM / vrai-faux / tu-préfères : comparaison exacte (insensible à la casse).
 * - Réponse libre / devinette : tolérance aux fautes de frappe ET aux variantes
 *   phonétiques plausibles (voir phoneticFold), avec une tolérance qui grandit
 *   légèrement avec la longueur du mot pour rester juste.
 *
 * `knownVariants` (optionnel) : réponses alternatives déjà validées par des
 * joueurs pour cette réponse canonique (table answer_variants, 2.4) —
 * acceptées telles quelles, en plus de la tolérance automatique.
 */
export function checkAnswer(
  userAnswer: string,
  correctAnswer: string | null | undefined,
  type: string,
  knownVariants: string[] = []
): boolean {
  if (!correctAnswer) return false; // Question ouverte sans réponse "juste" (philosophie, discussion, etc.)

  const a = normalize(userAnswer);
  const b = normalize(correctAnswer);

  if (knownVariants.some((v) => normalize(v) === a)) return true;

  if (type === 'qcm' || type === 'vrai_faux' || type === 'tu_preferes') {
    return a === b;
  }

  if (a === b) return true;

  const foldedA = phoneticFold(a);
  const foldedB = phoneticFold(b);
  const tolerance = Math.min(4, Math.max(2, Math.round(foldedB.length / 4)));

  return levenshtein(foldedA, foldedB) <= tolerance;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Une question sans réponse définie (philosophie, discussion, tu-préfères...)
 * n'est jamais "fausse" : elle n'a simplement pas de correction automatique.
 */
export function hasAutoCorrection(correctAnswer: string | null | undefined): boolean {
  return !!correctAnswer;
}
