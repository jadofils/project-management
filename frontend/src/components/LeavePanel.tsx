import { useState, useEffect } from 'react';
import { Calendar, Loader2, Plus, X, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { api, userName } from '../services/api';

export function LeavePanel() {
  const [tab, setTab] = useState<'requests' | 'balances' | 'calendar'>('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [allApproved, setAllApproved] = useState<any[]>([]);

  const API = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';
  const token = () => localStorage.getItem('accessToken') || '';

  const downloadIcs = async () => {
    try {
      const res = await fetch(`${API}/reports/calendar`, { headers: { Authorization: `Bearer ${token()}` } });
      const blob = await res.blob();
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'leave-calendar.ics'; a.click();
      toast.success('Calendar downloaded');
    } catch { toast.error('Download failed'); }
  };
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [reqs, bals, typs, approved] = await Promise.all([
        api.getLeaveRequests(), api.getLeaveBalances(), api.getLeaveTypes(),
        api.getLeaveRequests(undefined, 'approved'),
      ]);
      setRequests(reqs); setBalances(bals); setTypes(typs); setAllApproved(approved);
    } catch { toast.error('Failed to load leave data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.leave_type_id || !form.start_date || !form.end_date) return toast.error('Fill all required fields');
    setSaving(true);
    try { await api.createLeaveRequest(form); toast.success('Leave request submitted'); setShowCreate(false); setForm({ leave_type_id: '', start_date: '', end_date: '', reason: '' }); load(); }
    catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleApprove = async (id: string) => {
    try { await api.approveLeaveRequest(id); toast.success('Approved'); load(); } catch (e: any) { toast.error(e.message); }
  };
  const handleReject = async (id: string) => {
    const reason = prompt('Rejection reason (optional):') || '';
    try { await api.rejectLeaveRequest(id, reason); toast.success('Rejected'); load(); } catch (e: any) { toast.error(e.message); }
  };

  const statusBadge = (s: string) => ({
    pending: 'bg-amber-100 text-amber-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-600',
  })[s] || 'bg-gray-100 text-gray-600';

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>;

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-indigo-500" />Leave Management</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 text-sm px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium"><Plus className="w-4 h-4" />New Request</button>
      </div>

      <div className="flex items-center gap-1 mb-4 border-b">
        {[{ id: 'requests', label: 'Requests' }, { id: 'balances', label: 'My Balances' }, { id: 'calendar', label: 'Team Calendar' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`text-sm px-4 py-2 font-medium border-b-2 transition-colors ${tab === t.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'balances' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {balances.map(b => (
            <div key={b.id} className="bg-white rounded-xl border p-4 text-center">
              <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ backgroundColor: b.leave_type?.color || '#10b981' }} />
              <p className="text-xs text-gray-500">{b.leave_type?.name || 'Leave'}</p>
              <p className="text-2xl font-bold text-gray-800">{b.remaining}</p>
              <p className="text-[10px] text-gray-400">of {b.allocated} days</p>
            </div>
          ))}
          {balances.length === 0 && <p className="col-span-full text-center py-8 text-gray-400">No leave types configured yet.</p>}
        </div>
      )}

      {tab === 'requests' && (
        <div className="space-y-3">
          {requests.map(r => (
            <div key={r.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusBadge(r.status)}`}>{r.status}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">{r.leave_type?.name || 'Leave'}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{r.user ? userName(r.user) : r.user_id}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {r.start_date} → {r.end_date} · <strong>{r.days} day{r.days > 1 ? 's' : ''}</strong>
                  </p>
                  {r.reason && <p className="text-xs text-gray-400 mt-1 italic">"{r.reason}"</p>}
                  {r.rejection_reason && <p className="text-xs text-red-500 mt-1">Rejected: {r.rejection_reason}</p>}
                </div>
                {r.status === 'pending' && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleApprove(r.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Approve"><CheckCircle className="w-4 h-4" /></button>
                    <button onClick={() => handleReject(r.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Reject"><XCircle className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {requests.length === 0 && <div className="text-center py-12 text-gray-400"><Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No leave requests yet</p></div>}
        </div>
      )}

      {tab === 'calendar' && (
        <div className="space-y-3">
          {allApproved.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No approved leave to display</p></div>
          ) : (
            allApproved.map(r => (
              <div key={r.id} className="bg-white rounded-xl border p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{r.user ? userName(r.user) : r.user_id}</p>
                  <p className="text-xs text-gray-500">{r.start_date} → {r.end_date} · {r.days} day{r.days > 1 ? 's' : ''} · {r.leave_type?.name}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700">Approved</span>
              </div>
            ))
          )}
          <div className="pt-2">
            <button onClick={() => downloadIcs()} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1">
              <Calendar className="w-3 h-3" />Download .ics calendar
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><h2 className="font-semibold">Request Leave</h2><button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button></div>
            <form onSubmit={submitRequest} className="space-y-3">
              <div><label className="text-xs text-gray-500 mb-1 block">Leave Type</label><select value={form.leave_type_id} onChange={e => setForm(f => ({ ...f, leave_type_id: e.target.value }))} className="w-full text-sm border rounded-xl px-3 py-2" required><option value="">Select...</option>{types.map(t => <option key={t.id} value={t.id}>{t.name} ({t.days_per_year}d/yr)</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-gray-500 mb-1 block">Start Date</label><input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="w-full text-sm border rounded-xl px-3 py-2" required /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">End Date</label><input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="w-full text-sm border rounded-xl px-3 py-2" required /></div>
              </div>
              <div><label className="text-xs text-gray-500 mb-1 block">Reason (optional)</label><textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} className="w-full text-sm border rounded-xl px-3 py-2 resize-none" rows={2} /></div>
              <div className="flex gap-2 justify-end pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
