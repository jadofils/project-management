import { useState, useEffect } from 'react';
import { Send, Loader2, Users, User as UserIcon, Mail, ChevronDown, X } from 'lucide-react';
import { api, type User, userName } from '../services/api';
import { toast } from 'sonner';

const ROLES = [
  { value: 'project_manager', label: 'Project Managers' },
  { value: 'backend_dev',     label: 'Backend Developers' },
  { value: 'frontend_dev',    label: 'Frontend Developers' },
  { value: 'documentalist',   label: 'Documentalists' },
  { value: 'tester',          label: 'Testers' },
  { value: 'qa_tester',       label: 'QA & ST' },
];

type ToType = 'all' | 'role' | 'specific';

interface Props {
  onClose: () => void;
  projectId?: string;
  preselectedEmails?: string[];
}

export function MailComposer({ onClose, projectId, preselectedEmails }: Props) {
  const [toType, setToType]       = useState<ToType>('specific');
  const [selectedRole, setSelectedRole] = useState('backend_dev');
  const [allUsers, setAllUsers]   = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [subject, setSubject]     = useState('');
  const [message, setMessage]     = useState('');
  const [sending, setSending]     = useState(false);

  useEffect(() => {
    api.getUsers().then(users => {
      setAllUsers(users);
      // Pre-select users matching provided emails
      if (preselectedEmails?.length) {
        const ids = users.filter(u => preselectedEmails.includes(u.email)).map(u => u.id);
        if (ids.length) setSelectedIds(ids);
      }
    }).catch(() => { /* silent */ });
  }, []);

  const toggleUser = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const send = async () => {
    if (!subject.trim() || !message.trim()) { toast.error('Subject and message are required'); return; }

    let to: any;
    if (toType === 'all') {
      to = { type: 'all' };
    } else if (toType === 'role') {
      to = { type: 'role', role: selectedRole, project_id: projectId };
    } else {
      if (selectedIds.length === 0) { toast.error('Select at least one recipient'); return; }
      to = { type: 'users', ids: selectedIds };
    }

    setSending(true);
    try {
      const res = await api.sendMail({ to, subject: subject.trim(), message: message.trim() });
      toast.success(`Email sent to ${res.sent} recipient${res.sent !== 1 ? 's' : ''}`);
      setSubject(''); setMessage(''); setSelectedIds([]);
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const recipientPreview = () => {
    if (toType === 'all') return `All active users (${allUsers.filter(u => u.is_active).length})`;
    if (toType === 'role') return ROLES.find(r => r.value === selectedRole)?.label || selectedRole;
    if (selectedIds.length === 0) return 'No recipients selected';
    return `${selectedIds.length} user${selectedIds.length !== 1 ? 's' : ''} selected`;
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-500" /> Compose Email
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* To */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">To</label>
            {/* Type tabs */}
            <div className="flex gap-2 mb-3">
              {[
                { id: 'specific' as ToType, icon: UserIcon, label: 'Specific Users' },
                { id: 'role'     as ToType, icon: Users,    label: 'By Role' },
                { id: 'all'      as ToType, icon: Mail,     label: 'Everyone' },
              ].map(t => (
                <button key={t.id} onClick={() => setToType(t.id)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${toType === t.id ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  <t.icon className="w-3.5 h-3.5" />{t.label}
                </button>
              ))}
            </div>

            {toType === 'role' && (
              <div className="relative">
                <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white appearance-none pr-8">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-3 text-gray-400 pointer-events-none" />
              </div>
            )}

            {toType === 'specific' && (
              <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-gray-50">
                {allUsers.filter(u => u.is_active).length === 0 && (
                  <p className="text-sm text-gray-400 p-3 text-center">No users found</p>
                )}
                {allUsers.filter(u => u.is_active).map(u => (
                  <label key={u.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggleUser(u.id)}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300" />
                    <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                      {u.first_name[0]}{u.last_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{userName(u)}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {toType === 'all' && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl px-4 py-2.5">
                This will send to all {allUsers.filter(u => u.is_active).length} active users.
              </div>
            )}

            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <Mail className="w-3 h-3" /> {recipientPreview()}
            </p>
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Subject</label>
            <input value={subject} onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Sprint kick-off meeting at 10am"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>

          {/* Message */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Message</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Write your message here…"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none resize-none"
              rows={6} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={send} disabled={sending || !subject.trim() || !message.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Email
          </button>
        </div>
      </div>
    </div>
  );
}
