import { useState, useEffect } from 'react';
import { PenTool, Lock, Loader2, X, Trash2, Send, Eye, EyeOff, Smile, Brain, Lightbulb, Heart, FlaskConical, Puzzle, Globe, Sparkles, Wand2, Download, FileText, CheckSquare, Square, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { api, type Project } from '../services/api';

const CATEGORY_ICONS: Record<string, React.ElementType> = { smile: Smile, brain: Brain, lightbulb: Lightbulb, heart: Heart, flask: FlaskConical, puzzle: Puzzle, globe: Globe, sparkles: Sparkles };
const CATEGORY_COLORS: Record<string, string> = { smile: 'text-amber-500', brain: 'text-indigo-500', lightbulb: 'text-emerald-500', heart: 'text-red-500', flask: 'text-blue-500', puzzle: 'text-violet-500', globe: 'text-cyan-500', sparkles: 'text-pink-500' };

interface Props { projects: Project[]; }

export function ContentPanel({ projects }: Props) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [checking, setChecking] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState('');
  const [genCount, setGenCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const load = async () => {
    try { const [cats, drs] = await Promise.all([api.getContentCategories(), api.getContentDrafts()]); setCategories(cats); setDrafts(drs); }
    catch { /* */ } finally { setLoading(false); }
  };

  useEffect(() => { if (authenticated) load(); }, [authenticated]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault(); setChecking(true);
    try { await api.verifyContentPassword(password); setAuthenticated(true); toast.success('Access granted'); }
    catch (e: any) { toast.error(e.message); } finally { setChecking(false); }
  };

  const handleGenerate = async () => {
    if (!selectedCat) return toast.error('Select a category first');
    setGenerating(true); setGenerated([]); setSelectedItems(new Set());
    try {
      const items = await api.aiBatchGenerate(selectedCat, genCount);
      if (!Array.isArray(items) || items.length === 0) { toast.error('AI returned no content. Check your API key.'); return; }
      setGenerated(items); toast.success(`AI generated ${items.length} content pieces`);
    } catch (e: any) { toast.error(e.message || 'Generation failed'); }
    finally { setGenerating(false); }
  };

  const toggleItem = (i: number) => {
    setSelectedItems(prev => { const next = new Set(prev); if (next.has(i)) next.delete(i); else next.add(i); return next; });
  };

  const toggleAll = () => {
    if (selectedItems.size === generated.length) setSelectedItems(new Set());
    else setSelectedItems(new Set(generated.map((_, i) => i)));
  };

  const saveSelected = async () => {
    if (selectedItems.size === 0) return toast.error('Select items to save');
    const toSave = [...selectedItems].map(i => ({
      category_id: selectedCat, title: generated[i].title, body: generated[i].body, language: 'en',
    }));
    try {
      await api.bulkCreateContentDrafts(toSave);
      toast.success(`Saved ${toSave.length} drafts`);
      setGenerated([]); setSelectedItems(new Set()); load();
    } catch { toast.error('Save failed'); }
  };

  const deleteDraft = async (id: string) => {
    if (!confirm('Delete?')) return;
    try { await api.deleteContentDraft(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
  };

  const publish = async (draft: any) => {
    const projectId = projects[0]?.id;
    if (!projectId) return toast.error('No project');
    try {
      await api.publishContentDraft(draft.id, projectId);
      await api.createTask({ project_id: projectId, title: draft.title, description: draft.body, status: 'todo', priority: 'medium' } as any);
      toast.success('Published'); load();
    } catch { toast.error('Failed'); }
  };

  const downloadText = (draft: any) => {
    const blob = new Blob([`${draft.title}\n\n${draft.body}`], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${draft.title.slice(0,30)}.txt`; a.click();
  };

  const copyText = (text: string) => { navigator.clipboard.writeText(text); toast.success('Copied'); };

  if (!authenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-8 max-w-sm w-full shadow-sm text-center">
          <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4"><Lock className="w-7 h-7 text-indigo-500" /></div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">AI Content Studio</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6">Enter password to unlock AI generation</p>
          <form onSubmit={handleVerify} className="space-y-3">
            <div className="relative"><input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Access password" required autoFocus className="w-full px-3 py-2.5 pr-10 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" /><button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-2.5 text-gray-400"><EyeOff className="w-4 h-4" /></button></div>
            <button type="submit" disabled={checking || !password} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">{checking ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Unlock'}</button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>;

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 max-w-6xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-5"><Wand2 className="w-5 h-5 text-purple-500" />AI Content Studio</h2>

      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 mb-6 text-white">
        <p className="text-sm opacity-80 mb-4">Select a category, set how many posts you need, and AI generates them all.</p>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs opacity-70 mb-1 block">Category</label>
            <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)} className="w-full text-sm rounded-xl px-3 py-2.5 bg-white/20 text-white border border-white/30">
              <option value="" className="text-gray-800">Choose category...</option>
              {categories.map(c => <option key={c.id} value={c.id} className="text-gray-800">{c.name}</option>)}
            </select>
          </div>
          <div className="w-24">
            <label className="text-xs opacity-70 mb-1 block">Count</label>
            <select value={genCount} onChange={e => setGenCount(Number(e.target.value))} className="w-full text-sm rounded-xl px-3 py-2.5 bg-white/20 text-white border border-white/30">
              {[10, 25, 50, 100].map(n => <option key={n} value={n} className="text-gray-800">{n}</option>)}
            </select>
          </div>
          <button onClick={handleGenerate} disabled={generating || !selectedCat}
            className="px-6 py-2.5 bg-white text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-50 disabled:opacity-50 flex items-center gap-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {generating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      {generated.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{generated.length} generated · {selectedItems.size} selected</span>
            <div className="flex items-center gap-2">
              {selectedItems.size > 0 && (
                <button onClick={saveSelected} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">Save Selected ({selectedItems.size})</button>
              )}
              <button onClick={toggleAll} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">{selectedItems.size === generated.length ? 'Deselect All' : 'Select All'}</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {generated.map((item, i) => {
              const cat = categories.find(c => c.id === selectedCat);
              const Icon = CATEGORY_ICONS[cat?.icon || ''] || PenTool;
              const isSel = selectedItems.has(i);
              return (
                <div key={i} onClick={() => toggleItem(i)}
                  className={`bg-white dark:bg-gray-800 rounded-xl border p-4 cursor-pointer transition-all ${isSel ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800 shadow-md' : 'dark:border-gray-700 hover:border-gray-300'}`}>
                  <div className="flex items-start gap-3">
                    <button onClick={e => { e.stopPropagation(); toggleItem(i); }} className="shrink-0 mt-0.5">
                      {isSel ? <CheckSquare className="w-5 h-5 text-indigo-500" /> : <Square className="w-5 h-5 text-gray-300" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-4 h-4 ${CATEGORY_COLORS[cat?.icon || ''] || 'text-gray-400'}`} />
                        <span className="text-[10px] text-gray-400">{item.bestPlatform}</span>
                      </div>
                      <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-100 leading-snug">{item.title}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-3">{item.body}</p>
                      {item.hashtags && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(Array.isArray(item.hashtags) ? item.hashtags : []).map((t: string) => (
                            <span key={t} className="text-[9px] text-indigo-400">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {drafts.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">Saved Drafts ({drafts.length})</h3>
          <div className="space-y-2 mb-6">
            {drafts.slice(0, 10).map(d => {
              const cat = categories.find(c => c.id === d.category_id);
              const Icon = CATEGORY_ICONS[cat?.icon || ''] || PenTool;
              return (
                <div key={d.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-3 flex items-start gap-3">
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${CATEGORY_COLORS[cat?.icon || ''] || 'text-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{d.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{d.body.slice(0, 80)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => copyText(`${d.title}\n\n${d.body}`)} className="p-1 text-gray-400 hover:text-blue-500 rounded" title="Copy"><FileText className="w-3 h-3" /></button>
                    <button onClick={() => downloadText(d)} className="p-1 text-gray-400 hover:text-blue-500 rounded" title="Download"><Download className="w-3 h-3" /></button>
                    <button onClick={() => publish(d)} className="p-1 text-green-500 hover:bg-green-50 rounded" title="Publish"><Send className="w-3 h-3" /></button>
                    <button onClick={() => deleteDraft(d.id)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
