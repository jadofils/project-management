import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2, Mail, Search, Send, RefreshCw, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, type EmailLogEntry, type Invitation, type Project } from '../services/api';

interface Props {
  projects: Project[];
}

const TYPE_LABELS: Record<string, string> = {
  invitation_new: 'New Invitation',
  invitation_existing: 'Added to Project',
  welcome: 'Welcome',
  task_assigned: 'Task Assigned',
  task_updated: 'Task Updated',
  task_completed: 'Task Done',
  task_review: 'Task Review',
  comment_added: 'Comment',
  phase_task_created: 'Phase Task',
  custom: 'Custom Email',
  generic: 'General',
};

export function CommunicationsPanel({ projects }: Props) {
  const [tab, setTab] = useState<'logs' | 'invitations'>('logs');
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const loadLogs = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.getEmailLogs({ type: filterType || undefined, project_id: filterProject || undefined, page: p });
      setLogs(res.data);
      setTotalPages(res.totalPages);
      setPage(p);
    } catch { setLogs([]); }
    finally { setLoading(false); }
  };

  const loadInvitations = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.getAllInvitations(p);
      setInvitations(res.data);
      setTotalPages(res.totalPages);
      setPage(p);
    } catch { setInvitations([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === 'logs') loadLogs(1);
    else loadInvitations(1);
  }, [tab, filterType, filterProject]);

  const handleResend = async (projectId: string, invId: string) => {
    setResendingId(invId);
    try {
      const res = await api.resendInvitation(projectId, invId);
      toast.success(res.message);
      loadInvitations(page);
    } catch { toast.error('Failed to resend'); }
    finally { setResendingId(null); }
  };

  const projectNames = Object.fromEntries(projects.map(p => [p.id, p.name]));
  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const types = [...new Set(logs.map(l => l.type))].filter(Boolean);

  return (
    <div className="flex-1 overflow-auto p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-500" />Communications
          </h2>
        </div>

        <div className="flex items-center gap-1 mb-4 border-b">
          {([
            { id: 'logs', label: 'Email Logs' },
            { id: 'invitations', label: 'Invitations' },
          ] as const).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`text-sm px-4 py-2 font-medium border-b-2 transition-colors ${tab === t.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'logs' && (
          <>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <select value={filterType} onChange={e => setFilterType(e.target.value)}
                className="text-xs border rounded-lg px-3 py-1.5 bg-white">
                <option value="">All types</option>
                {types.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
              </select>
              <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
                className="text-xs border rounded-lg px-3 py-1.5 bg-white">
                <option value="">All projects</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <span className="text-xs text-gray-400 ml-auto">{logs.length} of {totalPages * 30} results</span>
            </div>

            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
            ) : logs.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">No emails found.</div>
            ) : (
              <div className="space-y-2">
                {logs.map(log => (
                  <div key={log.id} className="bg-white rounded-lg border p-3 flex items-start gap-3">
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${log.status === 'failed' ? 'bg-red-100' : 'bg-green-100'}`}>
                      {log.status === 'failed'
                        ? <X className="w-4 h-4 text-red-500" />
                        : <Send className="w-3.5 h-3.5 text-green-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-gray-100 text-gray-600">
                          {TYPE_LABELS[log.type] || log.type}
                        </span>
                        {log.status === 'failed' && log.error_message && (
                          <span className="text-[10px] text-red-500 truncate">{log.error_message}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5 truncate">{log.subject}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                        <span>To: {log.recipient}</span>
                        {log.project_id && <span>{projectNames[log.project_id] || log.project_id}</span>}
                        <span>{formatDate(log.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button disabled={page <= 1} onClick={() => loadLogs(page - 1)}
                  className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs text-gray-400">{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => loadLogs(page + 1)}
                  className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            )}
          </>
        )}

        {tab === 'invitations' && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-gray-400 ml-auto">{invitations.length} invitations</span>
            </div>

            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div>
            ) : invitations.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">No invitations found.</div>
            ) : (
              <div className="space-y-2">
                {invitations.map(inv => (
                  <div key={inv.id} className="bg-white rounded-lg border p-3 flex items-start gap-3">
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      inv.status === 'accepted' ? 'bg-green-100' : inv.status === 'pending' ? 'bg-amber-100' : 'bg-gray-100'
                    }`}>
                      {inv.status === 'accepted'
                        ? <Send className="w-3.5 h-3.5 text-green-600" />
                        : inv.status === 'pending'
                          ? <Mail className="w-3.5 h-3.5 text-amber-500" />
                          : <X className="w-3.5 h-3.5 text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          inv.status === 'accepted' ? 'bg-green-100 text-green-700' :
                          inv.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          inv.status === 'expired' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {inv.status}
                        </span>
                        <span className="text-xs text-gray-700">{inv.email}</span>
                        <span className="text-[10px] text-gray-400">{inv.project_name || inv.project_id}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                        <span>Role: {inv.role}</span>
                        {inv.accepted_by_name && <span>Accepted by: {inv.accepted_by_name}</span>}
                        {inv.expires_at && <span>Expires: {formatDate(inv.expires_at)}</span>}
                        <span>{formatDate(inv.created_at)}</span>
                      </div>
                      {inv.status === 'pending' && (
                        <button
                          onClick={() => handleResend(inv.project_id, inv.id)}
                          disabled={resendingId === inv.id}
                          className="mt-2 text-[10px] flex items-center gap-1 px-2 py-1 rounded-lg font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                        >
                          {resendingId === inv.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          Resend
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button disabled={page <= 1} onClick={() => loadInvitations(page - 1)}
                  className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs text-gray-400">{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => loadInvitations(page + 1)}
                  className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
