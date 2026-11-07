import { PostcardMemory } from '../types';

export async function downloadPostcardAsImage(memory: PostcardMemory) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  const gradient = ctx.createLinearGradient(0, 0, 1200, 800);
  gradient.addColorStop(0, '#111513');
  gradient.addColorStop(1, '#0A0C0B');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 800);

  // Border & Postal Card container
  ctx.strokeStyle = 'rgba(204, 255, 0, 0.25)';
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, 1140, 740);

  // Inner postal card
  ctx.fillStyle = '#161A18';
  ctx.beginPath();
  ctx.roundRect(50, 50, 1100, 700, 28);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Hero image onto left side
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
      img.src = memory.heroImage;
    });

    if (img.width > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(80, 80, 500, 640, 20);
      ctx.clip();
      ctx.drawImage(img, 80, 80, 500, 640);
      ctx.restore();
    } else {
      ctx.fillStyle = '#0A0C0B';
      ctx.beginPath();
      ctx.roundRect(80, 80, 500, 640, 20);
      ctx.fill();
      ctx.font = '80px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(memory.vibeEmoji, 330, 420);
    }
  } catch {
    ctx.fillStyle = '#0A0C0B';
    ctx.beginPath();
    ctx.roundRect(80, 80, 500, 640, 20);
    ctx.fill();
    ctx.font = '80px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(memory.vibeEmoji, 330, 420);
  }

  // Right Side - Postal Stamp & Cancellation
  ctx.fillStyle = '#0A0C0B';
  ctx.strokeStyle = '#CCFF00';
  ctx.lineWidth = 3;
  ctx.strokeRect(960, 80, 150, 160);
  ctx.fillRect(960, 80, 150, 160);
  ctx.fillStyle = '#CCFF00';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PLANMAP', 1035, 120);
  ctx.font = '40px sans-serif';
  ctx.fillText(memory.vibeEmoji, 1035, 175);
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('DARK PRO', 1035, 215);

  // Stamp postal cancellation stamp ring
  ctx.strokeStyle = 'rgba(204, 255, 0, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(930, 150, 55, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#CCFF00';
  ctx.fillText(memory.city.toUpperCase(), 930, 140);
  ctx.fillText(memory.date.toUpperCase(), 930, 165);

  // Postcard Title
  ctx.textAlign = 'left';
  ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(memory.title, 620, 140);

  // Subtitle / Location
  ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#8A9590';
  ctx.fillText(`📍 ${memory.location} · ${memory.date}`, 620, 180);

  // Separator Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(620, 210);
  ctx.lineTo(920, 210);
  ctx.stroke();

  // Quote
  ctx.font = 'italic 26px "Caveat", cursive, serif';
  ctx.fillStyle = '#E8F5E9';
  const words = memory.quote.split(' ');
  let line = '';
  let y = 265;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > 480 && n > 0) {
      ctx.fillText(line, 620, y);
      line = words[n] + ' ';
      y += 35;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, 620, y);

  // Attendees Signatures Section
  ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#8A9590';
  ctx.fillText('Compartido por:', 620, 530);

  let sigX = 620;
  memory.attendees.forEach((att) => {
    ctx.font = '24px "Caveat", cursive';
    ctx.fillStyle = '#CCFF00';
    ctx.fillText(`✍️ ${att.signature || att.name}`, sigX, 575);
    sigX += 160;
  });

  // Footer Tag
  ctx.font = '14px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#8A9590';
  ctx.fillText('Generado con PlanMap · Plataforma de Experiencias Compartidas', 620, 680);

  // Download Trigger
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `planmap-darkpro-${memory.id}.png`;
  a.click();
}
