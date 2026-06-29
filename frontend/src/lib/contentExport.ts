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
  // ── Open-book / editorial collection ─────────────────────────────────────
  { id: 'manuscript', name: 'Manuscript', isGradient: true,  from: '#f5f0e8', to: '#ede4d3', textColor: '#1c1208', fadedColor: 'rgba(28,18,8,0.38)',     accentColor: '#8b6914', cssBg: 'linear-gradient(160deg,#f5f0e8 0%,#ede4d3 100%)' },
  { id: 'oxford',     name: 'Oxford',     isGradient: true,  from: '#0d1b2e', to: '#1a2f4e', textColor: '#f0ead6', fadedColor: 'rgba(240,234,214,0.45)', accentColor: '#c9a941', cssBg: 'linear-gradient(160deg,#0d1b2e 0%,#1a2f4e 100%)' },
  { id: 'library',    name: 'Library',    isGradient: true,  from: '#2c1a0e', to: '#4a2c14', textColor: '#f2e8d5', fadedColor: 'rgba(242,232,213,0.45)', accentColor: '#d4a853', cssBg: 'linear-gradient(160deg,#2c1a0e 0%,#4a2c14 100%)' },
  { id: 'parchment',  name: 'Parchment',  isGradient: true,  from: '#e8dcc8', to: '#d6c9a8', textColor: '#2a1f10', fadedColor: 'rgba(42,31,16,0.4)',     accentColor: '#8b4513', cssBg: 'linear-gradient(160deg,#e8dcc8 0%,#d6c9a8 100%)' },
  { id: 'inkpaper',   name: 'Ink & Paper',isGradient: false, from: '#f8f7f2', to: '#f8f7f2', textColor: '#0f0f0f', fadedColor: 'rgba(15,15,15,0.38)',    accentColor: '#c41e3a', cssBg: '#f8f7f2' },
  { id: 'emerald',    name: 'Emerald',    isGradient: true,  from: '#0d2b1e', to: '#1a4a30', textColor: '#e8f5ee', fadedColor: 'rgba(232,245,238,0.45)', accentColor: '#d4a853', cssBg: 'linear-gradient(160deg,#0d2b1e 0%,#1a4a30 100%)' },
  // ── Professional editorial tones ──────────────────────────────────────────
  { id: 'slate',      name: 'Slate',      isGradient: true,  from: '#1e2530', to: '#2d3748', textColor: '#e2e8f0', fadedColor: 'rgba(226,232,240,0.42)', accentColor: '#7eb8e8', cssBg: 'linear-gradient(160deg,#1e2530 0%,#2d3748 100%)' },
  { id: 'crimson',    name: 'Crimson',    isGradient: true,  from: '#2d0a14', to: '#4a1020', textColor: '#f5e6ea', fadedColor: 'rgba(245,230,234,0.45)', accentColor: '#e8a0a8', cssBg: 'linear-gradient(160deg,#2d0a14 0%,#4a1020 100%)' },
  { id: 'ivory',      name: 'Ivory',      isGradient: true,  from: '#fffff0', to: '#f5f5dc', textColor: '#1a1a2e', fadedColor: 'rgba(26,26,46,0.38)',    accentColor: '#1a1a2e', cssBg: 'linear-gradient(160deg,#fffff0 0%,#f5f5dc 100%)' },
  { id: 'ebony',      name: 'Ebony',      isGradient: false, from: '#0a0a0a', to: '#0a0a0a', textColor: '#f0f0f0', fadedColor: 'rgba(240,240,240,0.38)', accentColor: '#c0c0c0', cssBg: '#0a0a0a' },
  { id: 'goldleaf',   name: 'Gold Leaf',  isGradient: true,  from: '#1a1408', to: '#2e2410', textColor: '#f0e6c0', fadedColor: 'rgba(240,230,192,0.45)', accentColor: '#d4a017', cssBg: 'linear-gradient(160deg,#1a1408 0%,#2e2410 100%)' },
  { id: 'charcoal',   name: 'Charcoal',   isGradient: true,  from: '#2a2a2a', to: '#404040', textColor: '#f4f4f4', fadedColor: 'rgba(244,244,244,0.42)', accentColor: '#a8c4d4', cssBg: 'linear-gradient(160deg,#2a2a2a 0%,#404040 100%)' },
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

