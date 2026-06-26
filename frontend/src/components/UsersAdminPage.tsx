import { useState, useEffect } from 'react';
import { Loader2, UserCog, UserCheck, UserX, ChevronDown, Plus, Eye, EyeOff, X, Mail } from 'lucide-react';
import { api, type User, userInitials, userName } from '../services/api';
import { toast } from 'sonner';
import { MailComposer } from './MailComposer';

const SYSTEM_ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  user:  'bg-gray-100 text-gray-600',
};

interface Props { currentUser: User; }

function CreateUserModal({ onCreated, onClose }: { onCreated: (u: User) => void; onClose: () => void }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '', system_role: 'user' });
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await api.createUser(form);
      toast.success(`Account created — invitation email sent to ${form.email}`);
      onCreated(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Create & Invite User</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">First Name</label>
              <input value={form.first_name} onChange={set('first_name')} placeholder="Alice" required autoFocus
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Last Name</label>
              <input value={form.last_name} onChange={set('last_name')} placeholder="Manager" required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Email</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="user@company.com" required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Initial Password</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="Min 6 characters" required minLength={6}
                className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
              <button type="button" onClick={() => setShowPwd(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">System Role</label>
            <div className="relative">
              <select value={form.system_role} onChange={set('system_role')}
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white appearance-none pr-8">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-2.5">{error}</div>
          )}
          <p className="text-xs text-gray-400 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
            An invitation email with the login credentials will be sent to the user automatically.
          </p>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}Create & Invite
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function UsersAdminPage({ currentUser }: Props) {
  const [users, setUsers]           = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showMail, setShowMail]     = useState(false);

  useEffect(() => {
    api.getUsers()
      .then(setUsers)
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  const toggleActive = async (u: User) => {
    const updated = await api.updateUser(u.id, { is_active: !u.is_active }).catch(e => { toast.error(e.message); return null; });
    if (updated) {
      setUsers(prev => prev.map(x => x.id === u.id ? updated : x));
      toast.success(updated.is_active ? 'User activated' : 'User deactivated');
    }
  };

  const changeSystemRole = async (u: User, role: string) => {
    const updated = await api.updateUser(u.id, { system_role: role as User['system_role'] }).catch(e => { toast.error(e.message); return null; });
    if (updated) {
      setUsers(prev => prev.map(x => x.id === u.id ? updated : x));
      toast.success('Role updated');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
  );

  return (
    <div className="max-w-5xl mx-auto py-6 px-4">
      {showCreate && (
        <CreateUserModal
          onCreated={u => setUsers(prev => [...prev, u])}
          onClose={() => setShowCreate(false)}
        />
      )}
      {showMail && <MailComposer onClose={() => setShowMail(false)} />}

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <UserCog className="w-4 h-4 text-indigo-500" /> User Management
          <span className="text-xs text-gray-400 font-normal ml-1">({users.length} users)</span>
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowMail(true)}
            className="flex items-center gap-1.5 text-sm px-3 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium">
            <Mail className="w-4 h-4 text-indigo-500" />Send Email
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-sm px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium">
            <Plus className="w-4 h-4" />Invite User
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-semibold">User</th>
              <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-3 font-semibold">System Role</th>
              <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Status</th>
              <th className="text-left px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => {
              const isMe = u.id === currentUser.id;
              const name = userName(u);
              return (
                <tr key={u.id} className={`hover:bg-gray-50/50 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt={name} className="w-8 h-8 rounded-full object-cover" />
                          : userInitials(u)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{name} {isMe && <span className="text-[10px] text-indigo-400 font-normal">(you)</span>}</p>
                        <p className="text-xs text-gray-400 md:hidden">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{u.email}</td>
                  <td className="px-4 py-3">
                    <div className="relative inline-block">
                      <select value={u.system_role} onChange={e => changeSystemRole(u, e.target.value)}
                        disabled={isMe}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full appearance-none pr-6 cursor-pointer border-0 ${SYSTEM_ROLE_COLORS[u.system_role] || ''} disabled:cursor-not-allowed`}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                      {!isMe && <ChevronDown className="w-3 h-3 absolute right-1 top-1.5 pointer-events-none opacity-60" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!isMe && (
                      <button onClick={() => toggleActive(u)}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${u.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>
                        {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{u.is_active ? 'Deactivate' : 'Activate'}</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
