interface ShareScoreParams {
  correct: number;
  gradable: number;
  percent: number | null;
  categoryLabel: string;
  formattedTime: string;
}

function drawCard(params: ShareScoreParams): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#1a1a1a');
  gradient.addColorStop(1, '#0d0d0d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffc857';
  ctx.font = '700 56px Georgia, serif';
  ctx.fillText('Urafiki', canvas.width / 2, 160);

  ctx.fillStyle = '#b3b3b3';
  ctx.font = '500 32px sans-serif';
  ctx.fillText(params.categoryLabel, canvas.width / 2, 230);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 160px sans-serif';
  if (params.percent !== null) {
    ctx.fillText(`${params.correct}/${params.gradable}`, canvas.width / 2, 520);
    ctx.fillStyle = '#3ecf8e';
    ctx.font = '600 48px sans-serif';
    ctx.fillText(`${params.percent}% de bonnes réponses`, canvas.width / 2, 600);
  } else {
    ctx.font = '600 44px sans-serif';
    ctx.fillText('Session terminée', canvas.width / 2, 480);
    ctx.fillText('pour discuter et se découvrir 💬', canvas.width / 2, 540);
  }

  ctx.fillStyle = '#b3b3b3';
  ctx.font = '500 34px sans-serif';
  ctx.fillText(`⏱ ${params.formattedTime}`, canvas.width / 2, 700);

  ctx.fillStyle = '#666666';
  ctx.font = '400 26px sans-serif';
  ctx.fillText('urafiki-amitier.netlify.app', canvas.width / 2, canvas.height - 60);

  return canvas;
}

export async function shareScore(params: ShareScoreParams): Promise<void> {
  const canvas = drawCard(params);
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return;

  const file = new File([blob], 'urafiki-score.png', { type: 'image/png' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Mon score sur Urafiki' });
      return;
    } catch {
      // l'utilisateur a annulé le partage natif -> on retombe sur le téléchargement
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'urafiki-score.png';
  a.click();
  URL.revokeObjectURL(url);
}
