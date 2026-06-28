import { useState, useEffect, useCallback } from 'react';
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
import {
  CARD_THEMES, FONT_OPTIONS, downloadCardAsImage, downloadMultiple,
  type CardTheme, type ExportFormat,
} from '../lib/contentExport';

// ── Icon map ──────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  smile: Smile, brain: Brain, lightbulb: Lightbulb, heart: Heart,
  flask: FlaskConical, puzzle: Puzzle, globe: Globe, sparkles: Sparkles,
  star: Star, zap: Zap, trending: TrendingUp, book: BookOpen,
};
const getIcon = (k: string): React.ElementType => ICON_MAP[k] || Sparkles;

const PAGE_SIZE = 20;
type ContentTab  = 'generate' | 'drafts' | 'published' | 'categories' | 'analytics';
type ContentType = 'post' | 'reel' | 'audio';

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

// ── Themed Content Card ───────────────────────────────────────────────────────
function ContentCard({ item, theme, fontCss, isSelected, onToggle, onPreview, contentType }: {
  item: any; theme: CardTheme; fontCss: string; isSelected: boolean;
  onToggle: () => void; onPreview: () => void; contentType: ContentType;
}) {
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

      {/* Body */}
      <div className="relative z-10 p-4 flex flex-col h-full gap-2">
        {item.bestPlatform ? (
          <span className="self-start text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: theme.accentColor + '25', color: theme.accentColor }}>
            {item.bestPlatform}
          </span>
        ) : <div className="h-5" />}

        <h3 className="font-bold text-sm leading-snug line-clamp-3 flex-shrink-0">{item.title}</h3>

        <p className="text-xs leading-relaxed line-clamp-6 flex-1"
           style={{ opacity: 0.82, whiteSpace: 'pre-wrap' }}>
          {item.body}
        </p>

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
function PreviewModal({ item, theme, fontCss, fontId, onClose }: {
  item: any; theme: CardTheme; fontCss: string; fontId: string; onClose: () => void;
}) {
  const [pTheme, setPTheme]   = useState<CardTheme>(theme);
  const [format, setFormat]   = useState<ExportFormat>('post');
  const [showWm, setShowWm]   = useState(true);
  const [wm, setWm]           = useState('Tinyuwizev1.1');
  const [dl, setDl]           = useState(false);
  const [speaking, setSpeaking] = useState(false);

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
    const utt = new SpeechSynthesisUtterance(`${item.title}. ${item.body}`);
    utt.rate = 0.92; utt.pitch = 1;
    utt.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utt);
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
            <p className="text-[11px] leading-relaxed flex-1 overflow-y-auto"
               style={{ opacity: 0.85, whiteSpace: 'pre-wrap' }}>
              {item.body}
            </p>
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 w-68 max-h-[90vh] overflow-y-auto" style={{ width: 268 }}>
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">Preview</span>
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
              className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2 text-sm mb-4 focus:ring-2 focus:ring-indigo-300 outline-none" />
          )}

          <div className="space-y-2 mt-2">
            <button onClick={download} disabled={dl}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {dl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download {format === 'reel' ? 'Reel' : 'Image'}
            </button>
            <button onClick={speak}
              className={`w-full py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 border transition-colors ${speaking ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              {speaking ? <><StopIcon className="w-3.5 h-3.5" />Stop</> : <><Volume2 className="w-3.5 h-3.5" />Play Audio</>}
            </button>
            <button onClick={() => { navigator.clipboard.writeText(`${item.title}\n\n${item.body}`); toast.success('Copied'); }}
              className="w-full py-2 border dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2">
              <Copy className="w-3.5 h-3.5" />Copy Text
            </button>
          </div>
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
  const [progress, setProg]   = useState<{ done: number; total: number } | null>(null);

  const run = async () => {
    setProg({ done: 0, total: items.length });
    try {
      await downloadMultiple(items, { format, theme, fontId, watermark: wm, showWatermark: showWm },
        (done, total) => setProg({ done, total }));
      toast.success(`${items.length} ${format === 'reel' ? 'reels' : 'images'} downloaded`);
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

            <button onClick={run}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Download {items.length} {format === 'reel' ? 'Reel' : 'Image'}{items.length !== 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
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
  const [projectId, setPid] = useState(projects[0]?.id || '');
  const [pub, setPub]       = useState(false);
  const publish = async () => {
    if (!projectId) return toast.error('Select a project');
    setPub(true);
    try {
      await api.publishContentDraft(draft.id, projectId);
      toast.success('Published'); onPublished(); onClose();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setPub(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
          <span className="font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Send className="w-4 h-4 text-green-500" />Publish Draft
          </span>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">Marking <strong className="text-gray-800 dark:text-gray-100">"{draft.title}"</strong> as published.</p>
          <select value={projectId} onChange={e => setPid(e.target.value)}
            className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">Cancel</button>
          <button onClick={publish} disabled={pub || !projectId}
            className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5">
            {pub ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}Publish
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Draft list row ────────────────────────────────────────────────────────────
function DraftRow({ d, categories, onEdit, onDelete, onPublish, onPreview }: {
  d: any; categories: any[];
  onEdit: () => void; onDelete: () => void; onPublish: () => void; onPreview: () => void;
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
  const [generating, setGenerating]     = useState(false);
  const [generated, setGenerated]       = useState<any[]>([]);
  const [selectedIdxs, setSelectedIdxs] = useState<Set<number>>(new Set());
  const [saving, setSaving]             = useState(false);
  const [previewItem, setPreviewItem]   = useState<any | null>(null);
  const [exportModal, setExportModal]   = useState(false);

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
      const items = await api.aiBatchGenerate(selectedCat, genCount, customTopic || undefined, contentType);
      if (!Array.isArray(items) || items.length === 0) { toast.error('No content returned — check AI settings'); return; }
      setGenerated(items);
      setSelectedIdxs(new Set(items.map((_, i) => i)));
      const label = contentType === 'reel' ? 'reel scripts' : contentType === 'audio' ? 'audio scripts' : 'posts';
      toast.success(`${items.length} ${label} generated`);
    } catch (e: any) { toast.error(e.message || 'Generation failed'); }
    finally { setGenerating(false); }
  };

  const toggleIdx = (i: number) => setSelectedIdxs(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n; });
  const toggleAll = () => setSelectedIdxs(selectedIdxs.size === generated.length ? new Set() : new Set(generated.map((_, i) => i)));

  const saveSelected = async () => {
    if (selectedIdxs.size === 0) return toast.error('Select items to save');
    setSaving(true);
    try {
      const items = [...selectedIdxs].map(i => ({
        category_id: selectedCat, title: generated[i].title, body: generated[i].body,
        hashtags: generated[i].hashtags, best_platform: generated[i].bestPlatform, language: 'en',
      }));
      await api.bulkCreateContentDrafts(items);
      toast.success(`${items.length} drafts saved to library`);
      setGenerated([]); setSelectedIdxs(new Set()); load();
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
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
      {previewItem  && <PreviewModal item={previewItem}  theme={activeTheme} fontCss={fontCss} fontId={fontId} onClose={() => setPreviewItem(null)} />}
      {previewDraft && <PreviewModal item={previewDraft} theme={activeTheme} fontCss={fontCss} fontId={fontId} onClose={() => setPreviewDraft(null)} />}
      {exportModal && selectedItems.length > 0 && <ExportModal items={selectedItems} theme={activeTheme} fontId={fontId} onClose={() => setExportModal(false)} />}
      {editDraft    && <EditDraftModal draft={editDraft} categories={categories} onSave={u => setDrafts(p => p.map(d => d.id === u.id ? u : d))} onClose={() => setEditDraft(null)} />}
      {publishDraft && <PublishModal draft={publishDraft} projects={projects} onPublished={load} onClose={() => setPublishDraft(null)} />}
      {catModal.open && <CategoryFormModal cat={catModal.cat} onSave={load} onClose={() => setCatModal({ open: false })} />}

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
                  <div className="flex gap-1.5">
                    {([['post','Post',ImageIcon],['reel','Reel',Film],['audio','Audio',Mic]] as const).map(([ct,label,Icon]) => (
                      <button key={ct} onClick={() => setContentType(ct)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border transition-colors ${contentType === ct ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-300'}`}>
                        <Icon className="w-3 h-3" />{label}
                      </button>
                    ))}
                  </div>
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
              <p className="font-semibold text-sm mb-3 flex items-center gap-2" style={{ fontFamily: fontCss, opacity: 0.9 }}>
                <Sparkles className="w-4 h-4" />
                {contentType === 'reel' ? 'Reel Script Engine' : contentType === 'audio' ? 'Audio Script Engine' : 'Post Generator'}
              </p>
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
                    {[5,10,20,25,50].map(n => <option key={n} value={n} style={{ color: '#111', background: '#fff' }}>{n} {contentType === 'reel' ? 'reels' : contentType === 'audio' ? 'scripts' : 'posts'}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleGenerate} disabled={generating || !selectedCat}
                className="px-8 py-3 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2 shadow-lg transition-transform hover:scale-[1.02]"
                style={{ background: activeTheme.accentColor, color: activeTheme.from }}>
                {generating
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</>
                  : <><Wand2 className="w-4 h-4" />Generate {genCount} {contentType === 'reel' ? 'Reels' : contentType === 'audio' ? 'Scripts' : 'Posts'}</>}
              </button>
            </div>

            {/* Results */}
            {generated.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {generated.length} generated &nbsp;&middot;&nbsp; {selectedIdxs.size} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={toggleAll}
                      className="text-xs text-indigo-500 hover:text-indigo-700 font-medium px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                      {selectedIdxs.size === generated.length ? 'Deselect All' : 'Select All'}
                    </button>
                    {selectedIdxs.size > 0 && (
                      <>
                        <button onClick={() => setExportModal(true)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 dark:bg-gray-700 text-white rounded-xl text-xs font-semibold hover:bg-gray-700">
                          <Download className="w-3 h-3" />Download {selectedIdxs.size}
                        </button>
                        <button onClick={saveSelected} disabled={saving}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50">
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}Save to Library
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {generated.map((item, i) => (
                    <ContentCard key={i} item={item} theme={activeTheme} fontCss={fontCss}
                      isSelected={selectedIdxs.has(i)} contentType={contentType}
                      onToggle={() => toggleIdx(i)}
                      onPreview={() => setPreviewItem(item)} />
                  ))}
                </div>
              </div>
            )}
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
                    onPreview={() => setPreviewDraft(d)} />
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
