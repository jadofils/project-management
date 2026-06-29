import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Lock, Loader2, X, Trash2, Send, Eye, EyeOff, Brain, Lightbulb, Heart,
  FlaskConical, Puzzle, Globe, Sparkles, Wand2, Download, FileText,
  CheckSquare, BarChart3, Search, Filter, ChevronLeft, ChevronRight,
  Edit3, Copy, Plus, BookOpen, Tag, TrendingUp, RefreshCw, Star, Zap,
  Save, Volume2, Film, ImageIcon, Mic, Check, Smile,
  Square as StopIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, type Project } from '../services/api';
import { ThreeDCardViewer } from './ThreeDCardViewer';
import {
  CARD_THEMES, FONT_OPTIONS, downloadCardAsImage, downloadMultiple, downloadAsCarousel,
  type CardTheme, type ExportFormat,
} from '../lib/contentExport';

// ── Icon map ──────────────────────────────────────────────────────────────────
type IconComp = React.ComponentType<{ className?: string }>;
const ICON_MAP: Record<string, IconComp> = {
  smile: Smile as IconComp, brain: Brain as IconComp, lightbulb: Lightbulb as IconComp,
  heart: Heart as IconComp, flask: FlaskConical as IconComp, puzzle: Puzzle as IconComp,
  globe: Globe as IconComp, sparkles: Sparkles as IconComp, star: Star as IconComp,
  zap: Zap as IconComp, trending: TrendingUp as IconComp, book: BookOpen as IconComp,
};
const getIcon = (k: string): IconComp => ICON_MAP[k] || (Sparkles as IconComp);

const PAGE_SIZE = 20;
type ContentTab  = 'generate' | 'drafts' | 'published' | 'categories' | 'analytics';
type ContentType = 'post' | 'reel' | 'audio' | 'dialog';

const PERSONAS = ['Universal', 'Gen Z', 'Millennials', 'Professionals', 'Students', 'Parents'] as const;
type Persona = typeof PERSONAS[number];

interface Props { projects: Project[]; section?: string; isAdmin?: boolean; }

