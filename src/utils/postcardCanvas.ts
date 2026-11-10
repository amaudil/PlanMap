import { PostcardMemory } from '../types';

export interface RenderMemoryOptions {
  title: string;
  vibeText?: string;
  style?: 'postal' | 'collage' | 'meme';
  quote: string;
  uploadedPhotoUrl?: string | null;
  date?: string;
  location?: string;
  attendees?: Array<{ name: string; role?: string; avatar?: string }>;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function isPostcardMemory(obj: any): obj is PostcardMemory {
  return obj && 'heroImage' in obj && 'vibeEmoji' in obj;
}

export function normalizeMemoryOptions(input: RenderMemoryOptions | PostcardMemory): RenderMemoryOptions {
  if (isPostcardMemory(input)) {
    return {
      title: input.title,
      vibeText: `${input.vibeEmoji} ${input.vibeName}`,
      style: 'postal',
      quote: input.quote,
      uploadedPhotoUrl: input.heroImage,
      date: input.date || '6 de Noviembre, 2026',
      location: input.location ? `${input.location}, ${input.city}` : 'Casco Antiguo, Panamá',
      attendees: input.attendees?.map((a) => ({ name: a.name, avatar: a.avatar })) || [],
    };
  }
  return {
    ...input,
    vibeText: input.vibeText || '☕ Chill',
    style: input.style || 'postal',
  };
}

export async function generateMemoryCanvas(input: RenderMemoryOptions | PostcardMemory): Promise<HTMLCanvasElement> {
  const options = normalizeMemoryOptions(input);
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2D context');

  const {
    title,
    vibeText = '☕ Chill',
    style = 'postal',
    quote,
    uploadedPhotoUrl,
    date = '6 de Noviembre, 2026',
    location = 'Casco Antiguo, Panamá',
    attendees = [
      { name: 'Tú', role: 'Host', avatar: '👤' },
      { name: 'Sofía R.', avatar: '👩‍💻' },
      { name: 'Mateo V.', avatar: '🧑‍🎨' },
    ],
  } = options;

  // 1. Fondo Dark Pro con gradiente
  const bgGradient = ctx.createLinearGradient(0, 0, 1080, 1350);
  bgGradient.addColorStop(0, '#121715');
  bgGradient.addColorStop(0.5, '#0A0C0B');
  bgGradient.addColorStop(1, '#050706');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, 1080, 1350);

