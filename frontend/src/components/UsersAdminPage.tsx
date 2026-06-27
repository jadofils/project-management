import { useState, useEffect, useMemo } from 'react';
import {
  Loader2, UserCog, UserCheck, UserX, ChevronDown, Plus, X,
  Mail, Search, ChevronLeft, ChevronRight, Bell, Check, Pencil, Trash2,
} from 'lucide-react';
import { api, type User, type Member, userInitials, userName } from '../services/api';
import { toast } from 'sonner';
import { MailComposer } from './MailComposer';
import { ALL_ROLES, getRoleDef } from '../lib/roles';

const SYSTEM_ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  user:  'bg-gray-100 text-gray-600',
};

const PAGE_SIZE = 20;

interface Props {
  currentUser: User;
  // When provided, scope users to members of these projects (PM view)
  projectId?: string;
}

// ── Create User Modal ─────────────────────────────────────────────────────────
function CreateUserModal({ onCreated, onClose }: { onCreated: (u: User) => void; onClose: () => void }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', system_role: 'user', project_role: '' });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await api.createUser({ ...form } as any);
      toast.success(`Account created — a temporary password has been sent to ${form.email}`);
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
          <h2 className="font-semibold text-gray-900">Create User</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
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
              <input value={form.last_name} onChange={set('last_name')} placeholder="Smith" required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Email</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="user@company.com" required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          </div>
          <p className="text-[11px] text-gray-400 -mt-2">A strong temporary password will be auto-generated and sent to the user's email.</p>
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
          {form.system_role === 'user' && (
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Default Project Role</label>
              <div className="relative">
                <select value={form.project_role} onChange={set('project_role')}
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-white appearance-none pr-8">
                  <option value="">None (assign later)</option>
                  {ALL_ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-3 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-2.5">{error}</div>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit User Modal ───────────────────────────────────────────────────────────
function EditUserModal({ user, onUpdated, onClose }: { user: User; onUpdated: (u: User) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    system_role: user.system_role,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const updated = await api.updateUser(user.id, form as any);
      toast.success('User updated');
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-semibold text-gray-900">Edit User</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">First Name</label>
              <input value={form.first_name} onChange={set('first_name')} required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Last Name</label>
              <input value={form.last_name} onChange={set('last_name')} required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Email</label>
            <input type="email" value={form.email} onChange={set('email')} required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
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
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function UsersAdminPage({ currentUser, projectId }: Props) {
  const [users, setUsers]             = useState<User[]>([]);
  const [members, setMembers]         = useState<Member[]>([]);
  const [allMembers, setAllMembers]   = useState<Record<string, string[]>>({});
  const [loading, setLoading]         = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [showMail, setShowMail]       = useState(false);
  const [editUser, setEditUser]       = useState<User | null>(null);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [search, setSearch]           = useState('');
  const [page, setPage]               = useState(1);
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [filterRole, setFilterRole]   = useState<'all' | 'admin' | 'user'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const isAdmin = currentUser.system_role === 'admin';

  useEffect(() => {
    setLoading(true);
    const promises: Promise<any>[] = [api.getUsers()];
    if (projectId) promises.push(api.getMembers(projectId));
    Promise.all(promises)
      .then(([u, m]) => {
        setUsers(u);
        if (m) setMembers(m);
      })
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, [projectId]);

  // ── Filter logic ──────────────────────────────────────────────────────────
  const memberUserIds = useMemo(() => new Set(members.map(m => m.user_id)), [members]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter(u => {
      // Scope: if projectId provided (PM view), only show project members
      if (projectId && !memberUserIds.has(u.id)) return false;
      // Role filter
      if (filterRole !== 'all' && u.system_role !== filterRole) return false;
      // Status filter
      if (filterStatus === 'active'   && !u.is_active) return false;
      if (filterStatus === 'inactive' && u.is_active)  return false;
      // Search
      if (!q) return true;
      return (
        u.first_name.toLowerCase().includes(q) ||
        u.last_name.toLowerCase().includes(q)  ||
        u.email.toLowerCase().includes(q)
      );
    });
  }, [users, search, filterRole, filterStatus, projectId, memberUserIds]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageUsers = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset to page 1 when filter changes
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  // ── Selection ─────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () => {
    if (pageUsers.every(u => selected.has(u.id))) {
      setSelected(prev => { const n = new Set(prev); pageUsers.forEach(u => n.delete(u.id)); return n; });
    } else {
      setSelected(prev => { const n = new Set(prev); pageUsers.forEach(u => n.add(u.id)); return n; });
    }
  };

  const allPageSelected = pageUsers.length > 0 && pageUsers.every(u => selected.has(u.id));

  // ── Actions ───────────────────────────────────────────────────────────────
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

  const hardDelete = async (u: User) => {
    if (!confirm(`Permanently delete ${userName(u)} (${u.email})? This cannot be undone.`)) return;
    setDeletingId(u.id);
    try {
      await api.permanentDeleteUser(u.id);
      setUsers(prev => prev.filter(x => x.id !== u.id));
      toast.success(`${u.email} permanently deleted`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Selected emails for mail composer ─────────────────────────────────────
  const selectedEmails = users.filter(u => selected.has(u.id)).map(u => u.email);
  const selectedCount = selected.size;

  const memberRole = (userId: string) => {
    const m = members.find(m => m.user_id === userId);
    if (!m) return null;
    const roles = m.roles?.length ? m.roles : [m.role];
    return roles[0]?.replace(/_/g, ' ') || null;
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      {showCreate && (
        <CreateUserModal
          onCreated={u => setUsers(prev => [u, ...prev])}
          onClose={() => setShowCreate(false)}
        />
      )}
      {editUser && (
        <EditUserModal
          user={editUser}
          onUpdated={updated => setUsers(prev => prev.map(x => x.id === updated.id ? updated : x))}
          onClose={() => setEditUser(null)}
        />
      )}
      {showMail && (
        <MailComposer
          onClose={() => { setShowMail(false); setSelected(new Set()); }}
          preselectedEmails={selectedEmails}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div>
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <UserCog className="w-4 h-4 text-indigo-500" />
            {projectId ? 'Project Contributors' : 'User Management'}
            <span className="text-xs text-gray-400 font-normal">({filtered.length} users)</span>
          </h2>
          {projectId && <p className="text-xs text-gray-400 mt-0.5">Members who have contributed to this project</p>}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {selectedCount > 0 && (
            <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-1.5">
              <span className="text-xs font-semibold text-indigo-700">{selectedCount} selected</span>
              <button onClick={() => setShowMail(true)}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium border-l border-indigo-200 pl-2">
                <Bell className="w-3.5 h-3.5" />Notify
              </button>
              <button onClick={() => setSelected(new Set())}
                className="text-indigo-400 hover:text-indigo-600 border-l border-indigo-200 pl-2">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <button onClick={() => setShowMail(true)}
            className="flex items-center gap-1.5 text-sm px-3 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-medium">
            <Mail className="w-3.5 h-3.5 text-indigo-500" />Email
          </button>
          {isAdmin && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 text-sm px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium shadow-sm">
              <Plus className="w-3.5 h-3.5" />Invite User
            </button>
          )}
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none bg-white"
          />
        </div>
        {isAdmin && (
          <>
            <select value={filterRole} onChange={e => { setFilterRole(e.target.value as any); setPage(1); }}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="all">All roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value as any); setPage(1); }}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-300 outline-none">
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </>
        )}
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 w-10">
                <button
                  onClick={toggleAll}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${allPageSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 hover:border-indigo-400'}`}
                >
                  {allPageSelected && <Check className="w-2.5 h-2.5 text-white" />}
                </button>
              </th>
              <th className="text-left px-4 py-3 font-semibold">User</th>
              <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Project Role</th>
              <th className="text-left px-4 py-3 font-semibold">System Role</th>
              <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Status</th>
              <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Joined</th>
              {isAdmin && <th className="text-left px-4 py-3 font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pageUsers.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400">
                  <Search className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No users found</p>
                  {search && <p className="text-xs mt-1">Try adjusting your search</p>}
                </td>
              </tr>
            ) : pageUsers.map(u => {
              const isMe    = u.id === currentUser.id;
              const name    = userName(u);
              const isSelected = selected.has(u.id);

              return (
                <tr
                  key={u.id}
                  onClick={() => toggleSelect(u.id)}
                  className={`hover:bg-gray-50/60 transition-colors cursor-pointer ${!u.is_active ? 'opacity-50' : ''} ${isSelected ? 'bg-indigo-50/40' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}
                      onClick={e => { e.stopPropagation(); toggleSelect(u.id); }}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt={name} className="w-8 h-8 object-cover" />
                          : userInitials(u)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800 leading-none">
                          {name}
                          {isMe && <span className="ml-1 text-[10px] text-indigo-400 font-normal">(you)</span>}
                        </p>
                        <p className="text-xs text-gray-400 md:hidden mt-0.5">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell text-xs">{u.email}</td>

                  <td className="px-4 py-3 hidden sm:table-cell">
                    {(() => {
                      const r = projectId ? memberRole(u.id) : null;
                      return r ? (
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium capitalize">{r}</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      );
                    })()}
                  </td>

                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {isAdmin && !isMe ? (
                      <div className="relative inline-block">
                        <select
                          value={u.system_role}
                          onChange={e => changeSystemRole(u, e.target.value)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full appearance-none pr-5 cursor-pointer border-0 ${SYSTEM_ROLE_COLORS[u.system_role] || ''}`}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                        <ChevronDown className="w-3 h-3 absolute right-1 top-1.5 pointer-events-none opacity-60" />
                      </div>
                    ) : (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${SYSTEM_ROLE_COLORS[u.system_role] || ''}`}>
                        {u.system_role}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-xs text-gray-400 hidden sm:table-cell">
                    {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>

                  {isAdmin && (
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      {!isMe && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditUser(u)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                            title="Edit user"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => toggleActive(u)}
                            className={`p-1.5 rounded-lg transition-colors ${u.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`}
                            title={u.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => hardDelete(u)}
                            disabled={deletingId === u.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-30"
                            title="Permanently delete"
                          >
                            {deletingId === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-xs text-gray-400">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} users
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let pg: number;
              if (totalPages <= 7) {
                pg = i + 1;
              } else if (currentPage <= 4) {
                pg = i + 1;
              } else if (currentPage >= totalPages - 3) {
                pg = totalPages - 6 + i;
              } else {
                pg = currentPage - 3 + i;
              }
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${pg === currentPage ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  {pg}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
