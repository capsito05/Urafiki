/**
 * Compare la réponse du joueur à la bonne réponse.
 * - QCM / vrai-faux : comparaison exacte (insensible à la casse).
 * - Réponse libre : tolérance jusqu'à 2 fautes de frappe (distance de Levenshtein),
 *   comme prévu dans le cahier des charges initial.
 */
export function checkAnswer(userAnswer: string, correctAnswer: string | null | undefined, type: string): boolean {
  if (!correctAnswer) return false; // Question ouverte sans réponse "juste" (philosophie, etc.)
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // enlève les accents
      .replace(/[^a-z0-9 ]/g, '')
      .trim();

  const a = normalize(userAnswer);
  const b = normalize(correctAnswer);

  if (type === 'qcm' || type === 'vrai_faux') {
    return a === b;
  }

  // Réponse libre : tolérance de 2 fautes
  return levenshtein(a, b) <= 2;
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
 * Une question sans réponse définie (philosophie, mieux se connaître...)
 * n'est jamais "fausse" : elle n'a simplement pas de correction automatique.
 */
export function hasAutoCorrection(correctAnswer: string | null | undefined): boolean {
  return !!correctAnswer;
}
