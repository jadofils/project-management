import { useState, useEffect } from 'react';
import { X, Plus, UserPlus, Trash2, Loader2, ChevronDown } from 'lucide-react';
import { api, type Member, type User, userInitials, userName } from '../services/api';
import { toast } from 'sonner';

const ROLES = [
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'backend_dev',     label: 'Backend Dev' },
  { value: 'frontend_dev',    label: 'Frontend Dev' },
  { value: 'documentalist',   label: 'Documentalist' },
  { value: 'tester',          label: 'Tester' },
  { value: 'qa_tester',       label: 'QA & ST' },
];

const ROLE_COLORS: Record<string, string> = {
  project_manager: 'bg-purple-100 text-purple-700',
  backend_dev:     'bg-blue-100 text-blue-700',
  frontend_dev:    'bg-cyan-100 text-cyan-700',
  documentalist:   'bg-green-100 text-green-700',
  tester:          'bg-yellow-100 text-yellow-700',
  qa_tester:       'bg-red-100 text-red-700',
};

interface Props {
  projectId: string;
  currentUserId: string;
}

export function MembersPanel({ projectId, currentUserId }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [addUserId, setAddUserId] = useState('');
  const [addRole, setAddRole] = useState('backend_dev');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getMembers(projectId), api.getUsers()])
      .then(([m, u]) => { setMembers(m); setAllUsers(u); })
      .catch(() => toast.error('Failed to load members'))
      .finally(() => setLoading(false));
  }, [projectId]);

  const memberUserIds = new Set(members.map(m => m.user_id));
  const availableUsers = allUsers.filter(u => !memberUserIds.has(u.id) && u.is_active);

  const add = async () => {
    if (!addUserId) return;
    setAdding(true);
    try {
      const m = await api.addMember(projectId, addUserId, addRole);
      const user = allUsers.find(u => u.id === addUserId);
      setMembers(prev => [...prev, { ...m, user }]);
      setAddUserId('');
      toast.success('Member added');
    } catch (e: any) { toast.error(e.message || 'Failed to add member'); }
    finally { setAdding(false); }
  };

  const changeRole = async (m: Member, role: string) => {
    try {
      await api.updateMemberRole(projectId, m.user_id, role);
      setMembers(prev => prev.map(x => x.id === m.id ? { ...x, role } : x));
    } catch { toast.error('Failed to update role'); }
  };

  const remove = async (m: Member) => {
    try {
      await api.removeMember(projectId, m.user_id);
      setMembers(prev => prev.filter(x => x.id !== m.id));
      toast.success('Member removed');
    } catch { toast.error('Failed to remove member'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-indigo-500" /> Project Members
        <span className="ml-1 text-xs text-gray-400 font-normal">({members.length})</span>
      </h3>

      {/* Add member */}
      {availableUsers.length > 0 && (
        <div className="bg-gray-50 rounded-2xl p-4 mb-5 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <select
              value={addUserId}
              onChange={e => setAddUserId(e.target.value)}
              className="w-full text-sm border rounded-xl px-3 py-2.5 bg-white appearance-none pr-8"
            >
              <option value="">Select a user to add…</option>
              {availableUsers.map(u => (
                <option key={u.id} value={u.id}>{userName(u)} — {u.email}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={addRole}
              onChange={e => setAddRole(e.target.value)}
              className="w-full text-sm border rounded-xl px-3 py-2.5 bg-white appearance-none pr-8 min-w-[160px]"
            >
              {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
          </div>
          <button
            onClick={add}
            disabled={!addUserId || adding}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 shrink-0"
          >
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add
          </button>
        </div>
      )}

      {/* Member list */}
      <div className="space-y-2">
        {members.length === 0 && (
          <div className="text-center py-10 text-gray-400 text-sm">No members yet. Add someone above.</div>
        )}
        {members.map(m => {
          const u = m.user;
          const initials = u ? userInitials(u) : '??';
          const name = u ? userName(u) : m.user_id;
          const email = u?.email || '';
          return (
            <div key={m.id} className="flex items-center gap-3 bg-white border rounded-2xl px-4 py-3 hover:shadow-sm transition-shadow">
              <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {u?.avatar_url
                  ? <img src={u.avatar_url} alt={name} className="w-9 h-9 rounded-full object-cover" />
                  : initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                <p className="text-xs text-gray-400 truncate">{email}</p>
              </div>
              <div className="relative shrink-0">
                <select
                  value={m.role}
                  onChange={e => changeRole(m, e.target.value)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 appearance-none pr-5 cursor-pointer ${ROLE_COLORS[m.role] || 'bg-gray-100 text-gray-600'}`}
                >
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 absolute right-1 top-1.5 pointer-events-none opacity-60" />
              </div>
              {m.user_id !== currentUserId && (
                <button
                  onClick={() => remove(m)}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  title="Remove member"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