function hexLuminance(hex: string): number {
  const h = hex.replace('#', '');
  if (h.length < 6) return 0.5;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
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

// ── Dialog card: bubble helper ────────────────────────────────────────────────
function drawBubble(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, y: number,
  maxW: number,
  bgColor: string, bgAlpha: number,
  textColor: string,
  fontSize: number, font: string,
  bubblePad: number, radius: number,
): number {
  ctx.font = `${fontSize}px ${font}`;
  const innerW = maxW - bubblePad * 2;
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > innerW && line) { lines.push(line); line = word; }
    else { line = test; }
  }
  if (line) lines.push(line);
  const bh = lines.length * fontSize * 1.5 + bubblePad * 2;
  ctx.fillStyle = bgColor;
  ctx.globalAlpha = bgAlpha;
  rrect(ctx, x, y, maxW, bh, radius);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = textColor;
  ctx.textAlign = 'left';
  let ty = y + bubblePad + fontSize;
  for (const l of lines) { ctx.fillText(l, x + bubblePad, ty); ty += fontSize * 1.5; }
  return y + bh;
}

// ── Dialog card canvas ────────────────────────────────────────────────────────
export function drawDialogCardToCanvas(
  canvas: HTMLCanvasElement,
  item: { title: string; dialogue?: { speaker: string; text: string }[]; hashtags?: string[]; bestPlatform?: string },
  opts: ExportOptions,
): void {
  const { theme, showWatermark, watermark } = opts;
  const font = getFontName(opts.fontId);
  const isReel = opts.format === 'reel';
  const W = canvas.width;
  const H = canvas.height;
  const pad = Math.round(W * 0.06);
  const cw  = W - pad * 2;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, W, H);
  applyBg(ctx, theme, W, H);

  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.fillStyle = theme.textColor;
  ctx.beginPath();
  ctx.arc(W * 0.5, -W * 0.07, W * 0.52, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  let y = pad * 1.3;

  // Title
  const ts = isReel ? Math.round(W * 0.048) : Math.round(W * 0.044);
  ctx.font = `bold ${ts}px ${font}`;
  ctx.fillStyle = theme.textColor;
  y = wrapText(ctx, item.title, pad, y, cw, ts * 1.3, 2);
  y += Math.round(ts * 0.3);

  // Divider
  ctx.fillStyle = theme.accentColor;
  ctx.globalAlpha = 0.45;
  ctx.fillRect(pad, y, cw, 2);
  ctx.globalAlpha = 1;
  y += Math.round(W * 0.032);

  // Bubbles
  const dialogue = item.dialogue || [];
  const bs = Math.round(W * 0.026);
  const ns = Math.round(W * 0.019);
  const bp = Math.round(W * 0.028);
  const bw = Math.round(cw * 0.73);
  const br = Math.round(W * 0.018);
  const gap = Math.round(W * 0.022);

  for (const line of dialogue) {
    const isT  = line.speaker === 'T';
    const name = isT ? 'Tinyuwizev1.1' : 'Fatikaramuv1.0';
    const bx   = isT ? pad : W - pad - bw;
    // Name label
    ctx.font = `bold ${ns}px ${font}`;
    ctx.fillStyle = isT ? theme.accentColor : theme.textColor;
    ctx.globalAlpha = isT ? 1 : 0.65;
    ctx.textAlign = isT ? 'left' : 'right';
    ctx.fillText(name, isT ? pad : W - pad, y);
    ctx.globalAlpha = 1;
    y += Math.round(ns * 1.4);
    // Bubble — ensure high contrast regardless of theme
    const accentIsLight = hexLuminance(theme.accentColor) > 0.42;
    const bgColor = isT ? theme.accentColor : '#d8e8f4';
    const bgAlpha = 0.94;
    const textCol = isT ? (accentIsLight ? '#0d0d14' : '#f5f5f8') : '#0d0d14';
    ctx.textAlign = 'left';
    y = drawBubble(ctx, line.text, bx, y, bw, bgColor, bgAlpha, textCol, bs, font, bp, br) + gap;
    if (y > H * 0.83) break;
  }

  // Hashtags
  if (item.hashtags?.length && y < H * 0.88) {
    const hs = Math.round(W * 0.022);
    ctx.font = `${hs}px ${font}`;
    ctx.fillStyle = theme.accentColor;
    ctx.textAlign = 'left';
    wrapText(ctx, item.hashtags.slice(0, 5).join('  '), pad, y + hs, cw, hs * 1.5, 2);
  }

  // Watermark
  if (showWatermark && watermark) {
    const ws = Math.round(W * 0.019);
    ctx.font = `${ws}px ${font}`;
    ctx.fillStyle = theme.fadedColor;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(watermark, W - pad, H - Math.round(W * 0.024));
  }

  // Bottom stripe
  ctx.fillStyle = theme.accentColor;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(0, H - 5, W, 5);
}

