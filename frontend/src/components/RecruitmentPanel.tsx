import { useState, useEffect } from 'react';
import { Briefcase, Loader2, Plus, X, Pencil, Trash2, FileText, Users, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';

const STATUS_OPTIONS = ['open', 'closed', 'filled'];
const APP_STATUS = ['new', 'shortlisted', 'interviewed', 'offered', 'rejected'];

export function RecruitmentPanel() {
  const [tab, setTab] = useState<'postings' | 'applications'>('postings');
  const [postings, setPostings] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ title: '', division_id: '', description: '', requirements: '', deadline: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([api.getJobPostings(), api.getApplications()]);
      setPostings(p); setApplications(a);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submitPosting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      if (editing) await api.updateJobPosting(editing.id, form);
      else await api.createJobPosting(form);
      toast.success(editing ? 'Updated' : 'Created');
      setShowCreate(false); setEditing(null); setForm({ title: '', division_id: '', description: '', requirements: '', deadline: '' }); load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const deletePosting = async (id: string) => {
    if (!confirm('Delete this posting?')) return;
    try { await api.deleteJobPosting(id); toast.success('Deleted'); load(); } catch { toast.error('Failed'); }
  };

  const updateAppStatus = async (id: string, status: string) => {
    try { await api.updateApplication(id, { status }); toast.success('Updated'); load(); } catch { toast.error('Failed'); }
  };

  const statusBadge = (s: string) => ({
    open: 'bg-green-100 text-green-700', closed: 'bg-gray-100 text-gray-600', filled: 'bg-blue-100 text-blue-700',
    new: 'bg-amber-100 text-amber-700', shortlisted: 'bg-indigo-100 text-indigo-700', interviewed: 'bg-purple-100 text-purple-700', offered: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-600',
  })[s] || 'bg-gray-100';

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>;

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><Briefcase className="w-5 h-5 text-indigo-500" />Recruitment</h2>
        <button onClick={() => { setEditing(null); setForm({ title: '', division_id: '', description: '', requirements: '', deadline: '' }); setShowCreate(true); }}
          className="flex items-center gap-1.5 text-sm px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium"><Plus className="w-4 h-4" />New Posting</button>
      </div>

      <div className="flex items-center gap-1 mb-4 border-b">
        {[{ id: 'postings', label: 'Job Postings' }, { id: 'applications', label: 'Applications' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`text-sm px-4 py-2 font-medium border-b-2 transition-colors ${tab === t.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'postings' && (
        <div className="space-y-3">
          {postings.map(p => (
            <div key={p.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadge(p.status)}`}>{p.status}</span>
                  </div>
                  <h3 className="font-semibold text-gray-800">{p.title}</h3>
                  {p.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                    {p.deadline && <span>Deadline: {p.deadline}</span>}
                    <span>{applications.filter(a => a.posting_id === p.id).length} applicants</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button onClick={() => { setEditing(p); setForm({ title: p.title, division_id: p.division_id || '', description: p.description || '', requirements: p.requirements || '', deadline: p.deadline || '' }); setShowCreate(true); }}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deletePosting(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
          {postings.length === 0 && <p className="text-center py-12 text-gray-400">No job postings yet</p>}
        </div>
      )}

      {tab === 'applications' && (
        <div className="space-y-3">
          {applications.map(a => (
            <div key={a.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadge(a.status)}`}>{a.status}</span>
                  <h3 className="font-semibold text-gray-800 mt-1">{a.applicant_name}</h3>
                  <p className="text-xs text-gray-500">{a.email} {a.phone && `· ${a.phone}`}</p>
                  {a.posting && <p className="text-[10px] text-indigo-500 mt-0.5">For: {a.posting.title}</p>}
                  {a.cv_url && <a href={a.cv_url} target="_blank" className="text-[10px] text-blue-500 hover:underline mt-1 block">View CV</a>}
                </div>
                <div className="relative">
                  <select value={a.status} onChange={e => updateAppStatus(a.id, e.target.value)}
                    className="text-xs border rounded-lg px-2 py-1 bg-white appearance-none pr-6">
                    {APP_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronDown className="w-3 h-3 absolute right-1.5 top-2 pointer-events-none text-gray-400" />
                </div>
              </div>
            </div>
          ))}
          {applications.length === 0 && <p className="text-center py-12 text-gray-400">No applications yet</p>}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => { setShowCreate(false); setEditing(null); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="font-semibold">{editing ? 'Edit Posting' : 'New Job Posting'}</h2><button onClick={() => { setShowCreate(false); setEditing(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button></div>
            <form onSubmit={submitPosting} className="space-y-3">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Job Title" className="w-full text-sm border rounded-xl px-3 py-2" required autoFocus />
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" rows={2} className="w-full text-sm border rounded-xl px-3 py-2 resize-none" />
              <textarea value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} placeholder="Requirements" rows={2} className="w-full text-sm border rounded-xl px-3 py-2 resize-none" />
              <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className="w-full text-sm border rounded-xl px-3 py-2" />
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => { setShowCreate(false); setEditing(null); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}{editing ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
