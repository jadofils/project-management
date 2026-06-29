import { useState, useEffect, useRef } from 'react';
import { X, Plus, UserPlus, Loader2, Search, Shield, ChevronDown, Check, Mail, Clock, Send } from 'lucide-react';
import { api, type Member, type User, type Invitation, userInitials, userName } from '../services/api';
import { ROLE_CATEGORIES, ALL_ROLES, getRoleDef } from '../lib/roles';
import { PERMISSION_LEVELS } from '../lib/permissions';
import { toast } from 'sonner';

interface Props {
  projectId: string;
  currentUserId: string;
  isManager: boolean;
}

// ── Role Multi-Select Dropdown ────────────────────────────────────────────────
function RolesDropdown({ value, onChange, placeholder = 'Select roles…' }: {
  value: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between text-sm border rounded-xl px-3 py-2 bg-white min-h-[38px] gap-2">
        {value.length === 0
          ? <span className="text-gray-400">{placeholder}</span>
          : <div className="flex flex-wrap gap-1 flex-1">
              {value.map(v => (
                <span key={v} className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRoleDef(v).badge}`}>
                  {getRoleDef(v).label}
                </span>
              ))}
            </div>
        }
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border rounded-xl shadow-xl max-h-60 overflow-y-auto">
          {ROLE_CATEGORIES.map(cat => (
            <div key={cat.label}>
              <p className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{cat.label}</p>
              {cat.roles.map(r => (
                <button key={r.value} type="button" onClick={() => toggle(r.value)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${value.includes(r.value) ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'}`}>
                    {value.includes(r.value) && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.badge}`}>{r.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function MembersPanel({ projectId, currentUserId, isManager }: Props) {
  const [members, setMembers]       = useState<Member[]>([]);
  const [allUsers, setAllUsers]     = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  // Add panel state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addRoles, setAddRoles]       = useState<string[]>(['backend_dev']);
  const [addPermLevel, setAddPermLevel] = useState('editor');
  const [addRoleDesc, setAddRoleDesc] = useState('');
  const [adding, setAdding]           = useState(false);
  const [showAdd, setShowAdd]         = useState(false);
  const [addMode, setAddMode]         = useState<'users' | 'invite'>('users');

  // Invite by email state
  const [inviteEmail, setInviteEmail]   = useState('');
  const [inviteRole, setInviteRole]     = useState('backend_dev');
  const [invitePerm, setInvitePerm]     = useState('editor');
  const [inviteRoleDesc, setInviteRoleDesc] = useState('');
  const [inviting, setInviting]         = useState(false);
  const [invitations, setInvitations]   = useState<Invitation[]>([]);
  const [loadingInv, setLoadingInv]     = useState(false);

  useEffect(() => {
    setLoading(true);
    const promises: Promise<any>[] = [api.getMembers(projectId), api.getUsers()];
    if (isManager) promises.push(api.getInvitations(projectId));
    Promise.all(promises)
      .then(([m, u, inv]) => { setMembers(m); setAllUsers(u); if (inv) setInvitations(inv); })
      .catch(() => toast.error('Failed to load members'))
      .finally(() => setLoading(false));
  }, [projectId, isManager]);

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await api.inviteByEmail(projectId, inviteEmail.trim(), inviteRole, invitePerm, inviteRoleDesc.trim() || undefined);
      toast.success(res.message);
      setInviteEmail('');
      // Refresh invitations list
      if (res.status === 'invited' || res.status === 'resent') {
        const updated = await api.getInvitations(projectId);
        setInvitations(updated);
      }
      if (res.status === 'added' && res.user) {
        // Reload members
        const fresh = await api.getMembers(projectId);
        setMembers(fresh);
      }
    } catch (e: any) { toast.error(e.message || 'Failed to send invitation'); }
    finally { setInviting(false); }
  };

  const cancelInvitation = async (inv: Invitation) => {
    try {
      await api.cancelInvitation(projectId, inv.id);
      setInvitations(prev => prev.filter(i => i.id !== inv.id));
      toast.success('Invitation cancelled');
    } catch { toast.error('Failed to cancel invitation'); }
  };

  const memberUserIds  = new Set(members.map(m => m.user_id));
  const q = search.toLowerCase();
  const availableUsers = allUsers.filter(u =>
    !memberUserIds.has(u.id) && u.is_active &&
    (!q || u.first_name.toLowerCase().includes(q) || u.last_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll  = () => setSelectedIds(new Set(availableUsers.map(u => u.id)));
  const clearAll   = () => setSelectedIds(new Set());

  const addSelected = async () => {
    if (selectedIds.size === 0 || addRoles.length === 0) return;
    setAdding(true);
    try {
      const newMembers = await api.addMembersBulk(
        projectId,
        [...selectedIds],
        addRoles[0],
        addPermLevel,
        addRoleDesc.trim() || undefined,
      );
      const users = allUsers.filter(u => selectedIds.has(u.id));
      const withRoles = newMembers.map(m => ({
        ...m,
        roles: addRoles as any,
        permission_level: addPermLevel as any,
        user: users.find(u => u.id === m.user_id),
      }));
      setMembers(prev => [...prev, ...withRoles.filter(m => !prev.some(p => p.user_id === m.user_id))]);
      setSelectedIds(new Set());
      setShowAdd(false);
      toast.success(`Added ${newMembers.length} member${newMembers.length > 1 ? 's' : ''}`);
    } catch (e: any) { toast.error(e.message || 'Failed to add members'); }
    finally { setAdding(false); }
  };

  const updateMember = async (m: Member, dto: { roles?: string[]; permission_level?: string; role_description?: string }) => {
    try {
      const updated = await api.updateMember(projectId, m.user_id, {
        ...dto,
        role: dto.roles?.[0] || m.role,
      });
      setMembers(prev => prev.map(x => x.id === m.id ? { ...x, ...updated, user: m.user } : x));
    } catch { toast.error('Failed to update member'); }
  };

  const remove = async (m: Member) => {
    if (!confirm(`Remove ${m.user ? userName(m.user) : 'this member'} from project?`)) return;
    try {
      await api.removeMember(projectId, m.user_id);
      setMembers(prev => prev.filter(x => x.id !== m.id));
      toast.success('Member removed');
    } catch { toast.error('Failed to remove member'); }
  };

  // Filter displayed members
  const mq = memberSearch.toLowerCase();
  const filteredMembers = members.filter(m => {
    if (!mq) return true;
    return (
      m.user?.first_name?.toLowerCase().includes(mq) ||
      m.user?.last_name?.toLowerCase().includes(mq)  ||
      m.user?.email?.toLowerCase().includes(mq)
    );
  });

  // Group by permission level for display
  const grouped = [
    { label: 'Managers', key: 'manager',     members: filteredMembers.filter(m => m.permission_level === 'manager' || (m.roles || [m.role]).includes('project_manager')) },
    { label: 'Editors',  key: 'editor',      members: filteredMembers.filter(m => m.permission_level === 'editor' && !(m.roles || [m.role]).includes('project_manager')) },
    { label: 'Contributors', key: 'contributor', members: filteredMembers.filter(m => m.permission_level === 'contributor') },
    { label: 'Viewers',  key: 'viewer',      members: filteredMembers.filter(m => m.permission_level === 'viewer') },
  ].filter(g => g.members.length > 0);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-indigo-500" />
            Project Members
            <span className="text-xs text-gray-400 font-normal">({members.length})</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Manage who can access and contribute to this project</p>
        </div>
        {isManager && (
          <button onClick={() => setShowAdd(s => !s)}
            className="flex items-center gap-1.5 text-sm px-3.5 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium shadow-sm">
            <Plus className="w-3.5 h-3.5" />Add Members
          </button>
        )}
      </div>

      {/* ── Add Members Panel ────────────────────────────────────────────── */}
      {showAdd && isManager && (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1 bg-white border rounded-xl p-1">
              <button onClick={() => setAddMode('users')}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${addMode === 'users' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                <UserPlus className="w-3.5 h-3.5" />Existing Users
              </button>
              <button onClick={() => setAddMode('invite')}
                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition ${addMode === 'invite' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                <Mail className="w-3.5 h-3.5" />Invite by Email
              </button>
            </div>
            <button onClick={() => { setShowAdd(false); setSelectedIds(new Set()); setSearch(''); }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Existing Users Tab ─────────────────────── */}
          {addMode === 'users' && (<>
            {/* Roles + permission for new members */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Assign Roles</label>
                <RolesDropdown value={addRoles} onChange={setAddRoles} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Permission Level</label>
                <select value={addPermLevel} onChange={e => setAddPermLevel(e.target.value)}
                  className="w-full text-sm border rounded-xl px-3 py-2 bg-white">
                  {PERMISSION_LEVELS.map(p => (
                    <option key={p.value} value={p.value}>{p.label} — {p.desc}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">
                Role Description <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input value={addRoleDesc} onChange={e => setAddRoleDesc(e.target.value)}
                placeholder="e.g. Responsible for API design and database schema"
                className="w-full text-sm border rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-300 outline-none" />
            </div>

            {/* User search */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search users by name or email…"
                className="w-full text-sm pl-9 pr-3 py-2 border rounded-xl bg-white focus:ring-2 focus:ring-indigo-300 outline-none" />
            </div>

            {/* Select all / clear */}
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs text-gray-500">{availableUsers.length} available · {selectedIds.size} selected</span>
              <div className="flex gap-3">
                <button type="button" onClick={selectAll} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Select all</button>
                <button type="button" onClick={clearAll} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
              </div>
            </div>

            {/* User checkbox list */}
            {availableUsers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                {search ? 'No users match your search' : 'All active users are already members'}
              </p>
            ) : (
              <div className="bg-white rounded-xl border divide-y max-h-48 overflow-y-auto">
                {availableUsers.map(u => (
                  <label key={u.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={selectedIds.has(u.id)} onChange={() => toggleSelect(u.id)}
                      className="w-4 h-4 rounded accent-indigo-600 shrink-0" />
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt={userName(u)} className="w-8 h-8 rounded-full object-cover" />
                        : userInitials(u)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{userName(u)}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${u.system_role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.system_role}
                    </span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex justify-end mt-4 gap-2">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-white rounded-xl border">Cancel</button>
              <button onClick={addSelected} disabled={adding || selectedIds.size === 0 || addRoles.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-medium">
                {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Add {selectedIds.size > 0 ? `${selectedIds.size} Member${selectedIds.size > 1 ? 's' : ''}` : 'Members'}
              </button>
            </div>
          </>)}

          {/* ── Invite by Email Tab ────────────────────── */}
          {addMode === 'invite' && (
            <form onSubmit={sendInvite} className="space-y-3">
              <p className="text-xs text-gray-500 mb-3">
                If the email exists in the system the user is added immediately. Otherwise an invitation link is sent by email.
              </p>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Email Address</label>
                <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full text-sm border rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-300 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Role</label>
                  <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                    className="w-full text-sm border rounded-xl px-3 py-2 bg-white">
                    {ROLE_CATEGORIES.flatMap(c => c.roles).map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Permission</label>
                  <select value={invitePerm} onChange={e => setInvitePerm(e.target.value)}
                    className="w-full text-sm border rounded-xl px-3 py-2 bg-white">
                    {PERMISSION_LEVELS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  Role Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input value={inviteRoleDesc} onChange={e => setInviteRoleDesc(e.target.value)}
                  placeholder="e.g. Leads frontend architecture and code reviews"
                  className="w-full text-sm border rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-300 outline-none" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-white rounded-xl border">Cancel</button>
                <button type="submit" disabled={inviting || !inviteEmail.trim()}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 font-medium">
                  {inviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Send Invitation
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Pending Invitations ──────────────────────────────────────────── */}
      {isManager && invitations.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Invitations</span>
            <span className="text-xs text-gray-300">({invitations.length})</span>
          </div>
          <div className="space-y-1.5">
            {invitations.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 group">
                <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center shrink-0">
                  <Mail className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{inv.email}</p>
                  <p className="text-xs text-gray-400">{inv.role.replace(/_/g, ' ')} · {inv.permission_level}
                    {inv.expires_at && <> · expires {new Date(inv.expires_at).toLocaleDateString()}</>}
                  </p>
                </div>
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold shrink-0">pending</span>
                <button onClick={() => cancelInvitation(inv)}
                  className="p-1.5 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  title="Cancel invitation">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Member search ────────────────────────────────────────────────── */}
      {members.length > 4 && (
        <div className="relative mb-4">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
            placeholder="Search members…"
            className="w-full text-sm pl-9 pr-3 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-300 outline-none bg-white" />
        </div>
      )}

      {/* ── Member list grouped by permission ───────────────────────────── */}
      {members.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No members yet</p>
          <p className="text-xs mt-1">Click "Add Members" to invite teammates</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.key}>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{group.label}</span>
                <span className="text-xs text-gray-300">({group.members.length})</span>
              </div>
              <div className="space-y-2">
                {group.members.map(m => {
                  const u       = m.user;
                  const name    = u ? userName(u) : m.user_id;
                  const mRoles  = m.roles?.length ? m.roles : [m.role];
                  const isMe    = m.user_id === currentUserId;
                  const permDef = PERMISSION_LEVELS.find(p => p.value === m.permission_level) || PERMISSION_LEVELS[2];

                  return (
                    <div key={m.id}
                      className="flex items-center gap-3 bg-white border rounded-2xl px-4 py-3 hover:shadow-sm transition-all group">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${getRoleDef(mRoles[0])?.dot || 'bg-indigo-500'}`}>
                        {u?.avatar_url
                          ? <img src={u.avatar_url} alt={name} className="w-10 h-10 rounded-full object-cover" />
                          : u ? userInitials(u) : '?'}
                      </div>

                      {/* Name + email + roles */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-semibold text-gray-800">{name}</p>
                          {isMe && <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-semibold">you</span>}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{u?.email}</p>
                        {/* Role badges */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {mRoles.map(r => (
                            <span key={r} className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${getRoleDef(r).badge}`}>
                              {getRoleDef(r).label}
                            </span>
                          ))}
                        </div>
                        {m.role_description && (
                          <p className="text-[11px] text-gray-400 mt-1 leading-tight italic">{m.role_description}</p>
                        )}
                      </div>

                      {/* Permission level badge + dropdown */}
                      {isManager && !isMe ? (
                        <div className="shrink-0 space-y-1.5">
                          {/* Roles multi-select */}
                          <div className="w-52">
                            <RolesDropdown
                              value={mRoles}
                              onChange={roles => updateMember(m, { roles })}
                              placeholder="No roles"
                            />
                          </div>
                          {/* Permission level */}
                          <select
                            value={m.permission_level}
                            onChange={e => updateMember(m, { permission_level: e.target.value })}
                            className={`w-full text-xs font-semibold px-2.5 py-1 rounded-lg border-0 cursor-pointer appearance-none ${permDef.color}`}
                          >
                            {PERMISSION_LEVELS.map(p => (
                              <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                          </select>
                          {/* Role description inline edit */}
                          <input
                            defaultValue={m.role_description || ''}
                            placeholder="Role description (optional)"
                            onBlur={e => { if (e.target.value !== (m.role_description || '')) updateMember(m, { role_description: e.target.value }); }}
                            className="w-full text-[11px] px-2.5 py-1 border rounded-lg bg-white text-gray-500 placeholder-gray-300 focus:ring-1 focus:ring-indigo-200 outline-none"
                          />
                        </div>
                      ) : (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0 ${permDef.color}`}>
                          {permDef.label}
                        </span>
                      )}

                      {/* Remove */}
                      {isManager && !isMe && (
                        <button onClick={() => remove(m)}
                          className="p-1.5 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
