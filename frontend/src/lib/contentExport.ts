// Canvas-based export utility for ContentPanel

export interface CardTheme {
  id: string;
  name: string;
  isGradient: boolean;
  from: string;
  to: string;
  textColor: string;
  fadedColor: string;
  accentColor: string;
  cssBg: string;
}

export const CARD_THEMES: CardTheme[] = [
  { id: 'dreamy',    name: 'Dreamy',    isGradient: true,  from: '#667eea', to: '#764ba2', textColor: '#ffffff', fadedColor: 'rgba(255,255,255,0.55)', accentColor: '#e0c3fc', cssBg: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' },
  { id: 'ocean',     name: 'Ocean',     isGradient: true,  from: '#0093E9', to: '#80D0C7', textColor: '#ffffff', fadedColor: 'rgba(255,255,255,0.55)', accentColor: '#b3f5ff', cssBg: 'linear-gradient(135deg,#0093E9 0%,#80D0C7 100%)' },
  { id: 'sunset',    name: 'Sunset',    isGradient: true,  from: '#f093fb', to: '#f5576c', textColor: '#ffffff', fadedColor: 'rgba(255,255,255,0.55)', accentColor: '#ffd6e0', cssBg: 'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)' },
  { id: 'forest',    name: 'Forest',    isGradient: true,  from: '#11998e', to: '#38ef7d', textColor: '#ffffff', fadedColor: 'rgba(255,255,255,0.55)', accentColor: '#c6ffe4', cssBg: 'linear-gradient(135deg,#11998e 0%,#38ef7d 100%)' },
  { id: 'midnight',  name: 'Midnight',  isGradient: true,  from: '#0f0c29', to: '#302b63', textColor: '#e8e8ff', fadedColor: 'rgba(232,232,255,0.45)', accentColor: '#a78bfa', cssBg: 'linear-gradient(135deg,#0f0c29 0%,#302b63 100%)' },
  { id: 'golden',    name: 'Golden',    isGradient: true,  from: '#f7971e', to: '#ffd200', textColor: '#1a0e00', fadedColor: 'rgba(26,14,0,0.45)',      accentColor: '#7c4200', cssBg: 'linear-gradient(135deg,#f7971e 0%,#ffd200 100%)' },
  { id: 'coral',     name: 'Coral',     isGradient: true,  from: '#ff6b6b', to: '#feca57', textColor: '#1a0000', fadedColor: 'rgba(26,0,0,0.45)',       accentColor: '#6b0000', cssBg: 'linear-gradient(135deg,#ff6b6b 0%,#feca57 100%)' },
  { id: 'carbon',    name: 'Carbon',    isGradient: false, from: '#0d1117', to: '#0d1117', textColor: '#e6edf3', fadedColor: 'rgba(230,237,243,0.4)',    accentColor: '#58a6ff', cssBg: '#0d1117' },
  { id: 'neon',      name: 'Neon',      isGradient: false, from: '#0a0a0a', to: '#0a0a0a', textColor: '#39ff14', fadedColor: 'rgba(57,255,20,0.45)',     accentColor: '#ff006e', cssBg: '#0a0a0a' },
  { id: 'storm',     name: 'Storm',     isGradient: true,  from: '#373b44', to: '#4286f4', textColor: '#ffffff', fadedColor: 'rgba(255,255,255,0.5)',    accentColor: '#90caf9', cssBg: 'linear-gradient(135deg,#373b44 0%,#4286f4 100%)' },
  { id: 'cream',     name: 'Cream',     isGradient: false, from: '#fdf6ec', to: '#fdf6ec', textColor: '#1a1200', fadedColor: 'rgba(26,18,0,0.4)',        accentColor: '#7c5500', cssBg: '#fdf6ec' },
  { id: 'rose-gold', name: 'Rose Gold', isGradient: true,  from: '#c9a227', to: '#f490b1', textColor: '#ffffff', fadedColor: 'rgba(255,255,255,0.5)',    accentColor: '#ffe0f0', cssBg: 'linear-gradient(135deg,#c9a227 0%,#f490b1 100%)' },
];

export const FONT_OPTIONS = [
  { id: 'segoe',   name: 'Clean',   css: "'Segoe UI', Arial, sans-serif",        canvas: 'Segoe UI' },
  { id: 'impact',  name: 'Bold',    css: "Impact, 'Arial Black', sans-serif",     canvas: 'Impact' },
  { id: 'georgia', name: 'Classic', css: "Georgia, 'Times New Roman', serif",     canvas: 'Georgia' },
  { id: 'courier', name: 'Code',    css: "'Courier New', Courier, monospace",      canvas: 'Courier New' },
  { id: 'arial',   name: 'Simple',  css: "Arial, Helvetica, sans-serif",           canvas: 'Arial' },
];

export type ExportFormat = 'post' | 'reel';

export interface ExportOptions {
  format: ExportFormat;
  theme: CardTheme;
  fontId: string;
  watermark: string;
  showWatermark: boolean;
}

function getFontName(fontId: string): string {
  return FONT_OPTIONS.find(f => f.id === fontId)?.canvas ?? 'Arial';
}

function applyBg(ctx: CanvasRenderingContext2D, theme: CardTheme, w: number, h: number) {
  if (theme.isGradient) {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, theme.from);
    g.addColorStop(1, theme.to);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = theme.from;
  }
  ctx.fillRect(0, 0, w, h);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number, maxLines = 9999): number {
  for (const para of text.split('\n')) {
    if (!para.trim()) { y += lh * 0.45; continue; }
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, y); y += lh; maxLines--;
        if (maxLines <= 0) return y;
        line = word;
      } else { line = test; }
    }
    if (line) { ctx.fillText(line, x, y); y += lh; maxLines--; if (maxLines <= 0) return y; }
  }
  return y;
}

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawCardToCanvas(
  canvas: HTMLCanvasElement,
  item: { title: string; body: string; hashtags?: string[]; bestPlatform?: string },
  opts: ExportOptions
): void {
  const { theme, showWatermark, watermark } = opts;
  const font = getFontName(opts.fontId);
  const isReel = opts.format === 'reel';
  const W = canvas.width;
  const H = canvas.height;
  const pad = Math.round(W * 0.07);
  const cw = W - pad * 2;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, W, H);
  applyBg(ctx, theme, W, H);

  // Decorative arc
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = theme.textColor;
  ctx.beginPath();
  ctx.arc(W * 1.1, -W * 0.1, W * 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let y = pad * 1.35;

  // Platform badge
  if (item.bestPlatform) {
    const fs = Math.round(W * 0.023);
    ctx.font = `bold ${fs}px ${font}`;
    const bw = ctx.measureText(item.bestPlatform).width + 24;
    const bh = fs * 2;
    ctx.fillStyle = theme.accentColor;
    ctx.globalAlpha = 0.2;
    rrect(ctx, pad, y, bw, bh, bh / 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.accentColor;
    ctx.textBaseline = 'middle';
    ctx.fillText(item.bestPlatform, pad + 12, y + bh / 2);
    ctx.textBaseline = 'alphabetic';
    y += bh + Math.round(W * 0.042);
  }

  // Title
  const ts = isReel ? Math.round(W * 0.068) : Math.round(W * 0.058);
  ctx.font = `bold ${ts}px ${font}`;
  ctx.fillStyle = theme.textColor;
  y = wrapText(ctx, item.title, pad, y, cw, ts * 1.25, 3);
  y += Math.round(ts * 0.55);

  // Accent bar
  ctx.fillStyle = theme.accentColor;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(pad, y, Math.round(W * 0.12), 3);
  ctx.globalAlpha = 1;
  y += Math.round(W * 0.038);

  // Body
  const bs = isReel ? Math.round(W * 0.039) : Math.round(W * 0.034);
  ctx.font = `${bs}px ${font}`;
  ctx.fillStyle = theme.textColor;
  y = wrapText(ctx, item.body, pad, y, cw, bs * 1.65, isReel ? 22 : 16);
  y += Math.round(bs * 0.7);

  // Hashtags
  if (item.hashtags?.length) {
    const hs = Math.round(W * 0.025);
    ctx.font = `${hs}px ${font}`;
    ctx.fillStyle = theme.accentColor;
    wrapText(ctx, item.hashtags.slice(0, 6).join('  '), pad, y, cw, hs * 1.5, 2);
  }

  // Watermark
  if (showWatermark && watermark) {
    const ws = Math.round(W * 0.02);
    ctx.font = `${ws}px ${font}`;
    ctx.fillStyle = theme.fadedColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(watermark, W - pad, H - Math.round(W * 0.025));
  }

  // Bottom stripe
  ctx.fillStyle = theme.accentColor;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(0, H - 5, W, 5);
}

export function downloadCardAsImage(
  item: { title: string; body: string; hashtags?: string[]; bestPlatform?: string },
  opts: ExportOptions
): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = opts.format === 'reel' ? 1920 : 1080;
  drawCardToCanvas(canvas, item, opts);
  return new Promise(resolve => {
    canvas.toBlob(blob => {
      if (!blob) return resolve();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${(item.title || 'post').slice(0, 25).replace(/[^\w]/g, '_').toLowerCase()}_${opts.format}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
      setTimeout(resolve, 150);
    }, 'image/png');
  });
}

export async function downloadMultiple(
  items: { title: string; body: string; hashtags?: string[]; bestPlatform?: string }[],
  opts: ExportOptions,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    await downloadCardAsImage(items[i], opts);
    onProgress?.(i + 1, items.length);
    if (i < items.length - 1) await new Promise(r => setTimeout(r, 350));
  }
}
