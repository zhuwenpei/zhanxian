import * as countries from 'i18n-iso-countries';

export function normalizeIso2(isoCode: string): string {
  if (!isoCode) return 'UN';
  const clean = isoCode.trim().toUpperCase();
  if (clean.length === 2) return clean;
  if (clean.length === 3) {
    const alpha2 = countries.alpha3ToAlpha2(clean);
    if (alpha2) return alpha2.toUpperCase();
  }
  return clean.substring(0, 2);
}

export function getCountryFlagEmoji(isoCode: string): string {
  const iso2 = normalizeIso2(isoCode);
  if (!iso2 || iso2.length !== 2) return '🏳️';
  const codePoints = iso2.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function getCountryFlagUrl(isoCode: string): string {
  const iso2 = normalizeIso2(isoCode);
  return `https://flagcdn.com/w80/${iso2.toLowerCase()}.png`;
}

// Draw a country flag badge onto a canvas context
export async function createFlagUnitCanvasIcon(
  isoCode: string,
  sideColor: string,
  width: number = 40,
  height: number = 26
): Promise<{ width: number; height: number; data: Uint8ClampedArray }> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const iso2 = normalizeIso2(isoCode);

  // 1. Shadow & Background Frame
  ctx.fillStyle = sideColor;
  ctx.beginPath();
  if ((ctx as any).roundRect) {
    (ctx as any).roundRect(0, 0, width, height, 4);
  } else {
    ctx.rect(0, 0, width, height);
  }
  ctx.fill();

  // 2. Load Flag Image from FlagCDN
  const flagUrl = getCountryFlagUrl(iso2);
  const img = new Image();
  img.crossOrigin = 'anonymous';

  const loaded = await new Promise<boolean>((resolve) => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = flagUrl;
  });

  if (loaded && img.naturalWidth > 0) {
    // Draw flag inside frame with 2px padding
    ctx.drawImage(img, 2, 2, width - 4, height - 4);
  } else {
    // Fallback: draw Emoji flag or styled text
    const emoji = getCountryFlagEmoji(iso2);
    ctx.font = '18px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, width / 2, height / 2);
  }

  // 3. Crisp Border & Side Indicator
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // Tiny side color dot at top-right corner
  ctx.fillStyle = sideColor;
  ctx.beginPath();
  ctx.arc(width - 4, 4, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();

  return {
    width,
    height,
    data: ctx.getImageData(0, 0, width, height).data
  };
}
