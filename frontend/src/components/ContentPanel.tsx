import { useState, useEffect } from 'react';
import { PenTool, Lock, Loader2, Plus, X, Trash2, Send, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { api, type Project } from '../services/api';

const CATEGORY_ICONS: Record<string, string> = { funny: '😂', wise: '🧠', guidance: '💡', love: '❤️', science: '🔬', psychology: '🧩', sociology: '🌍', myths: '🔮' };

interface Props {
  projects: Project[];
}

export function ContentPanel({ projects }: Props) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [checking, setChecking] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ category_id: '', title: '', body: '', language: 'en' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [cats, drs] = await Promise.all([api.getContentCategories(), api.getContentDrafts()]);
      setCategories(cats); setDrafts(drs);
    } catch { /* */ }
    finally { setLoading(false); }
  };

  useEffect(() => { if (authenticated) load(); }, [authenticated]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    try { await api.verifyContentPassword(password); setAuthenticated(true); toast.success('Access granted'); }
    catch (e: any) { toast.error(e.message); }
    finally { setChecking(false); }
  };

  const createDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category_id || !form.title.trim() || !form.body.trim()) return toast.error('Fill all fields');
    setSaving(true);
    try { await api.createContentDraft(form); toast.success('Draft created'); setShowCreate(false); setForm({ category_id: '', title: '', body: '', language: 'en' }); load(); }
    catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const deleteDraft = async (id: string) => {
    if (!confirm('Delete this draft?')) return;
    try { await api.deleteContentDraft(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
  };

  const publish = async (draft: any) => {
    const projectId = projects[0]?.id;
    if (!projectId) return toast.error('No project available');
    try { await api.publishContentDraft(draft.id, projectId); await api.createTask({ project_id: projectId, title: draft.title, description: draft.body, status: 'todo', priority: 'medium' } as any); toast.success('Published to board'); load(); }
    catch { toast.error('Failed'); }
  };

  if (!authenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-8 max-w-sm w-full shadow-sm">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-indigo-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Content Creation</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter the access password to continue</p>
          </div>
          <form onSubmit={handleVerify} className="space-y-3">
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Access password" required autoFocus
                className="w-full px-3 py-2.5 pr-10 border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
              <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-2.5 text-gray-400"><EyeOff className="w-4 h-4" /></button>
            </div>
            <button type="submit" disabled={checking || !password} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {checking ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Unlock'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>;

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2"><PenTool className="w-5 h-5 text-indigo-500" />Content Creation</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 text-sm px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium"><Plus className="w-4 h-4" />New Draft</button>
      </div>

      <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-6">
        {categories.map(c => (
          <div key={c.id} className="text-center p-2 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="text-2xl mb-1">{CATEGORY_ICONS[c.slug] || '📝'}</div>
            <p className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{c.name}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {drafts.map(d => {
          const cat = categories.find(c => c.id === d.category_id);
          return (
            <div key={d.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{CATEGORY_ICONS[cat?.slug || ''] || '📝'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">{cat?.name || 'Unknown'}</span>
                    <span className="text-[10px] text-gray-400 uppercase">{d.language}</span>
                  </div>
                  <h3 className="font-semibold text-gray-800 dark:text-gray-100">{d.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-3">{d.body}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => publish(d)} className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg" title="Publish to board"><Send className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteDraft(d.id)} className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          );
        })}
        {drafts.length === 0 && <p className="text-center py-12 text-gray-400">No drafts yet. Create your first content!</p>}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="font-semibold">New Draft</h2><button onClick={() => setShowCreate(false)} className="text-gray-400"><X className="w-4 h-4" /></button></div>
            <form onSubmit={createDraft} className="space-y-3">
              <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="w-full text-sm border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2" required>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{CATEGORY_ICONS[c.slug]} {c.name}</option>)}
              </select>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" className="w-full text-sm border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2" required />
              <textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Content body..." rows={4} className="w-full text-sm border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2 resize-none" required />
              <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} className="w-full text-sm border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2">
                <option value="en">English</option><option value="fr">French</option><option value="sw">Kinyarwanda</option><option value="es">Spanish</option>
              </select>
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