export function downloadCardAsImage(
  item: { title: string; body?: string; dialogue?: { speaker: string; text: string }[]; hashtags?: string[]; bestPlatform?: string; content_type?: string },
  opts: ExportOptions
): Promise<void> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = opts.format === 'reel' ? 1920 : 1080;
  const dlg = item.dialogue ?? (item.content_type === 'dialog' ? (() => { try { return JSON.parse(item.body || '[]'); } catch { return undefined; } })() : undefined);
  if (dlg && dlg.length > 0) {
    drawDialogCardToCanvas(canvas, { ...item, dialogue: dlg }, opts);
  } else {
    drawCardToCanvas(canvas, { title: item.title, body: item.body || '', hashtags: item.hashtags, bestPlatform: item.bestPlatform }, opts);
  }
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
  items: { title: string; body?: string; dialogue?: { speaker: string; text: string }[]; hashtags?: string[]; bestPlatform?: string; content_type?: string }[],
  opts: ExportOptions,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    await downloadCardAsImage(items[i], opts);
    onProgress?.(i + 1, items.length);
    if (i < items.length - 1) await new Promise(r => setTimeout(r, 350));
  }
}

// ── Instagram carousel: draw with slide number overlay ────────────────────────
export async function downloadAsCarousel(
  items: { title: string; body?: string; dialogue?: { speaker: string; text: string }[]; hashtags?: string[]; bestPlatform?: string; content_type?: string }[],
  opts: ExportOptions,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const total = items.length;
  for (let i = 0; i < total; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = opts.format === 'reel' ? 1920 : 1080;
    const item = items[i];
    const dlg = item.dialogue ?? (item.content_type === 'dialog' ? (() => { try { return JSON.parse(item.body || '[]'); } catch { return undefined; } })() : undefined);
    if (dlg && dlg.length > 0) {
      drawDialogCardToCanvas(canvas, { ...item, dialogue: dlg }, opts);
    } else {
      drawCardToCanvas(canvas, { title: item.title, body: item.body || '', hashtags: item.hashtags, bestPlatform: item.bestPlatform }, opts);
    }
    // Slide counter overlay
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;
    const pad = Math.round(W * 0.04);
    const fs  = Math.round(W * 0.022);
    const label = `${i + 1} / ${total}`;
    ctx.font = `bold ${fs}px Arial`;
    const tw = ctx.measureText(label).width;
    const bw = tw + fs * 1.2;
    const bh = fs * 1.8;
    const bx = W - pad - bw;
    const by = pad;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + bw / 2, by + bh / 2);
    // IG dots indicator at bottom
    const dotR = Math.round(W * 0.008);
    const dotsY = H - Math.round(W * 0.045);
    const spacing = dotR * 3;
    const startX = W / 2 - ((total - 1) * spacing) / 2;
    for (let d = 0; d < Math.min(total, 10); d++) {
      ctx.beginPath();
      ctx.arc(startX + d * spacing, dotsY, dotR, 0, Math.PI * 2);
      ctx.fillStyle = d === i ? '#ffffff' : 'rgba(255,255,255,0.38)';
      ctx.globalAlpha = 1;
      ctx.fill();
    }
    await new Promise<void>(resolve => {
      canvas.toBlob(blob => {
        if (!blob) return resolve();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `carousel_${String(i + 1).padStart(2, '0')}_of_${total}_${(item.title || '').slice(0, 15).replace(/[^\w]/g, '_').toLowerCase()}.png`;
        a.click();
        URL.revokeObjectURL(a.href);
        setTimeout(resolve, 350);
      }, 'image/png');
    });
    onProgress?.(i + 1, total);
  }
}