// ── Auth Gate ─────────────────────────────────────────────────────────────────
function AuthGate({ onAuth }: { onAuth: () => void }) {
  const [pw, setPw]       = useState('');
  const [show, setShow]   = useState(false);
  const [loading, setLd]  = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLd(true);
    try {
      await api.verifyContentPassword(pw);
      sessionStorage.setItem('content_auth', '1');
      onAuth(); toast.success('Access granted');
    } catch (err: any) { toast.error(err.message || 'Invalid password'); }
    finally { setLd(false); }
  };
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-10 max-w-sm w-full shadow-sm text-center">
        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Lock className="w-8 h-8 text-indigo-500" />
        </div>
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Content Studio</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-7">Enter the studio password to continue</p>
        <form onSubmit={submit} className="space-y-3 text-left">
          <div className="relative">
            <input type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)}
              placeholder="Studio password" required autoFocus
              className="w-full px-3 py-2.5 pr-10 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
            <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-2.5 text-gray-400">
              {show ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>
          <button type="submit" disabled={loading || !pw}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}Unlock Studio
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Claude Mascot ─────────────────────────────────────────────────────────────
function ClaudeMascot({ message, size = 'md', thinking = false }: { message?: string; size?: 'sm' | 'md'; thinking?: boolean }) {
  const dim = size === 'sm' ? 44 : 60;
  return (
    <div className="flex items-end gap-2.5 select-none">
      {message && (
        <div className="relative bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-2xl rounded-bl-sm px-3 py-2.5 shadow-lg max-w-[200px]">
          <p className="text-[11px] leading-relaxed text-gray-700 dark:text-gray-200 font-medium">{message}</p>
          {thinking && (
            <div className="flex gap-1 mt-1.5">
              {[0,1,2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}
          <div className="absolute -bottom-2 left-5 w-0 h-0"
               style={{ borderLeft:'8px solid transparent', borderRight:'4px solid transparent', borderTop:`8px solid white` }} />
        </div>
      )}
      <svg width={dim} height={Math.round(dim * 1.28)} viewBox="0 0 56 72" fill="none" className="shrink-0 drop-shadow-md">
        {/* Antenna */}
        <line x1="28" y1="1" x2="28" y2="13" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="28" cy="3" r="5" fill="#818cf8"/>
        <circle cx="28" cy="3" r="8" fill="#818cf8" opacity="0.15"/>
        {/* Head */}
        <rect x="3" y="11" width="50" height="38" rx="14" fill="#4f46e5"/>
        <rect x="3" y="11" width="50" height="38" rx="14" fill="url(#headGrad)" opacity="0.3"/>
        {/* Eye whites */}
        <ellipse cx="18" cy="28" rx="9" ry="9" fill="white"/>
        <ellipse cx="38" cy="28" rx="9" ry="9" fill="white"/>
        {/* Pupils */}
        <circle cx={thinking ? 20 : 19} cy={thinking ? 30 : 29} r="5.5" fill="#6366f1"/>
        <circle cx={thinking ? 40 : 39} cy={thinking ? 30 : 29} r="5.5" fill="#6366f1"/>
        {/* Shine */}
        <circle cx={thinking ? 21.5 : 20.5} cy={thinking ? 28 : 27} r="2.2" fill="white"/>
        <circle cx={thinking ? 41.5 : 40.5} cy={thinking ? 28 : 27} r="2.2" fill="white"/>
        {/* Smile */}
        <path d={thinking ? "M19 39 Q28 37 37 39" : "M19 39 Q28 46 37 39"}
              stroke="rgba(255,255,255,0.75)" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
        {/* Body */}
        <rect x="9" y="49" width="38" height="21" rx="9" fill="#4338ca" opacity="0.9"/>
        {/* Chest orb */}
        <circle cx="28" cy="59" r="6.5" fill="#818cf8"/>
        <circle cx="29.5" cy="57.5" r="2.5" fill="white" opacity="0.65"/>
        {/* Arms */}
        <path d="M9 55 L1 47" stroke="#4338ca" strokeWidth="5.5" strokeLinecap="round"/>
        <path d="M47 55 L55 47" stroke="#4338ca" strokeWidth="5.5" strokeLinecap="round"/>
        <defs>
          <linearGradient id="headGrad" x1="3" y1="11" x2="53" y2="49" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="white"/>
            <stop offset="100%" stopColor="transparent"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// ── Single large card for card-by-card viewer ─────────────────────────────────
function BigCard({ item, theme, fontCss, contentType }: {
  item: any; theme: CardTheme; fontCss: string; contentType: ContentType;
}) {
  const dialogue: { speaker: string; text: string }[] | null = contentType === 'dialog'
    ? (item.dialogue ?? (() => { try { return JSON.parse(item.body || '[]'); } catch { return null; } })())
    : null;
  const scoreColor = item.engagementScore >= 8 ? '#22c55e' : item.engagementScore >= 6 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative rounded-3xl overflow-hidden w-full shadow-2xl"
         style={{ background: theme.cssBg, color: theme.textColor, fontFamily: fontCss, minHeight: 380 }}>
      {/* Decorative blobs */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
           style={{ background: theme.textColor, opacity: 0.05 }} />
      <div className="absolute -bottom-12 -left-10 w-40 h-40 rounded-full pointer-events-none"
           style={{ background: theme.accentColor, opacity: 0.08 }} />

      {/* Top badges */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-2">
        {item.bestPlatform ? (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                style={{ background: theme.accentColor + '28', color: theme.accentColor }}>
            {item.bestPlatform}
          </span>
        ) : <span />}
        {item.engagementScore && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full shadow-sm"
                style={{ background: scoreColor, color: '#fff' }}>
            ⚡ {item.engagementScore}/10 viral score
          </span>
        )}
      </div>

      {/* Title */}
      <div className="relative z-10 px-5 pb-3">
        <h3 className="text-lg font-extrabold leading-snug">{item.title}</h3>
      </div>

      {/* Body */}
      <div className="relative z-10 px-5 pb-4 flex-1">
        {dialogue && dialogue.length > 0 ? (
          <div className="space-y-2.5">
            {dialogue.map((line, i) => (
              <div key={i} className={`flex ${line.speaker === 'T' ? 'justify-start' : 'justify-end'}`}>
                <div className="max-w-[85%]">
                  <span className="text-[9px] font-bold uppercase opacity-60 px-1">
                    {line.speaker === 'T' ? 'Tinyuwise' : 'Fatikaram'}
                  </span>
                  <div className="text-sm leading-relaxed px-3 py-2 rounded-2xl mt-0.5"
                       style={{
                         background: line.speaker === 'T' ? theme.accentColor + '40' : 'rgba(255,255,255,0.18)',
                         color: theme.textColor,
                       }}>
                    {line.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ opacity: 0.88 }}>{item.body}</p>
        )}
      </div>

      {/* Hashtags */}
      {item.hashtags?.length > 0 && (
        <div className="relative z-10 px-5 pb-5 flex flex-wrap gap-1.5">
          {(item.hashtags as string[]).map((h: string) => (
            <span key={h} className="text-[11px] font-bold" style={{ color: theme.accentColor }}>{h}</span>
          ))}
        </div>
      )}

      {/* Bottom stripe */}
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: theme.accentColor, opacity: 0.5 }} />
    </div>
  );
}

// ── Themed Content Card ───────────────────────────────────────────────────────
function ContentCard({ item, theme, fontCss, isSelected, onToggle, onPreview, contentType }: {
  item: any; theme: CardTheme; fontCss: string; isSelected: boolean;
  onToggle: () => void; onPreview: () => void; contentType: ContentType;
}) {
  const dialogue: { speaker: string; text: string }[] | null = contentType === 'dialog'
    ? (item.dialogue ?? (() => { try { return JSON.parse(item.body || '[]'); } catch { return null; } })())
    : null;

  const scoreColor = item.engagementScore >= 8 ? '#22c55e' : item.engagementScore >= 6 ? '#f59e0b' : '#ef4444';

  return (
    <div onClick={onToggle}
      className="relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200"
      style={{
        background: theme.cssBg, color: theme.textColor, fontFamily: fontCss,
        aspectRatio: '4/5',
        boxShadow: isSelected
          ? `0 0 0 3px ${theme.accentColor}, 0 10px 30px rgba(0,0,0,0.25)`
          : '0 4px 18px rgba(0,0,0,0.10)',
        transform: isSelected ? 'scale(1.025)' : undefined,
      }}>

      {/* Decorative circles */}
      <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full pointer-events-none"
           style={{ background: theme.textColor, opacity: 0.06 }} />
      <div className="absolute -bottom-8 -left-6 w-24 h-24 rounded-full pointer-events-none"
           style={{ background: theme.accentColor, opacity: 0.09 }} />

      {/* Checkbox */}
      <button onClick={e => { e.stopPropagation(); onToggle(); }}
        className="absolute top-2.5 right-2.5 z-20 w-6 h-6 rounded-full flex items-center justify-center shadow transition-all"
        style={{
          background: isSelected ? theme.accentColor : 'rgba(0,0,0,0.28)',
          border: `2px solid ${isSelected ? theme.accentColor : 'rgba(255,255,255,0.4)'}`,
        }}>
        {isSelected && <Check className="w-3.5 h-3.5" style={{ color: theme.from }} />}
      </button>

      {/* Eye icon */}
      <button onClick={e => { e.stopPropagation(); onPreview(); }}
        className="absolute top-2.5 left-2.5 z-20 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}>
        <Eye className="w-3.5 h-3.5" />
      </button>

      {/* Content type tag */}
      {contentType !== 'post' && (
        <div className="absolute bottom-2.5 left-2.5 z-20">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
            style={{ background: theme.accentColor + '30', color: theme.accentColor }}>
            {contentType}
          </span>
        </div>
      )}

      {/* Engagement score badge */}
      {item.engagementScore && (
        <div className="absolute bottom-2.5 right-2.5 z-20">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow"
            style={{ background: scoreColor, color: '#fff' }}>
            {item.engagementScore}/10
          </span>
        </div>
      )}

      {/* Body */}
      <div className="relative z-10 p-4 flex flex-col h-full gap-2">
        {item.bestPlatform ? (
          <span className="self-start text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: theme.accentColor + '25', color: theme.accentColor }}>
            {item.bestPlatform}
          </span>
        ) : <div className="h-5" />}

        <h3 className="font-bold text-sm leading-snug line-clamp-3 flex-shrink-0">{item.title}</h3>

        {dialogue && dialogue.length > 0 ? (
          <div className="flex-1 space-y-1.5 overflow-hidden">
            {dialogue.slice(0, 5).map((line, i) => (
              <div key={i} className={`flex ${line.speaker === 'T' ? 'justify-start' : 'justify-end'}`}>
                <span className="text-[9px] leading-relaxed px-2 py-1 rounded-xl max-w-[88%] break-words"
                  style={{
                    background: line.speaker === 'T' ? theme.accentColor + '38' : 'rgba(255,255,255,0.15)',
                    color: theme.textColor,
                  }}>
                  {line.text.slice(0, 55)}{line.text.length > 55 ? '…' : ''}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs leading-relaxed line-clamp-6 flex-1"
             style={{ opacity: 0.82, whiteSpace: 'pre-wrap' }}>
            {item.body}
          </p>
        )}

        {item.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto pt-1">
            {(item.hashtags as string[]).slice(0, 4).map((h: string) => (
              <span key={h} className="text-[9px] font-semibold" style={{ color: theme.accentColor }}>{h}</span>
            ))}
          </div>
        )}
      </div>

      {/* Bottom stripe */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px]"
           style={{ background: theme.accentColor, opacity: 0.35 }} />
    </div>
  );
}

// ── Preview Modal ─────────────────────────────────────────────────────────────
function PreviewModal({ item, theme, fontCss, fontId, onClose, onOpen3D, onSections }: {
  item: any; theme: CardTheme; fontCss: string; fontId: string; onClose: () => void;
  onOpen3D?: () => void; onSections?: () => void;
}) {
  const [pTheme, setPTheme]     = useState<CardTheme>(theme);
  const [format, setFormat]     = useState<ExportFormat>('post');
  const [showWm, setShowWm]     = useState(true);
  const [wm, setWm]             = useState('Tinyuwizev1.1');
  const [dl, setDl]             = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [formatting, setFmt]    = useState(false);
  const [fmtPlatform, setFmtPlatform] = useState('instagram');
  const [fmtResult, setFmtResult]     = useState<any>(null);
  const [showVariants, setShowVariants] = useState(false);
  const [variants, setVariants]         = useState<any[]>([]);
  const [loadingVariants, setLdVar]     = useState(false);

  const dialogue: { speaker: string; text: string }[] | null =
    item.dialogue ?? (item.content_type === 'dialog' ? (() => { try { return JSON.parse(item.body || '[]'); } catch { return null; } })() : null);

  const download = async () => {
    setDl(true);
    try {
      await downloadCardAsImage(item, { format, theme: pTheme, fontId, watermark: wm, showWatermark: showWm });
      toast.success('Downloaded');
    } catch { toast.error('Download failed'); }
    finally { setDl(false); }
  };

  const speak = () => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const text = dialogue
      ? dialogue.map(l => `${l.speaker === 'T' ? 'Tinyuwize: ' : 'Fatikara: '}${l.text}`).join('. ')
      : `${item.title}. ${item.body}`;
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.92; utt.pitch = 1;
    utt.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utt);
  };

  const formatForPlatform = async () => {
    setFmt(true); setFmtResult(null);
    try {
      const r = await api.aiFormatContent(item.title, item.body || '', fmtPlatform);
      setFmtResult(r);
    } catch { toast.error('Format failed'); }
    finally { setFmt(false); }
  };

  const loadVariants = async () => {
    setLdVar(true); setVariants([]);
    try {
      const r = await api.aiGenerateVariants(item.title, item.body || '');
      setVariants(Array.isArray(r) ? r : []);
      setShowVariants(true);
    } catch { toast.error('Variants failed'); }
    finally { setLdVar(false); }
  };

  const copyAsThread = () => {
    const body = item.body || '';
    const chunks: string[] = [];
    let remaining = body;
    let n = 1;
    while (remaining.length > 0) {
      const num = `${n}/`;
      const max = 280 - num.length - 3;
      if (remaining.length <= max + 3) { chunks.push(`${num} ${remaining}`); break; }
      let cut = remaining.lastIndexOf(' ', max);
      if (cut < 0) cut = max;
      chunks.push(`${num} ${remaining.slice(0, cut).trim()}…`);
      remaining = remaining.slice(cut).trim();
      n++;
    }
    navigator.clipboard.writeText(chunks.join('\n\n'));
    toast.success(`Copied as ${chunks.length}-part thread`);
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="flex gap-5 items-start max-h-[95vh]" onClick={e => e.stopPropagation()}>

        {/* Card Preview */}
        <div className="relative rounded-2xl overflow-hidden flex-shrink-0 shadow-2xl"
          style={{
            background: pTheme.cssBg, color: pTheme.textColor, fontFamily: fontCss,
            width: format === 'reel' ? '200px' : '320px',
            height: format === 'reel' ? '355px' : '320px',
          }}>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
               style={{ background: pTheme.textColor, opacity: 0.06 }} />
          <div className="relative z-10 p-5 flex flex-col h-full gap-2.5 overflow-hidden">
            {item.bestPlatform && (
              <span className="self-start text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: pTheme.accentColor + '25', color: pTheme.accentColor }}>
                {item.bestPlatform}
              </span>
            )}
            <h3 className="font-bold text-base leading-snug">{item.title}</h3>
            {dialogue && dialogue.length > 0 ? (
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {dialogue.map((line, i) => (
                  <div key={i} className={`flex ${line.speaker === 'T' ? 'justify-start' : 'justify-end'}`}>
                    <div className="max-w-[88%]">
                      <p className="text-[8px] font-bold mb-0.5 opacity-70" style={{ textAlign: line.speaker === 'T' ? 'left' : 'right' }}>
                        {line.speaker === 'T' ? 'Tinyuwize' : 'Fatikara'}
                      </p>
                      <span className="text-[9px] leading-relaxed px-2 py-1 rounded-xl inline-block"
                        style={{
                          background: line.speaker === 'T' ? pTheme.accentColor + '38' : 'rgba(255,255,255,0.2)',
                          color: pTheme.textColor,
                        }}>
                        {line.text}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] leading-relaxed flex-1 overflow-y-auto"
                 style={{ opacity: 0.85, whiteSpace: 'pre-wrap' }}>
                {fmtResult ? fmtResult.body : item.body}
              </p>
            )}
            {item.hashtags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 shrink-0">
                {(item.hashtags as string[]).slice(0, 5).map((h: string) => (
                  <span key={h} className="text-[9px] font-semibold" style={{ color: pTheme.accentColor }}>{h}</span>
                ))}
              </div>
            )}
            {showWm && wm && <p className="text-[8px] text-right opacity-40">{wm}</p>}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1"
               style={{ background: pTheme.accentColor, opacity: 0.3 }} />
        </div>

        {/* Controls panel */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 max-h-[90vh] overflow-y-auto" style={{ width: 280 }}>
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">Preview & Export</span>
            <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
          </div>

          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Theme</p>
          <div className="grid grid-cols-6 gap-1.5 mb-4">
            {CARD_THEMES.map(t => (
              <button key={t.id} onClick={() => setPTheme(t)} title={t.name}
                className="w-8 h-8 rounded-lg transition-all"
                style={{ background: t.cssBg, outline: pTheme.id === t.id ? `2.5px solid ${t.accentColor}` : 'none', outlineOffset: 2 }} />
            ))}
          </div>

          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Format</p>
          <div className="flex gap-2 mb-4">
            {([['post','Post (1:1)', ImageIcon], ['reel','Reel (9:16)', Film]] as const).map(([f, label, Icon]) => (
              <button key={f} onClick={() => setFormat(f as ExportFormat)}
                className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium border transition-colors ${format === f ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Watermark</p>
            <button onClick={() => setShowWm(s => !s)}
              className={`w-9 h-5 rounded-full transition-colors flex items-center ${showWm ? 'bg-indigo-500 justify-end' : 'bg-gray-200 dark:bg-gray-600 justify-start'}`}>
              <span className="w-4 h-4 bg-white rounded-full mx-0.5 shadow" />
            </button>
          </div>
          {showWm && (
            <input value={wm} onChange={e => setWm(e.target.value)}
              className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2 text-sm mb-3 focus:ring-2 focus:ring-indigo-300 outline-none" />
          )}

          <div className="space-y-2">
            <button onClick={download} disabled={dl}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {dl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download {format === 'reel' ? 'Reel' : 'Image'}
            </button>
            <button onClick={speak}
              className={`w-full py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 border transition-colors ${speaking ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              {speaking ? <><StopIcon className="w-3.5 h-3.5" />Stop</> : <><Volume2 className="w-3.5 h-3.5" />Play Audio</>}
            </button>
            <button onClick={() => { navigator.clipboard.writeText(`${item.title}\n\n${dialogue ? dialogue.map(l=>`${l.speaker==='T'?'T: ':'F: '}${l.text}`).join('\n') : item.body}`); toast.success('Copied'); }}
              className="w-full py-2 border dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2">
              <Copy className="w-3.5 h-3.5" />Copy Text
            </button>
            {!dialogue && (
              <button onClick={copyAsThread}
                className="w-full py-2 border dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2">
                <FileText className="w-3.5 h-3.5" />Copy as Thread
              </button>
            )}
            {onSections && !dialogue && (
              <button onClick={() => { onClose(); onSections(); }}
                className="w-full py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2 transition-opacity">
                <ChevronRight className="w-3.5 h-3.5" />View as Section Slides
              </button>
            )}
            {onOpen3D && (
              <button onClick={() => { onClose(); onOpen3D(); }}
                className="w-full py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2 transition-opacity">
                <Film className="w-3.5 h-3.5" />Open in 3D Studio
              </button>
            )}
          </div>

          {/* Platform formatter */}
          {!dialogue && (
            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Platform Formatter</p>
              <div className="flex gap-2 mb-2">
                <select value={fmtPlatform} onChange={e => setFmtPlatform(e.target.value)}
                  className="flex-1 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-300 outline-none">
                  {['instagram','tiktok','twitter','linkedin','facebook'].map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
                <button onClick={formatForPlatform} disabled={formatting}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1">
                  {formatting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}Format
                </button>
              </div>
              {fmtResult && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-xs">
                  <p className="font-semibold text-purple-700 dark:text-purple-400 mb-1">{fmtResult.title}</p>
                  <p className="text-gray-600 dark:text-gray-400 line-clamp-3">{fmtResult.body}</p>
                  {fmtResult.note && <p className="text-[10px] text-purple-500 mt-1 italic">{fmtResult.note}</p>}
                  <button onClick={() => navigator.clipboard.writeText(`${fmtResult.title}\n\n${fmtResult.body}`).then(() => toast.success('Copied'))}
                    className="mt-1.5 text-purple-600 text-[10px] font-medium hover:underline flex items-center gap-1">
                    <Copy className="w-3 h-3" />Copy formatted
                  </button>
                </div>
              )}
            </div>
          )}

          {/* A/B title variants */}
          {!dialogue && (
            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">A/B Title Variants</p>
                <button onClick={loadVariants} disabled={loadingVariants}
                  className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white rounded-lg text-[10px] font-medium hover:bg-amber-600 disabled:opacity-50">
                  {loadingVariants ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}Generate
                </button>
              </div>
              {showVariants && variants.length > 0 && (
                <div className="space-y-1.5">
                  {variants.map((v, i) => (
                    <div key={i} className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-2.5">
                      <p className="text-xs font-medium text-gray-800 dark:text-gray-100 leading-snug">{v.title}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 font-medium">{v.trigger}</span>
                        <button onClick={() => { navigator.clipboard.writeText(v.title); toast.success('Copied'); }}
                          className="text-[9px] text-amber-600 hover:underline flex items-center gap-0.5">
                          <Copy className="w-2.5 h-2.5" />copy
                        </button>
                      </div>
                      {v.why && <p className="text-[9px] text-gray-400 mt-0.5 italic">{v.why}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Bulk Export Modal ─────────────────────────────────────────────────────────
function ExportModal({ items, theme, fontId, onClose }: {
  items: any[]; theme: CardTheme; fontId: string; onClose: () => void;
}) {
  const [format, setFormat]   = useState<ExportFormat>('post');
  const [showWm, setShowWm]   = useState(true);
  const [wm, setWm]           = useState('Tinyuwizev1.1');
  const [mode, setMode]       = useState<'separate' | 'carousel'>('separate');
  const [progress, setProg]   = useState<{ done: number; total: number } | null>(null);

  const run = async () => {
    setProg({ done: 0, total: items.length });
    const opts = { format, theme, fontId, watermark: wm, showWatermark: showWm };
    try {
      if (mode === 'carousel') {
        await downloadAsCarousel(items, opts, (done, total) => setProg({ done, total }));
        toast.success(`${items.length} Instagram carousel slides downloaded`);
      } else {
        await downloadMultiple(items, opts, (done, total) => setProg({ done, total }));
        toast.success(`${items.length} ${format === 'reel' ? 'reels' : 'images'} downloaded`);
      }
      onClose();
    } catch { toast.error('Export failed'); setProg(null); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
         onClick={!progress ? onClose : undefined}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Download className="w-4 h-4 text-indigo-500" />Export {items.length} item{items.length !== 1 ? 's' : ''}
          </h3>
          {!progress && <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>}
        </div>

        {progress ? (
          <div className="text-center py-4">
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mb-3">
              <div className="bg-indigo-600 h-2 rounded-full transition-all"
                   style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Downloading {progress.done} of {progress.total}...</p>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Format</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['post', 'Post Image', '1080 x 1080', ImageIcon],
                  ['reel', 'Reel / Story', '1080 x 1920', Film],
                ] as const).map(([f, label, dims, Icon]) => (
                  <button key={f} onClick={() => setFormat(f as ExportFormat)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${format === f ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                    <Icon className={`w-5 h-5 ${format === f ? 'text-indigo-500' : 'text-gray-400'}`} />
                    <span className={`text-xs font-semibold ${format === f ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}>{label}</span>
                    <span className="text-[10px] text-gray-400">{dims}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Creator Watermark</p>
                <button onClick={() => setShowWm(s => !s)}
                  className={`w-9 h-5 rounded-full transition-colors flex items-center ${showWm ? 'bg-indigo-500 justify-end' : 'bg-gray-200 dark:bg-gray-600 justify-start'}`}>
                  <span className="w-4 h-4 bg-white rounded-full mx-0.5 shadow" />
                </button>
              </div>
              {showWm && (
                <input value={wm} onChange={e => setWm(e.target.value)} placeholder="Your name / brand"
                  className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
              )}
              <p className="text-[10px] text-gray-400 mt-1">Added subtly to each exported image</p>
            </div>

            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Download Mode</p>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['separate', 'Separate Files', 'Individual downloads'],
                  ['carousel', 'Instagram Carousel', 'Numbered 1/N slides'],
                ] as const).map(([m, label, sub]) => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${mode === m ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700'}`}>
                    <p className={`text-xs font-semibold ${mode === m ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}>{label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={run}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              {mode === 'carousel' ? `Download ${items.length} Carousel Slides` : `Download ${items.length} ${format === 'reel' ? 'Reel' : 'Image'}${items.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Carousel Modal ────────────────────────────────────────────────────────────
function CarouselModal({ items, initialIdx, theme, fontCss, fontId, contentType, onClose }: {
  items: any[]; initialIdx: number; theme: CardTheme; fontCss: string; fontId: string;
  contentType: ContentType; onClose: () => void;
}) {
  const [idx, setIdx]           = useState(initialIdx);
  const [format, setFormat]     = useState<ExportFormat>('post');
  const [showWm, setShowWm]     = useState(true);
  const [wm, setWm]             = useState('Tinyuwizev1.1');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const item = items[idx];
  const dialogue: { speaker: string; text: string }[] | null =
    contentType === 'dialog'
      ? (item.dialogue ?? (() => { try { return JSON.parse(item.body || '[]'); } catch { return null; } })())
      : null;

  const prev = () => setIdx(i => (i - 1 + items.length) % items.length);
  const next = () => setIdx(i => (i + 1) % items.length);

  const dlSingle = async () => {
    await downloadCardAsImage(item, { format, theme, fontId, watermark: wm, showWatermark: showWm });
    toast.success('Downloaded');
  };

  const dlCarousel = async () => {
    setProgress({ done: 0, total: items.length });
    try {
      await downloadAsCarousel(items, { format, theme, fontId, watermark: wm, showWatermark: showWm },
        (done, total) => setProgress({ done, total }));
      toast.success(`${items.length} carousel slides downloaded`);
    } catch { toast.error('Export failed'); }
    finally { setProgress(null); }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-5xl flex items-center justify-center gap-4" onClick={e => e.stopPropagation()}>

        {/* Prev */}
        <button onClick={prev}
          className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        {/* Card */}
        <div className="flex flex-col items-center gap-4">
          {/* Counter */}
          <div className="flex items-center gap-2 mb-1">
            {items.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className="transition-all rounded-full"
                style={{ width: i === idx ? 20 : 8, height: 8, background: i === idx ? theme.accentColor : 'rgba(255,255,255,0.35)' }} />
            ))}
          </div>

          <div className="rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: theme.cssBg, color: theme.textColor, fontFamily: fontCss,
              width: format === 'reel' ? 280 : 420,
              height: format === 'reel' ? 498 : 420,
            }}>
            <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full pointer-events-none"
                 style={{ background: theme.textColor, opacity: 0.05 }} />
            <div className="relative z-10 p-6 flex flex-col h-full gap-3">
              {item.bestPlatform && (
                <span className="self-start text-[11px] font-bold px-2.5 py-1 rounded-full"
                  style={{ background: theme.accentColor + '22', color: theme.accentColor }}>
                  {item.bestPlatform}
                </span>
              )}
              <h3 className="font-bold text-lg leading-snug">{item.title}</h3>
              {dialogue && dialogue.length > 0 ? (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {dialogue.map((line, i) => (
                    <div key={i} className={`flex ${line.speaker === 'T' ? 'justify-start' : 'justify-end'}`}>
                      <div className="max-w-[86%]">
                        <p className="text-[9px] font-bold mb-0.5 opacity-60" style={{ textAlign: line.speaker === 'T' ? 'left' : 'right' }}>
                          {line.speaker === 'T' ? 'Tinyuwize' : 'Fatikara'}
                        </p>
                        <span className="text-xs leading-relaxed px-2.5 py-1.5 rounded-2xl inline-block"
                          style={{ background: line.speaker === 'T' ? theme.accentColor + '35' : 'rgba(255,255,255,0.18)', color: theme.textColor }}>
                          {line.text}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-relaxed flex-1 overflow-y-auto" style={{ opacity: 0.85, whiteSpace: 'pre-wrap' }}>
                  {item.body}
                </p>
              )}
              {item.hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 shrink-0">
                  {(item.hashtags as string[]).slice(0, 6).map((h: string) => (
                    <span key={h} className="text-[10px] font-semibold" style={{ color: theme.accentColor }}>{h}</span>
                  ))}
                </div>
              )}
              {showWm && wm && <p className="text-[9px] text-right opacity-35">{wm}</p>}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: theme.accentColor, opacity: 0.35 }} />
          </div>

          <p className="text-white/50 text-xs">{idx + 1} of {items.length}</p>

          {/* Controls */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 flex flex-col gap-3 w-full max-w-sm">
            <div className="flex gap-2">
              {([['post','Post 1:1', ImageIcon], ['reel','Reel 9:16', Film]] as const).map(([f, label, Icon]) => (
                <button key={f} onClick={() => setFormat(f)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-xs font-medium transition-colors ${format === f ? 'bg-white text-gray-900' : 'bg-white/15 text-white/70 hover:bg-white/25'}`}>
                  <Icon className="w-3 h-3" />{label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input value={wm} onChange={e => setWm(e.target.value)} placeholder="Watermark"
                className="flex-1 bg-white/15 text-white placeholder-white/40 rounded-xl px-3 py-1.5 text-xs outline-none focus:bg-white/25" />
              <button onClick={() => setShowWm(s => !s)}
                className={`w-9 h-5 rounded-full transition-colors flex items-center shrink-0 ${showWm ? 'bg-indigo-400 justify-end' : 'bg-white/20 justify-start'}`}>
                <span className="w-4 h-4 bg-white rounded-full mx-0.5 shadow" />
              </button>
            </div>
            {progress ? (
              <div>
                <div className="w-full bg-white/20 rounded-full h-1.5 mb-1">
                  <div className="bg-indigo-400 h-1.5 rounded-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                </div>
                <p className="text-white/60 text-xs text-center">{progress.done}/{progress.total} slides…</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={dlSingle}
                  className="py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-colors">
                  <Download className="w-3.5 h-3.5" />This slide
                </button>
                <button onClick={dlCarousel}
                  className="py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors">
                  <Download className="w-3.5 h-3.5" />Full Carousel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Next */}
        <button onClick={next}
          className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0 transition-colors">
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      </div>

      <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white">
        <X className="w-6 h-6" />
      </button>
    </div>
  );
}

// ── Edit Draft Modal ──────────────────────────────────────────────────────────
function EditDraftModal({ draft, categories, onSave, onClose }: {
  draft: any; categories: any[]; onSave: (u: any) => void; onClose: () => void;
}) {
  const [title, setTitle] = useState(draft.title);
  const [body, setBody]   = useState(draft.body);
  const [catId, setCatId] = useState(draft.category_id);
  const [saving, setSv]   = useState(false);
  const save = async () => {
    setSv(true);
    try {
      const u = await api.updateContentDraft(draft.id, { title, body, category_id: catId });
      onSave(u); toast.success('Saved'); onClose();
    } catch { toast.error('Save failed'); }
    finally { setSv(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
          <span className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-indigo-500" />Edit Draft
          </span>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
            <select value={catId} onChange={e => setCatId(e.target.value)}
              className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Content</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={12}
              className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm resize-none focus:ring-2 focus:ring-indigo-300 outline-none" />
            <p className="text-[10px] text-gray-400 mt-1 text-right">{body.length} chars</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">Cancel</button>
          <button onClick={save} disabled={saving || !title.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Category Form Modal ───────────────────────────────────────────────────────
function CategoryFormModal({ cat, onSave, onClose }: { cat?: any; onSave: () => void; onClose: () => void }) {
  const [name, setName] = useState(cat?.name || '');
  const [desc, setDesc] = useState(cat?.description || '');
  const [icon, setIcon] = useState(cat?.icon || 'sparkles');
  const [saving, setSv] = useState(false);
  const keys = Object.keys(ICON_MAP);
  const save = async () => {
    if (!name.trim()) return;
    setSv(true);
    try {
      cat?.id ? await api.updateContentCategory(cat.id, { name, description: desc, icon })
              : await api.createContentCategory({ name, description: desc, icon });
      toast.success(cat?.id ? 'Updated' : 'Created');
      onSave(); onClose();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setSv(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
          <span className="font-semibold text-gray-800 dark:text-gray-100">{cat?.id ? 'Edit Category' : 'New Category'}</span>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Category name"
              className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Short description"
              className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-2 block">Icon</label>
            <div className="grid grid-cols-6 gap-2">
              {keys.map(k => { const Ic = ICON_MAP[k]; return (
                <button key={k} onClick={() => setIcon(k)}
                  className={`p-2 rounded-xl flex items-center justify-center transition-all ${icon === k ? 'bg-indigo-100 dark:bg-indigo-900/40 ring-2 ring-indigo-400' : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'}`}>
                  <Ic className="w-4 h-4 text-indigo-500" />
                </button>
              ); })}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">Cancel</button>
          <button onClick={save} disabled={saving || !name.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}{cat?.id ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Publish Modal ─────────────────────────────────────────────────────────────
function PublishModal({ draft, projects, onPublished, onClose }: {
  draft: any; projects: Project[]; onPublished: () => void; onClose: () => void;
}) {
  const [projectId, setPid]   = useState(projects[0]?.id || '');
  const [schedAt, setSchedAt] = useState('');
  const [pub, setPub]         = useState(false);
  const isScheduled = schedAt.trim().length > 0;
  const publish = async () => {
    if (!projectId) return toast.error('Select a project');
    setPub(true);
    try {
      await api.publishContentDraft(draft.id, projectId, isScheduled ? new Date(schedAt).toISOString() : undefined);
      toast.success(isScheduled ? 'Scheduled' : 'Published'); onPublished(); onClose();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setPub(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
          <span className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Send className="w-4 h-4 text-green-500" />{isScheduled ? 'Schedule Post' : 'Publish Draft'}
          </span>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <strong className="text-gray-800 dark:text-gray-100">"{draft.title}"</strong>
          </p>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Project</label>
            <select value={projectId} onChange={e => setPid(e.target.value)}
              className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Schedule for later <span className="font-normal text-gray-400">(optional)</span></label>
            <input type="datetime-local" value={schedAt} onChange={e => setSchedAt(e.target.value)}
              className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
            {isScheduled && (
              <p className="text-[10px] text-amber-500 mt-1">Will be marked as "scheduled" — set up a cron to auto-publish</p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">Cancel</button>
          <button onClick={publish} disabled={pub || !projectId}
            className={`px-4 py-2 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5 ${isScheduled ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'}`}>
            {pub ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            {isScheduled ? 'Schedule' : 'Publish Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Draft list row ────────────────────────────────────────────────────────────
function DraftRow({ d, categories, onEdit, onDelete, onPublish, onPreview, onSlides }: {
  d: any; categories: any[];
  onEdit: () => void; onDelete: () => void; onPublish: () => void; onPreview: () => void; onSlides: () => void;
}) {
  const cat = categories.find(c => c.id === d.category_id);
  const Ic  = getIcon(cat?.icon);
  const isPub = d.status === 'published';
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-4 flex items-start gap-3 hover:shadow-sm transition-shadow">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-indigo-50 dark:bg-indigo-900/30">
        <Ic className="w-5 h-5 text-indigo-500" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug flex-1">{d.title}</p>
          <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isPub ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
            {d.status || 'draft'}
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{d.body}</p>
        {d.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {(Array.isArray(d.hashtags) ? d.hashtags as string[] : []).slice(0, 4).map((t: string) => (
              <span key={t} className="text-[9px] text-indigo-400 font-medium">{t}</span>
            ))}
          </div>
        )}
        <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-1">
          {new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          {d.best_platform && <> · {d.best_platform}</>}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onPreview} title="Preview" className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"><Eye className="w-3.5 h-3.5" /></button>
        <button onClick={onSlides}  title="Section slides" className="p-1.5 text-gray-400 hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-lg transition-colors"><ChevronRight className="w-3.5 h-3.5" /></button>
        <button onClick={onEdit}    title="Edit"    className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
        <button onClick={() => { navigator.clipboard.writeText(`${d.title}\n\n${d.body}`); toast.success('Copied'); }}
          title="Copy" className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"><Copy className="w-3.5 h-3.5" /></button>
        {!isPub && (
          <button onClick={onPublish} title="Publish" className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"><Send className="w-3.5 h-3.5" /></button>
        )}
        <button onClick={onDelete} title="Delete" className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

// ── Section splitter utility ──────────────────────────────────────────────────
function parseSections(title: string, body: string): { title: string; body: string }[] {
  // Detect header lines: ALL CAPS / Title-like line ending with ':'
  const headerRe = /^([A-Z][A-Z\s\W]{3,}):\s*$/m;
  const lines = body.split('\n');
  const sections: { title: string; body: string }[] = [];
  let curTitle = '';
  let curLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Detect section header: all caps (3+ chars) followed by ':'
    if (/^[A-Z\s\W]{3,}:$/.test(trimmed) && trimmed.length < 60) {
      if (curLines.filter(l => l.trim()).length > 0) {
        sections.push({ title: curTitle || title, body: curLines.join('\n').trim() });
      }
      curTitle = trimmed.replace(/:$/, '').trim();
      curLines = [];
    } else {
      curLines.push(line);
    }
  }
  if (curLines.filter(l => l.trim()).length > 0) {
    sections.push({ title: curTitle || title, body: curLines.join('\n').trim() });
  }

  // Fallback: split by double newlines into max-6 chunks
  if (sections.length < 2) {
    const chunks = body.split(/\n{2,}/).filter(c => c.trim()).map((c, i) => ({ title: `${title} (${i + 1})`, body: c.trim() }));
    return chunks.length > 1 ? chunks : [{ title, body }];
  }
  return sections;
}

// ── Section Carousel Modal ────────────────────────────────────────────────────
function SectionCarouselModal({ item, theme, fontCss, fontId, onClose }: {
  item: any; theme: CardTheme; fontCss: string; fontId: string; onClose: () => void;
}) {
  const sections = useMemo(() => parseSections(item.title, item.body || ''), [item]);
  const [idx, setIdx]           = useState(0);
  const [format, setFormat]     = useState<ExportFormat>('post');
  const [showWm, setShowWm]     = useState(true);
  const [wm, setWm]             = useState('Tinyuwizev1.1');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const cur = sections[idx];

  const dlAll = async () => {
    setProgress({ done: 0, total: sections.length });
    const opts = { format, theme, fontId, watermark: wm, showWatermark: showWm };
    try {
      await downloadAsCarousel(
        sections.map(s => ({ ...item, title: s.title, body: s.body })),
        opts, (done, total) => setProgress({ done, total })
      );
      toast.success(`${sections.length} section slides downloaded`);
      setProgress(null);
    } catch { toast.error('Export failed'); setProgress(null); }
  };

  const dlSingle = async () => {
    await downloadCardAsImage(
      { ...item, title: cur.title, body: cur.body },
      { format, theme, fontId, watermark: wm, showWatermark: showWm }
    );
    toast.success('Slide downloaded');
  };

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="flex gap-6 items-center" onClick={e => e.stopPropagation()}>

        {/* Prev */}
        <button onClick={() => setIdx(i => (i - 1 + sections.length) % sections.length)} disabled={sections.length < 2}
          className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center disabled:opacity-30 transition-colors">
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        <div className="flex flex-col items-center gap-4">
          {/* Dot indicator */}
          <div className="flex items-center gap-1.5">
            {sections.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className="rounded-full transition-all"
                style={{ width: i === idx ? 20 : 7, height: 7, background: i === idx ? theme.accentColor : 'rgba(255,255,255,0.4)' }} />
            ))}
          </div>

          {/* Card */}
          <div className="rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: theme.cssBg, color: theme.textColor, fontFamily: fontCss,
              width: format === 'reel' ? 240 : 380,
              height: format === 'reel' ? 426 : 380,
            }}>
            <div className="relative z-10 p-6 flex flex-col h-full gap-3 overflow-hidden">
              {/* Section number badge */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: theme.accentColor + '25', color: theme.accentColor }}>
                  {idx + 1} / {sections.length}
                </span>
                {item.bestPlatform && (
                  <span className="text-[10px] font-medium opacity-60">{item.bestPlatform}</span>
                )}
              </div>
              <h3 className="font-bold text-base leading-snug">{cur.title}</h3>
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: theme.accentColor, opacity: 0.4 }} />
              <p className="text-sm leading-relaxed flex-1 overflow-y-auto" style={{ opacity: 0.88, whiteSpace: 'pre-wrap' }}>
                {cur.body}
              </p>
              {item.hashtags?.length > 0 && idx === sections.length - 1 && (
                <div className="flex flex-wrap gap-1 shrink-0">
                  {(item.hashtags as string[]).slice(0, 5).map((h: string) => (
                    <span key={h} className="text-[9px] font-semibold" style={{ color: theme.accentColor }}>{h}</span>
                  ))}
                </div>
              )}
              {showWm && wm && <p className="text-[8px] text-right opacity-35">{wm}</p>}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: theme.accentColor, opacity: 0.35 }} />
          </div>

          <p className="text-white/50 text-xs">{cur.title}</p>

          {/* Controls */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 flex flex-col gap-3 w-full">
            <div className="flex gap-2">
              {([['post','Post 1:1', ImageIcon], ['reel','Reel 9:16', Film]] as const).map(([f, label, Icon]) => (
                <button key={f} onClick={() => setFormat(f)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl text-xs font-medium transition-colors ${format === f ? 'bg-white text-gray-900' : 'bg-white/15 text-white/70 hover:bg-white/25'}`}>
                  <Icon className="w-3 h-3" />{label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input value={wm} onChange={e => setWm(e.target.value)} placeholder="Watermark"
                className="flex-1 bg-white/15 text-white placeholder-white/40 rounded-xl px-3 py-1.5 text-xs outline-none" />
              <button onClick={() => setShowWm(s => !s)}
                className={`w-9 h-5 rounded-full flex items-center shrink-0 transition-colors ${showWm ? 'bg-indigo-400 justify-end' : 'bg-white/20 justify-start'}`}>
                <span className="w-4 h-4 bg-white rounded-full mx-0.5 shadow" />
              </button>
            </div>
            {progress ? (
              <div>
                <div className="w-full bg-white/20 rounded-full h-1.5 mb-1">
                  <div className="bg-indigo-400 h-1.5 rounded-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                </div>
                <p className="text-white/60 text-xs text-center">{progress.done}/{progress.total} slides…</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={dlSingle}
                  className="py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-colors">
                  <Download className="w-3.5 h-3.5" />This slide
                </button>
                <button onClick={dlAll}
                  className="py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors">
                  <Download className="w-3.5 h-3.5" />All {sections.length} slides
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Next */}
        <button onClick={() => setIdx(i => (i + 1) % sections.length)} disabled={sections.length < 2}
          className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center disabled:opacity-30 transition-colors">
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      </div>

      <button onClick={onClose} className="absolute top-4 right-4 text-white/60 hover:text-white">
        <X className="w-6 h-6" />
      </button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function ContentPanel({ projects, section, isAdmin }: Props) {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('content_auth') === '1');

  const sectionToTab = (s?: string): ContentTab => {
    if (s === 'content-drafts')     return 'drafts';
    if (s === 'content-published')  return 'published';
    if (s === 'content-categories') return 'categories';
    if (s === 'content-analytics')  return 'analytics';
    return 'generate';
  };
  const [tab, setTab] = useState<ContentTab>(() => sectionToTab(section));
  useEffect(() => { setTab(sectionToTab(section)); }, [section]);

  // Data
  const [categories, setCategories] = useState<any[]>([]);
  const [drafts, setDrafts]         = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);

  // Visual config
  const [activeTheme, setActiveTheme] = useState<CardTheme>(CARD_THEMES[0]);
  const [fontId, setFontId]           = useState('segoe');
  const fontCss = FONT_OPTIONS.find(f => f.id === fontId)?.css ?? "'Segoe UI', sans-serif";

  // Generate
  const [selectedCat, setSelectedCat]   = useState('');
  const [genCount, setGenCount]         = useState(10);
  const [customTopic, setCustomTopic]   = useState('');
  const [contentType, setContentType]   = useState<ContentType>('post');
  const [persona, setPersona]           = useState<Persona>('Universal');
  const [generating, setGenerating]     = useState(false);
  const [generated, setGenerated]       = useState<any[]>([]);
  const [selectedIdxs, setSelectedIdxs] = useState<Set<number>>(new Set());
  const [saving, setSaving]             = useState(false);
  const [previewItem, setPreviewItem]   = useState<any | null>(null);
  const [exportModal, setExportModal]   = useState(false);
  const [carouselModal, setCarouselModal] = useState<{ open: boolean; idx: number }>({ open: false, idx: 0 });
  const [studio3dItem, setStudio3dItem]     = useState<any | null>(null);
  const [sectionItem, setSectionItem]       = useState<any | null>(null);
  const [cardIdx, setCardIdx]               = useState(0);

  // Viral analyzer
  const [viralText, setViralText]     = useState('');
  const [viralResult, setViralResult] = useState<any>(null);
  const [viralLoading, setViralLoad]  = useState(false);

  // Library
  const [search, setSearch]           = useState('');
  const [filterCat, setFilterCat]     = useState('');
  const [page, setPage]               = useState(1);
  const [editDraft, setEditDraft]     = useState<any | null>(null);
  const [publishDraft, setPublishDraft] = useState<any | null>(null);
  const [previewDraft, setPreviewDraft] = useState<any | null>(null);

  // Categories
  const [catModal, setCatModal] = useState<{ open: boolean; cat?: any }>({ open: false });

  // Analytics
  const [analysis, setAnalysis]   = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [cats, drs] = await Promise.all([api.getContentCategories(), api.getContentDrafts()]);
      setCategories(cats);
      setDrafts(drs);
      if (cats.length > 0 && !selectedCat) setSelectedCat(cats[0].id);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (authed) load(); }, [authed, load]);

  if (!authed) return <AuthGate onAuth={() => setAuthed(true)} />;
  if (loading) return <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>;

  // Derived
  const allDrafts    = drafts.filter(d => d.status !== 'published');
  const allPublished = drafts.filter(d => d.status === 'published');
  const byCat        = categories.map(c => ({ ...c, count: drafts.filter(d => d.category_id === c.id).length }));

  const libBase     = tab === 'published' ? allPublished : allDrafts;
  const libFiltered = libBase.filter(d => {
    const q = search.toLowerCase();
    return (!q || d.title?.toLowerCase().includes(q) || d.body?.toLowerCase().includes(q))
        && (!filterCat || d.category_id === filterCat);
  });
  const totalPages = Math.ceil(libFiltered.length / PAGE_SIZE);
  const pageDrafts = libFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Actions
  const handleGenerate = async () => {
    if (!selectedCat) return toast.error('Select a category first');
    setGenerating(true); setGenerated([]); setSelectedIdxs(new Set());
    try {
      const items = await api.aiBatchGenerate(selectedCat, genCount, customTopic || undefined, contentType, persona);
      if (!Array.isArray(items) || items.length === 0) { toast.error('AI returned no content. Set AI_API_KEY (OpenAI) or ANTHROPIC_API_KEY in your Render server environment variables.'); return; }
      setGenerated(items);
      setCardIdx(0);
      setSelectedIdxs(new Set(items.map((_, i) => i)));
      const label = contentType === 'dialog' ? 'dialog cards' : contentType === 'reel' ? 'reel scripts' : contentType === 'audio' ? 'audio scripts' : 'posts';
      toast.success(`${items.length} ${label} generated`);
    } catch (e: any) { toast.error(e.message || 'Generation failed'); }
    finally { setGenerating(false); }
  };

  const toggleIdx = (i: number) => setSelectedIdxs(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const toggleAll = () => setSelectedIdxs(selectedIdxs.size === generated.length ? new Set() : new Set(generated.map((_, i) => i)));

  const removeCard = (i: number) => {
    const next = generated.filter((_, idx) => idx !== i);
    setGenerated(next);
    setSelectedIdxs(prev => {
      const n = new Set<number>();
      [...prev].forEach(old => { if (old < i) n.add(old); else if (old > i) n.add(old - 1); });
      return n;
    });
    setCardIdx(c => (next.length === 0 ? 0 : Math.min(c, next.length - 1)));
  };

  const saveSelected = async () => {
    if (selectedIdxs.size === 0) return toast.error('Select items to save');
    setSaving(true);
    try {
      const items = [...selectedIdxs].map(i => {
        const g = generated[i];
        const isDialog = contentType === 'dialog' && g.dialogue;
        return {
          category_id: selectedCat,
          title: g.title,
          body: isDialog ? JSON.stringify(g.dialogue) : (g.body || ''),
          hashtags: g.hashtags,
          best_platform: g.bestPlatform,
          content_type: contentType,
          engagement_score: g.engagementScore,
          persona,
          language: 'en',
        };
      });
      await api.bulkCreateContentDrafts(items);
      toast.success(`${items.length} drafts saved to library`);
      setGenerated([]); setSelectedIdxs(new Set()); load();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const runViralAnalysis = async () => {
    if (!viralText.trim()) return toast.error('Paste a post to analyze');
    setViralLoad(true); setViralResult(null);
    try { const r = await api.aiAnalyzePattern(viralText); setViralResult(r); }
    catch { toast.error('Analysis failed'); }
    finally { setViralLoad(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this draft?')) return;
    try { await api.deleteContentDraft(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
  };
  const handleDeleteCat = async (id: string) => {
    if (!confirm('Delete this category and all its content?')) return;
    try { await api.deleteContentCategory(id); toast.success('Deleted'); load(); } catch (e: any) { toast.error(e.message || 'Failed'); }
  };
  const runAnalysis = async () => {
    setAnalyzing(true);
    try { const r = await api.aiAnalyzeContent(); setAnalysis(r.insights); }
    catch { toast.error('Analysis failed'); }
    finally { setAnalyzing(false); }
  };

  const selectedItems = [...selectedIdxs].map(i => generated[i]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Modals */}
      {previewItem  && <PreviewModal item={previewItem}  theme={activeTheme} fontCss={fontCss} fontId={fontId} onClose={() => setPreviewItem(null)}  onOpen3D={() => setStudio3dItem(previewItem)}  onSections={() => setSectionItem(previewItem)} />}
      {previewDraft && <PreviewModal item={previewDraft} theme={activeTheme} fontCss={fontCss} fontId={fontId} onClose={() => setPreviewDraft(null)} onOpen3D={() => setStudio3dItem(previewDraft)} onSections={() => setSectionItem(previewDraft)} />}
      {exportModal && selectedItems.length > 0 && <ExportModal items={selectedItems} theme={activeTheme} fontId={fontId} onClose={() => setExportModal(false)} />}
      {carouselModal.open && generated.length > 0 && (
        <CarouselModal items={generated} initialIdx={carouselModal.idx} theme={activeTheme} fontCss={fontCss}
          fontId={fontId} contentType={contentType} onClose={() => setCarouselModal({ open: false, idx: 0 })} />
      )}
      {editDraft    && <EditDraftModal draft={editDraft} categories={categories} onSave={u => setDrafts(p => p.map(d => d.id === u.id ? u : d))} onClose={() => setEditDraft(null)} />}
      {publishDraft && <PublishModal draft={publishDraft} projects={projects} onPublished={load} onClose={() => setPublishDraft(null)} />}
      {catModal.open && <CategoryFormModal cat={catModal.cat} onSave={load} onClose={() => setCatModal({ open: false })} />}
      {studio3dItem && (
        studio3dItem.__all
          ? <ThreeDCardViewer items={generated} initialIdx={cardIdx} onClose={() => setStudio3dItem(null)} />
          : <ThreeDCardViewer item={studio3dItem} onClose={() => setStudio3dItem(null)} />
      )}
      {sectionItem  && <SectionCarouselModal item={sectionItem} theme={activeTheme} fontCss={fontCss} fontId={fontId} onClose={() => setSectionItem(null)} />}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 pt-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-500" />Content Studio
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Create viral posts, reels and audio scripts with AI</p>
          </div>
          <div className="flex items-center gap-5 text-center">
            <div><p className="text-lg font-bold text-gray-800 dark:text-gray-100">{allDrafts.length}</p><p className="text-[10px] text-gray-400">Drafts</p></div>
            <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
            <div><p className="text-lg font-bold text-green-600">{allPublished.length}</p><p className="text-[10px] text-gray-400">Published</p></div>
            <div className="w-px h-8 bg-gray-200 dark:bg-gray-700" />
            <div><p className="text-lg font-bold text-indigo-600">{categories.length}</p><p className="text-[10px] text-gray-400">Categories</p></div>
          </div>
        </div>

        <div className="flex items-center gap-0.5">
          {([
            { id: 'generate',   label: 'Generate',  Icon: Wand2 },
            { id: 'drafts',     label: 'Drafts',    Icon: FileText,    cnt: allDrafts.length },
            { id: 'published',  label: 'Published', Icon: CheckSquare, cnt: allPublished.length },
            { id: 'categories', label: 'Categories',Icon: Tag },
            { id: 'analytics',  label: 'Analytics', Icon: BarChart3 },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id as ContentTab)}
              className={`flex items-center gap-1.5 text-sm px-4 py-2.5 font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
              <t.Icon className="w-3.5 h-3.5" />{t.label}
              {'cnt' in t && (t.cnt ?? 0) > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>{t.cnt}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">

        {/* ─────────────── GENERATE ─────────────────────────────────── */}
        {tab === 'generate' && (
          <div className="p-6 max-w-6xl mx-auto space-y-5">

            {/* Visual controls */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-4 shadow-sm">
              <div className="flex flex-wrap items-start gap-6">

                {/* Theme palette */}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Card Theme — {activeTheme.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CARD_THEMES.map(t => (
                      <button key={t.id} onClick={() => setActiveTheme(t)} title={t.name}
                        className="w-8 h-8 rounded-xl shrink-0 transition-all"
                        style={{
                          background: t.cssBg,
                          outline: activeTheme.id === t.id ? `2.5px solid ${t.accentColor}` : 'none',
                          outlineOffset: 2,
                          boxShadow: activeTheme.id === t.id ? `0 0 0 4px ${t.accentColor}30` : undefined,
                        }} />
                    ))}
                  </div>
                </div>

                {/* Font */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Font</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {FONT_OPTIONS.map(f => (
                      <button key={f.id} onClick={() => setFontId(f.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${fontId === f.id ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-300'}`}
                        style={{ fontFamily: f.css }}>
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content type */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Type</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {([['post','Post',ImageIcon],['reel','Reel',Film],['audio','Audio',Mic],['dialog','Dialog',Sparkles]] as const).map(([ct,label,Icon]) => (
                      <button key={ct} onClick={() => setContentType(ct as ContentType)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border transition-colors ${contentType === ct ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-300'}`}>
                        <Icon className="w-3 h-3" />{label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Persona picker */}
              <div className="w-full mt-3 pt-3 border-t dark:border-gray-700">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Target Audience</p>
                <div className="flex flex-wrap gap-1.5">
                  {PERSONAS.map(p => (
                    <button key={p} onClick={() => setPersona(p)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${persona === p ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-indigo-300'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Category grid */}
            <div>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">Category</p>
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                {categories.map(cat => {
                  const Ic  = getIcon(cat.icon);
                  const sel = selectedCat === cat.id;
                  return (
                    <button key={cat.id} onClick={() => setSelectedCat(cat.id)}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all ${sel ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 shadow-md' : 'border-transparent bg-white dark:bg-gray-800 hover:border-gray-200 dark:hover:border-gray-600 shadow-sm'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${sel ? 'bg-indigo-100 dark:bg-indigo-900/60' : 'bg-gray-100 dark:bg-gray-700'}`}>
                        <Ic className={`w-4 h-4 ${sel ? 'text-indigo-500' : 'text-gray-500 dark:text-gray-400'}`} />
                      </div>
                      <span className="text-[9px] font-medium text-center leading-tight text-gray-700 dark:text-gray-300">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generation panel */}
            <div className="rounded-2xl p-5" style={{ background: activeTheme.cssBg, color: activeTheme.textColor }}>
              <div className="flex items-start justify-between mb-4 gap-4">
                <div>
                  <p className="font-bold text-base flex items-center gap-2" style={{ fontFamily: fontCss }}>
                    <Sparkles className="w-4 h-4" />
                    {contentType === 'dialog' ? 'Dialog Card Generator' : contentType === 'reel' ? 'Reel Script Engine' : contentType === 'audio' ? 'Audio Script Engine' : 'Post Generator'}
                  </p>
                  {contentType === 'dialog' && (
                    <p className="text-[11px] mt-0.5" style={{ opacity: 0.65 }}>Characters: Tinyuwizev1.1 vs Fatikaramuv1.0</p>
                  )}
                </div>
                <ClaudeMascot
                  size="sm"
                  thinking={generating}
                  message={generating
                    ? `Writing ${genCount} ${contentType}s...`
                    : generated.length > 0
                      ? `I made ${generated.length} for you! 🎉`
                      : `Ready to create ${genCount} ${contentType}${genCount > 1 ? 's' : ''}!`}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="sm:col-span-2">
                  <label className="text-xs mb-1 block" style={{ opacity: 0.7 }}>
                    {contentType === 'reel' ? 'Hook / video angle (optional)' : contentType === 'audio' ? 'Episode topic (optional)' : 'Topic / angle (optional)'}
                  </label>
                  <input value={customTopic} onChange={e => setCustomTopic(e.target.value)}
                    placeholder={
                      contentType === 'reel'  ? 'e.g. "gym fails at 6am that hit different"' :
                      contentType === 'audio' ? 'e.g. "why morning routines are overrated"' :
                                               'e.g. "why your phone knows you better than your mom"'
                    }
                    className="w-full text-sm rounded-xl px-3 py-2.5 border focus:outline-none"
                    style={{ background: 'rgba(0,0,0,0.22)', borderColor: 'rgba(255,255,255,0.22)', color: activeTheme.textColor, fontFamily: fontCss }} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ opacity: 0.7 }}>Count</label>
                  <select value={genCount} onChange={e => setGenCount(Number(e.target.value))}
                    className="w-full text-sm rounded-xl px-3 py-2.5 border focus:outline-none"
                    style={{ background: 'rgba(0,0,0,0.22)', borderColor: 'rgba(255,255,255,0.22)', color: activeTheme.textColor }}>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n} style={{ color: '#111', background: '#fff' }}>{n} {contentType === 'reel' ? 'reel' : contentType === 'audio' ? 'script' : contentType === 'dialog' ? 'dialog' : 'post'}{n > 1 ? 's' : ''}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleGenerate} disabled={generating || !selectedCat}
                className="px-8 py-3 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2 shadow-lg transition-transform hover:scale-[1.02]"
                style={{ background: activeTheme.accentColor, color: activeTheme.from }}>
                {generating
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</>
                  : <><Wand2 className="w-4 h-4" />Generate {genCount} {contentType === 'dialog' ? 'Dialog Cards' : contentType === 'reel' ? 'Reels' : contentType === 'audio' ? 'Scripts' : 'Posts'}</>}
              </button>
            </div>

            {/* Results — card-by-card viewer */}
            {generated.length > 0 && (
              <div className="space-y-4">

                {/* Status bar */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                      Card {cardIdx + 1} <span className="text-gray-400 font-normal">of {generated.length}</span>
                    </span>
                    <div className="flex gap-1">
                      {generated.map((_, i) => (
                        <button key={i} onClick={() => setCardIdx(i)}
                          className="rounded-full transition-all"
                          style={{
                            width: i === cardIdx ? 20 : 8,
                            height: 8,
                            background: i === cardIdx
                              ? activeTheme.accentColor
                              : selectedIdxs.has(i)
                                ? activeTheme.accentColor + '55'
                                : '#d1d5db',
                          }} />
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">{selectedIdxs.size} kept</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setCarouselModal({ open: true, idx: cardIdx })}
                      className="flex items-center gap-1.5 px-3 py-1.5 border dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
                      <Eye className="w-3 h-3" />Preview
                    </button>
                    <button onClick={() => setStudio3dItem({ __all: true })}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                      <Sparkles className="w-3 h-3" />3D View All
                    </button>
                    {selectedIdxs.size > 0 && (
                      <>
                        <button onClick={async () => {
                          const items = [...selectedIdxs].map(i => generated[i]);
                          toast('Downloading slides…');
                          const { downloadMultiple } = await import('../lib/contentExport');
                          await downloadMultiple(items, { format: 'post', theme: activeTheme, fontId, watermark: 'Content Studio', showWatermark: false });
                          toast.success(`${items.length} slides downloaded`);
                        }} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-xl text-xs font-semibold hover:bg-green-700">
                          <Download className="w-3 h-3" />Slides ({selectedIdxs.size} PNG)
                        </button>
                        <button onClick={() => setExportModal(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 dark:bg-gray-700 text-white rounded-xl text-xs font-semibold hover:bg-gray-700">
                          <Download className="w-3 h-3" />Export Options
                        </button>
                        <button onClick={saveSelected} disabled={saving}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50">
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}Save {selectedIdxs.size} to Library
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Main viewer: prev | card | next */}
                <div className="flex items-stretch gap-3">
                  {/* Prev arrow */}
                  <button onClick={() => setCardIdx(c => Math.max(0, c - 1))}
                    disabled={cardIdx === 0}
                    className="flex-shrink-0 w-10 flex items-center justify-center rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 disabled:opacity-20 transition-all shadow-sm self-center h-14">
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  {/* Card */}
                  <div className="flex-1 min-w-0">
                    <BigCard item={generated[cardIdx]} theme={activeTheme} fontCss={fontCss} contentType={contentType} />
                  </div>

                  {/* Next arrow */}
                  <button onClick={() => setCardIdx(c => Math.min(generated.length - 1, c + 1))}
                    disabled={cardIdx === generated.length - 1}
                    className="flex-shrink-0 w-10 flex items-center justify-center rounded-2xl border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 disabled:opacity-20 transition-all shadow-sm self-center h-14">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Action buttons for current card */}
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <button onClick={() => removeCard(cardIdx)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <X className="w-3.5 h-3.5" />Discard
                  </button>

                  <button onClick={() => toggleIdx(cardIdx)}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: selectedIdxs.has(cardIdx) ? activeTheme.accentColor : 'transparent',
                      color: selectedIdxs.has(cardIdx) ? activeTheme.from : activeTheme.accentColor,
                      border: `2px solid ${activeTheme.accentColor}`,
                    }}>
                    {selectedIdxs.has(cardIdx) ? (
                      <><Check className="w-3.5 h-3.5" />Kept</>
                    ) : (
                      <><Star className="w-3.5 h-3.5" />Keep this</>
                    )}
                  </button>

                  {cardIdx < generated.length - 1 ? (
                    <button onClick={() => { toggleIdx(cardIdx); setCardIdx(c => c + 1); }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                      Keep &amp; Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button onClick={saveSelected} disabled={saving || selectedIdxs.size === 0}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 transition-colors">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save All {selectedIdxs.size > 0 ? `(${selectedIdxs.size})` : ''}
                    </button>
                  )}
                </div>

                {/* Thumbnail strip */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {generated.map((item, i) => (
                    <button key={i} onClick={() => setCardIdx(i)}
                      className="shrink-0 relative rounded-xl overflow-hidden transition-all"
                      style={{
                        width: 64, height: 80,
                        background: activeTheme.cssBg,
                        outline: i === cardIdx ? `2.5px solid ${activeTheme.accentColor}` : selectedIdxs.has(i) ? `1.5px solid ${activeTheme.accentColor}88` : '1.5px solid transparent',
                        opacity: i === cardIdx ? 1 : 0.65,
                        transform: i === cardIdx ? 'scale(1.05)' : undefined,
                      }}>
                      <div className="absolute inset-0 p-1.5 flex flex-col gap-0.5">
                        <p className="text-[7px] font-bold leading-tight line-clamp-3"
                           style={{ color: activeTheme.textColor, fontFamily: fontCss }}>
                          {item.title}
                        </p>
                      </div>
                      <div className="absolute top-1 right-1">
                        {selectedIdxs.has(i) && (
                          <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                               style={{ background: activeTheme.accentColor }}>
                            <Check className="w-2 h-2" style={{ color: activeTheme.from }} />
                          </div>
                        )}
                      </div>
                      <span className="absolute bottom-1 left-1 text-[7px] font-bold opacity-50"
                            style={{ color: activeTheme.textColor }}>{i + 1}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Viral Pattern Analyzer */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-rose-400" />Viral Pattern Analyzer
                <span className="text-[10px] font-normal text-gray-400">— paste any post to decode what makes it go viral</span>
              </h3>
              <textarea value={viralText} onChange={e => setViralText(e.target.value)} rows={4}
                placeholder="Paste a viral post here to analyze its formula, hook type, emotional trigger, and why it works..."
                className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2.5 text-sm resize-none focus:ring-2 focus:ring-rose-300 outline-none mb-3" />
              <button onClick={runViralAnalysis} disabled={viralLoading || !viralText.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-500 text-white rounded-xl text-sm font-medium hover:bg-rose-600 disabled:opacity-50">
                {viralLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}Analyze Pattern
              </button>
              {viralResult && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    { label: 'Hook Type', val: viralResult.hookType, color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' },
                    { label: 'Emotion Trigger', val: viralResult.emotionTrigger, color: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300' },
                    { label: 'Format', val: viralResult.format, color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' },
                    { label: 'Viral Score', val: viralResult.score ? `${viralResult.score}/10` : '—', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' },
                  ].map(s => (
                    <div key={s.label} className={`rounded-xl p-3 ${s.color}`}>
                      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70 mb-0.5">{s.label}</p>
                      <p className="text-sm font-bold capitalize">{s.val || '—'}</p>
                    </div>
                  ))}
                  {viralResult.whyItWorks && (
                    <div className="col-span-2 bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Why It Works</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{viralResult.whyItWorks}</p>
                    </div>
                  )}
                  {viralResult.template && (
                    <div className="col-span-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">Replicable Template</p>
                          <p className="text-xs text-gray-700 dark:text-gray-300 font-mono leading-relaxed">{viralResult.template}</p>
                        </div>
                        <button onClick={() => { navigator.clipboard.writeText(viralResult.template); toast.success('Template copied'); }}
                          className="shrink-0 p-1.5 text-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg transition-colors">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────── DRAFTS / PUBLISHED ─────────────────────── */}
        {(tab === 'drafts' || tab === 'published') && (
          <div className="p-6 max-w-5xl mx-auto space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder={`Search ${tab === 'published' ? 'published' : 'draft'} content...`}
                  className="w-full pl-9 pr-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
              </div>
              <Filter className="w-4 h-4 text-gray-400" />
              <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }}
                className="border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-2.5 py-2 text-xs focus:ring-2 focus:ring-indigo-300 outline-none">
                <option value="">All categories</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <span className="text-xs text-gray-400">{libFiltered.length} results</span>
            </div>

            {pageDrafts.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">{tab === 'published' ? 'Nothing published yet' : 'No drafts found'}</p>
                <p className="text-xs mt-1">{tab === 'published' ? 'Publish a draft to see it here' : 'Generate content and save to library'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pageDrafts.map(d => (
                  <DraftRow key={d.id} d={d} categories={categories}
                    onEdit={() => setEditDraft(d)}
                    onDelete={() => handleDelete(d.id)}
                    onPublish={() => setPublishDraft(d)}
                    onPreview={() => setPreviewDraft(d)}
                    onSlides={() => setSectionItem(d)} />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-2">
                <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                  className="p-1.5 rounded-lg border dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <ChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = totalPages <= 7 ? i+1 : Math.max(1, Math.min(page-3, totalPages-6)) + i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${page===p ? 'bg-indigo-600 text-white' : 'border dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                      {p}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages}
                  className="p-1.5 rounded-lg border dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─────────────── CATEGORIES ─────────────────────────────── */}
        {tab === 'categories' && (
          <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Content Categories</p>
              {isAdmin && (
                <button onClick={() => setCatModal({ open: true })}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
                  <Plus className="w-4 h-4" />New Category
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {byCat.map(cat => {
                const Ic = getIcon(cat.icon);
                return (
                  <div key={cat.id} className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-5 shadow-sm">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                        <Ic className="w-6 h-6 text-indigo-500" />
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button onClick={() => setCatModal({ open: true, cat })}
                            className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteCat(cat.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">{cat.name}</h4>
                    {cat.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{cat.description}</p>}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{cat.count}</span>
                      <span className="text-xs text-gray-400">draft{cat.count !== 1 ? 's' : ''}</span>
                      <button onClick={() => { setFilterCat(cat.id); setSearch(''); setPage(1); setTab('drafts'); }}
                        className="ml-auto text-[10px] text-indigo-500 hover:text-indigo-700 font-medium">
                        View all &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─────────────── ANALYTICS ──────────────────────────────── */}
        {tab === 'analytics' && (
          <div className="p-6 max-w-4xl mx-auto space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label:'Total Created', value:drafts.length,       color:'bg-indigo-500', Icon:FileText },
                { label:'Published',     value:allPublished.length, color:'bg-green-500',  Icon:Send },
                { label:'In Draft',      value:allDrafts.length,    color:'bg-amber-500',  Icon:Edit3 },
                { label:'Categories',    value:categories.length,   color:'bg-purple-500', Icon:Tag },
              ].map(s => (
                <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 ${s.color} rounded-xl flex items-center justify-center shrink-0`}>
                      <s.Icon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{s.value}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />Content by Category
              </h3>
              <div className="space-y-3">
                {byCat.sort((a,b) => b.count - a.count).map(cat => {
                  const Ic  = getIcon(cat.icon);
                  const pct = drafts.length > 0 ? Math.round((cat.count/drafts.length)*100) : 0;
                  return (
                    <div key={cat.id} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                        <Ic className="w-4 h-4 text-indigo-500" />
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300 w-28 truncate shrink-0">{cat.name}</span>
                      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width:`${pct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-600 dark:text-gray-400 w-8 text-right shrink-0">{cat.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" />AI Content Insights
                </h3>
                <button onClick={runAnalysis} disabled={analyzing || drafts.length < 2}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-medium hover:bg-purple-700 disabled:opacity-50">
                  {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {analyzing ? 'Analyzing...' : 'Run Analysis'}
                </button>
              </div>
              {!analysis && !analyzing && (
                <p className="text-sm text-gray-400 text-center py-8">Click "Run Analysis" for AI-powered insights on your content library</p>
              )}
              {analysis && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {analysis.topCategories && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
                      <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-2">Top Categories</p>
                      <ul className="space-y-1">{analysis.topCategories.map((t:string) => <li key={t} className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full shrink-0" />{t}</li>)}</ul>
                    </div>
                  )}
                  {analysis.suggestedTopics && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                      <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2">Suggested Topics</p>
                      <ul className="space-y-1">{analysis.suggestedTopics.map((t:string) => <li key={t} className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-green-400 rounded-full shrink-0" />{t}</li>)}</ul>
                    </div>
                  )}
                  {analysis.contentGaps && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">Content Gaps</p>
                      <ul className="space-y-1">{analysis.contentGaps.map((t:string) => <li key={t} className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0" />{t}</li>)}</ul>
                    </div>
                  )}
                  {analysis.avgLength && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                      <p className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-2">Content Metrics</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300">Avg post length: <strong>{analysis.avgLength}</strong></p>
                    </div>
                  )}
                  {analysis.message && <p className="col-span-2 text-sm text-gray-400 text-center py-4">{analysis.message}</p>}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