  // Marco exterior
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 30, 30, 1020, 1290, 36);
  ctx.stroke();

  // Borde fino de acento neón interior
  ctx.strokeStyle = 'rgba(204, 255, 0, 0.2)';
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, 42, 42, 996, 1266, 28);
  ctx.stroke();

  // 2. Encabezado de Marca
  // Pastilla de marca
  ctx.fillStyle = '#161A18';
  drawRoundedRect(ctx, 70, 70, 320, 60, 30);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PLANEALO AQUÍ', 96, 108);
  ctx.fillStyle = '#CCFF00';
  ctx.fillText('⚡', 290, 108);

  // Sello Postal Circular (Esquina Superior Derecha)
  ctx.save();
  ctx.strokeStyle = '#CCFF00';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(970, 100, 44, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(204, 255, 0, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(970, 100, 38, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#CCFF00';
  ctx.font = '800 11px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PANAMÁ', 970, 95);
  ctx.font = '700 9px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('2026', 970, 112);
  ctx.restore();

  // 3. Contenedor de Fotografía / Selfie
  const photoX = 70;
  const photoY = 160;
  const photoW = 940;
  const photoH = 580;

  let imageDrawn = false;
  if (uploadedPhotoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = uploadedPhotoUrl;
      });

      if (img.width > 0 && img.height > 0) {
        ctx.save();
        drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 28);
        ctx.clip();

        // Object-fit: cover cálculo
        const imgRatio = img.width / img.height;
        const targetRatio = photoW / photoH;
        let sWidth = img.width;
        let sHeight = img.height;
        let sx = 0;
        let sy = 0;

        if (imgRatio > targetRatio) {
          sWidth = img.height * targetRatio;
          sx = (img.width - sWidth) / 2;
        } else {
          sHeight = img.width / targetRatio;
          sy = (img.height - sHeight) / 2;
        }

        ctx.drawImage(img, sx, sy, sWidth, sHeight, photoX, photoY, photoW, photoH);

        // Degradado suave inferior en la imagen para contraste
        const imgOverlay = ctx.createLinearGradient(0, photoY + photoH - 120, 0, photoY + photoH);
        imgOverlay.addColorStop(0, 'transparent');
        imgOverlay.addColorStop(1, 'rgba(10, 12, 11, 0.7)');
        ctx.fillStyle = imgOverlay;
        ctx.fillRect(photoX, photoY + photoH - 120, photoW, 120);

        ctx.restore();

        // Borde decorativo
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 2;
        drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 28);
        ctx.stroke();

        imageDrawn = true;
      }
    } catch {
      imageDrawn = false;
    }
  }

  if (!imageDrawn) {
    // Placeholder estético estilo polaroid dark
    ctx.fillStyle = '#161A18';
    drawRoundedRect(ctx, photoX, photoY, photoW, photoH, 28);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Icono central grande
    ctx.font = '100px sans-serif';
    ctx.textAlign = 'center';
    const emoji = vibeText.split(' ')[0] || '📸';
    ctx.fillText(emoji, photoX + photoW / 2, photoY + photoH / 2 - 20);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Recuerdo Colectivo en Vivo', photoX + photoW / 2, photoY + photoH / 2 + 50);

    ctx.fillStyle = '#8A9590';
    ctx.font = '500 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Foto tomada y confirmada en el punto de encuentro', photoX + photoW / 2, photoY + photoH / 2 + 80);
  }

  // 4. Etiqueta de Estilo
  const styleLabel =
    style === 'postal' ? '✉️ POSTAL PRO' : style === 'collage' ? '📸 COLLAGE COLECTIVO' : '🤪 VIBE / MEME';
  ctx.fillStyle = 'rgba(204, 255, 0, 0.12)';
  drawRoundedRect(ctx, photoX, 770, 220, 36, 18);
  ctx.fill();
  ctx.strokeStyle = '#CCFF00';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#CCFF00';
  ctx.font = '800 13px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(styleLabel, photoX + 110, 794);

  // 5. Título del Plan
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 42px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  // Truncar si es muy largo
  let displayTitle = title;
  if (ctx.measureText(displayTitle).width > 920) {
    while (ctx.measureText(displayTitle + '...').width > 920 && displayTitle.length > 0) {
      displayTitle = displayTitle.slice(0, -1);
    }
    displayTitle += '...';
  }
  ctx.fillText(displayTitle, photoX, 855);

  // 6. Metadata: Vibe + Ubicación + Fecha
  ctx.fillStyle = '#8A9590';
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`✨ ${vibeText}   ·   📍 ${location}   ·   📅 ${date}`, photoX, 895);

  // Línea divisoria elegante
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(photoX, 930);
  ctx.lineTo(photoX + photoW, 930);
  ctx.stroke();

  // 7. Tarjeta de Cita / Reflexión Filosófica
  ctx.fillStyle = '#161A18';
  drawRoundedRect(ctx, photoX, 955, photoW, 145, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Texto de la reflexión
  ctx.fillStyle = '#E6E8E7';
  ctx.font = 'italic 600 22px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(quote, photoX + photoW / 2, 1020);

  // Firma obligatoria @amabo
  ctx.fillStyle = '#CCFF00';
  ctx.font = '800 16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('— @amabo', photoX + photoW / 2, 1060);

  // 8. Participantes Confirmados
  ctx.fillStyle = '#8A9590';
  ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('PARTICIPANTES EN EL PUNTO:', photoX, 1140);

  let currentBadgeX = photoX;
  const badgeY = 1160;
  attendees.forEach((att) => {
    const text = `${att.avatar || '👤'} ${att.name}${att.role ? ` (${att.role})` : ''} ✅`;
    ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
    const textWidth = ctx.measureText(text).width;
    const badgeW = textWidth + 30;

    ctx.fillStyle = '#161A18';
    drawRoundedRect(ctx, currentBadgeX, badgeY, badgeW, 40, 20);
    ctx.fill();
    ctx.strokeStyle = att.role === 'Host' ? '#CCFF00' : 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = att.role === 'Host' ? '#CCFF00' : '#FFFFFF';
    ctx.fillText(text, currentBadgeX + 15, badgeY + 26);

    currentBadgeX += badgeW + 14;
  });

  // 9. Pie de Imprenta
  ctx.fillStyle = '#5A635E';
  ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Experiencia coordinada en vivo con Planealo Aquí ⚡ · planealo-aqui.netlify.app', 1080 / 2, 1275);

  return canvas;
}

export async function downloadPostcardAsImage(input: RenderMemoryOptions | PostcardMemory): Promise<void> {
  const options = normalizeMemoryOptions(input);
  const canvas = await generateMemoryCanvas(options);
  const dataUrl = canvas.toDataURL('image/png');
  const slug = (options.title || 'recuerdo').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `planealo-recuerdo-${slug}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function sharePostcardAsFile(input: RenderMemoryOptions | PostcardMemory): Promise<boolean> {
  const options = normalizeMemoryOptions(input);
  const canvas = await generateMemoryCanvas(options);
  return new Promise<boolean>((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      const slug = (options.title || 'recuerdo').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const file = new File([blob], `recuerdo-${slug}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `Recuerdo: ${options.title}`,
            text: `¡Mira nuestro recuerdo de "${options.title}" en Planealo Aquí! ⚡\n${options.quote}\n— @amabo`,
            files: [file],
          });
          resolve(true);
        } catch {
          resolve(false);
        }
      } else if (navigator.share) {
        try {
          await navigator.share({
            title: `Recuerdo: ${options.title}`,
            text: `¡Mira nuestro recuerdo de "${options.title}" en Planealo Aquí! ⚡\n${options.quote}\n— @amabo`,
            url: window.location.origin,
          });
          resolve(true);
        } catch {
          resolve(false);
        }
      } else {
        // Fallback: descargar la imagen directamente
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `planealo-recuerdo-${slug}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        resolve(true);
      }
    }, 'image/png');
  });
}
