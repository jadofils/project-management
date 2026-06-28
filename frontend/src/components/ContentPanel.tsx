import { useState, useEffect } from 'react';
import { PenTool, Lock, Loader2, Plus, X, Trash2, Send, Eye, EyeOff, Smile, Brain, Lightbulb, Heart, FlaskConical, Puzzle, Globe, Sparkles, Wand2, Download, Image, BarChart3, FileText } from 'lucide-react';
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
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<'drafts' | 'idea'>('drafts');
  const [idea, setIdea] = useState('');
  const [ideaCat, setIdeaCat] = useState('');
  const [generating, setGenerating] = useState(false);
  const [aiTitles, setAiTitles] = useState<string[]>([]);

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

  const generateFromIdea = async () => {
    if (!ideaCat || !idea.trim()) return toast.error('Select category and enter your idea');
    setGenerating(true);
    try {
      const result = await api.aiGenerateFromIdea(ideaCat, idea);
      if (result.title) {
        await api.createContentDraft({ category_id: ideaCat, title: result.title, body: result.body || '', language: 'en' });
        toast.success('AI content created!');
        setIdea(''); load();
      }
    } catch (e: any) { toast.error(e.message); } finally { setGenerating(false); }
  };

  const generateTitles = async (catId: string) => {
    try { const res = await api.aiGenerateTitle(catId); setAiTitles(res.titles || []); toast.success('Titles generated'); }
    catch { toast.error('AI generation failed'); }
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied!'));
  };

  const downloadAsText = (draft: any) => {
    const blob = new Blob([`${draft.title}\n\n${draft.body}`], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${draft.title.slice(0,30)}.txt`; a.click();
  };

  if (!authenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-8 max-w-sm w-full shadow-sm">
          <div className="text-center mb-6"><div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4"><Lock className="w-7 h-7 text-indigo-500" /></div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Content Creation</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter the access password to continue</p></div>
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
    <div className="flex-1 overflow-auto p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2"><PenTool className="w-5 h-5 text-indigo-500" />AI Content Studio</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setTab('drafts')} className={`text-xs px-3 py-1.5 rounded-lg font-medium ${tab === 'drafts' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>My Drafts</button>
          <button onClick={() => setTab('idea')} className={`text-xs px-3 py-1.5 rounded-lg font-medium ${tab === 'idea' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}>AI Idea → Content</button>
        </div>
      </div>

      {tab === 'idea' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5 mb-6">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Wand2 className="w-4 h-4 text-purple-500" />Generate Content from Your Idea</h3>
          <div className="space-y-3">
            <select value={ideaCat} onChange={e => setIdeaCat(e.target.value)} className="w-full text-sm border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2">
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <textarea value={idea} onChange={e => setIdea(e.target.value)} placeholder="Describe your idea... e.g., 'A post about why teamwork makes projects succeed with a funny twist'" rows={3} className="w-full text-sm border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2 resize-none" />
            <button onClick={generateFromIdea} disabled={generating || !idea.trim()} className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}Generate Content with AI
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-6">
        {categories.map(c => {
          const Icon = CATEGORY_ICONS[c.icon] || PenTool;
          return (
            <button key={c.id} onClick={() => generateTitles(c.id)} className="text-center p-3 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-sm transition-shadow">
              <Icon className={`w-5 h-5 mx-auto mb-1 ${CATEGORY_COLORS[c.icon] || 'text-gray-400'}`} />
              <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{c.name}</p>
            </button>
          );
        })}
      </div>

      {aiTitles.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4 mb-6">
          <h4 className="text-xs font-semibold text-gray-500 mb-3">AI Generated Titles — click to use</h4>
          <div className="space-y-2">
            {aiTitles.map((t, i) => (
              <button key={i} onClick={() => { navigator.clipboard.writeText(t); toast.success('Title copied'); setAiTitles([]); }} className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-700 dark:text-gray-300">
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {drafts.map(d => {
          const cat = categories.find(c => c.id === d.category_id);
          const Icon = CATEGORY_ICONS[cat?.icon || ''] || PenTool;
          return (
            <div key={d.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
              <div className="flex items-start gap-3">
                <div className={`shrink-0 mt-0.5 ${CATEGORY_COLORS[cat?.icon || ''] || 'text-gray-400'}`}><Icon className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1"><span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">{cat?.name || 'Unknown'}</span><span className="text-[10px] text-gray-400 uppercase">{d.language}</span></div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100">{d.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-3">{d.body}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                  <button onClick={() => copyToClipboard(`${d.title}\n\n${d.body}`)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="Copy"><FileText className="w-3.5 h-3.5" /></button>
                  <button onClick={() => downloadAsText(d)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg" title="Download TXT"><Download className="w-3.5 h-3.5" /></button>
                  <button onClick={() => publish(d)} className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg" title="Publish to board"><Send className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteDraft(d.id)} className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          );
        })}
        {drafts.length === 0 && <p className="text-center py-12 text-gray-400">No drafts yet. Use AI to generate your first content!</p>}
      </div>
    </div>
  );
}
