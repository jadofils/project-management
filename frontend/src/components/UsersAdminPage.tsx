import { useState, useEffect } from 'react';
import { Loader2, UserCog, Shield, ShieldOff, UserCheck, UserX, ChevronDown } from 'lucide-react';
import { api, type User, userInitials, userName } from '../services/api';
import { toast } from 'sonner';

const ROLE_LABELS: Record<string, string> = {
  project_manager: 'Project Manager',
  backend_dev:     'Backend Dev',
  frontend_dev:    'Frontend Dev',
  documentalist:   'Documentalist',
  tester:          'Tester',
  qa_tester:       'QA & ST',
};

const SYSTEM_ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  user:  'bg-gray-100 text-gray-600',
};

interface Props {
  currentUser: User;
}

export function UsersAdminPage({ currentUser }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getUsers()
      .then(setUsers)
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  const toggleActive = async (u: User) => {
    const updated = await api.updateUser(u.id, { is_active: !u.is_active }).catch(e => {
      toast.error(e.message);
      return null;
    });
    if (updated) {
      setUsers(prev => prev.map(x => x.id === u.id ? updated : x));
      toast.success(updated.is_active ? 'User activated' : 'User deactivated');
    }
  };

  const changeSystemRole = async (u: User, role: string) => {
    const updated = await api.updateUser(u.id, { system_role: role as User['system_role'] }).catch(e => {
      toast.error(e.message);
      return null;
    });
    if (updated) {
      setUsers(prev => prev.map(x => x.id === u.id ? updated : x));
      toast.success('Role updated');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <UserCog className="w-4 h-4 text-indigo-500" /> User Management
        </h2>
        <span className="text-xs text-gray-400">{users.length} users</span>
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
              const initials = userInitials(u);
              const name = userName(u);
              return (
                <tr key={u.id} className={`hover:bg-gray-50/50 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt={name} className="w-8 h-8 rounded-full object-cover" />
                          : initials}
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
                      <select
                        value={u.system_role}
                        onChange={e => changeSystemRole(u, e.target.value)}
                        disabled={isMe}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full appearance-none pr-6 cursor-pointer border-0 ${SYSTEM_ROLE_COLORS[u.system_role] || ''} disabled:cursor-not-allowed`}
                      >
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
                      <button
                        onClick={() => toggleActive(u)}
                        className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                          u.is_active
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={u.is_active ? 'Deactivate' : 'Activate'}
                      >
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

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
        <strong>Demo credentials:</strong> All seeded users use password <span className="font-mono">admin123</span>.
        Admin account: <span className="font-mono">admin@pm.local</span>
      </div>
    </div>
  );
}
