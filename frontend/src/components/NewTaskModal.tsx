import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Plus, X, Loader2, Users, Search } from 'lucide-react';
import { api, type Task, type User, type Member, userName, userInitials } from '../services/api';
import { PHASES, getRoleDef, ROLE_CATEGORIES } from '../lib/roles';
import { COLUMNS } from '../lib/constants';

export function NewTaskModal({ defaultStatus, projectId, onCreated, onClose }: {
  defaultStatus: string; projectId: string; onCreated: (t: Task) => void; onClose: () => void;
}) {
  const [form, setForm] = useState({ status: defaultStatus, title: '', priority: 'medium', phase: '', dueDate: '', description: '', module: '' });
  const [saving, setSaving]         = useState(false);
  const [users, setUsers]           = useState<User[]>([]);
  const [members, setMembers]       = useState<Member[]>([]);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [search, setSearch]         = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef                   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([api.getUsers(), api.getMembers(projectId)]).then(([u, m]) => {
      setUsers(u); setMembers(m);
    }).catch(() => {});
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [projectId]);

  const memberRoleMap = Object.fromEntries(members.map(m => [m.user_id, m.role]));
  const q = search.toLowerCase();
  const filteredUsers = users.filter(u =>
    !q || u.first_name.toLowerCase().includes(q) || u.last_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
  );
  const grouped = ROLE_CATEGORIES.map(cat => ({
    ...cat,
    users: filteredUsers.filter(u => cat.roles.some(r => r.value === memberRoleMap[u.id])),
  })).filter(g => g.users.length > 0);
  const ungrouped = filteredUsers.filter(u => !memberRoleMap[u.id]);

  const toggle = (id: string) => setAssigneeIds(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
  );
  const toggleGroup = (ids: string[]) => {
    const allOn = ids.every(id => assigneeIds.includes(id));
    setAssigneeIds(allOn ? assigneeIds.filter(id => !ids.includes(id)) : [...new Set([...assigneeIds, ...ids])]);
  };

  const create = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const task = await api.createTask({
        project_id: projectId, title: form.title.trim(), status: form.status as Task['status'],
        priority: form.priority, phase: form.phase || undefined,
        due_date: form.dueDate || undefined, description: form.description.trim() || undefined,
        module: form.module.trim() || undefined,
        assignee_ids: assigneeIds.length ? assigneeIds : undefined,
        assignee_id: assigneeIds[0] || undefined,
      });
      onCreated(task); onClose(); toast.success('Task added');
    } catch { toast.error('Failed to create task'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">New Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Task title *" className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
            autoFocus onKeyDown={e => e.key === 'Enter' && create()} />
          <input value={form.module} onChange={e => setForm(f => ({ ...f, module: e.target.value }))}
            placeholder="Module (optional) — e.g. Course Management"
            className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)" className="w-full p-2.5 border rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-300 outline-none" rows={2} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Column</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full text-sm border rounded-xl px-3 py-2 bg-white">
                {COLUMNS.filter(c => c.id !== 'rework').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="w-full text-sm border rounded-xl px-3 py-2 bg-white">
                <option value="low">Low</option><option value="medium">Medium</option>
                <option value="high">High</option><option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Phase / Role Group</label>
              <select value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value }))} className="w-full text-sm border rounded-xl px-3 py-2 bg-white">
                <option value="">None</option>
                {PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              {form.phase && (
                <p className="text-[10px] text-indigo-500 mt-1">
                  Notifies: {PHASES.find(p => p.value === form.phase)?.roles.map(r => getRoleDef(r).label).join(', ')}
                </p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full text-sm border rounded-xl px-3 py-2 bg-white" />
            </div>
          </div>

          <div ref={pickerRef} className="relative">
            <label className="text-xs text-gray-500 mb-1 block">Assignees</label>
            <button type="button" onClick={() => setShowPicker(o => !o)}
              className="w-full text-left text-sm border rounded-xl px-3 py-2 bg-white flex items-center gap-2 min-h-[38px]">
              {assigneeIds.length === 0 ? (
                <span className="text-gray-400">Assign to people or role…</span>
              ) : (
                <div className="flex flex-wrap gap-1 flex-1">
                  {assigneeIds.map(id => {
                    const u = users.find(x => x.id === id);
                    if (!u) return null;
                    const role = memberRoleMap[id];
                    return (
                      <span key={id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${role ? getRoleDef(role).badge : 'bg-gray-100 text-gray-600'}`}>
                        {userName(u)}
                      </span>
                    );
                  })}
                </div>
              )}
              <Users className="w-3.5 h-3.5 text-gray-400 ml-auto shrink-0" />
            </button>

            {showPicker && (
              <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border rounded-xl shadow-xl flex flex-col max-h-60 overflow-hidden">
                <div className="p-2 border-b">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search users…"
                      className="w-full text-sm pl-8 pr-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none" />
                  </div>
                </div>
                <div className="overflow-y-auto flex-1 p-1">
                  {grouped.map(cat => (
                    <div key={cat.label}>
                      <div className="flex items-center justify-between px-3 py-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{cat.label}</span>
                        <button type="button" onClick={() => toggleGroup(cat.users.map(u => u.id))}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium">
                          {cat.users.every(u => assigneeIds.includes(u.id)) ? 'Deselect all' : 'Select all'}
                        </button>
                      </div>
                      {cat.users.map(u => (
                        <label key={u.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer rounded-lg">
                          <input type="checkbox" checked={assigneeIds.includes(u.id)} onChange={() => toggle(u.id)}
                            className="w-3.5 h-3.5 rounded accent-indigo-600" />
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0 ${getRoleDef(memberRoleMap[u.id])?.dot || 'bg-gray-400'}`}>
                            {userInitials(u)}
                          </div>
                          <span className="flex-1 text-sm text-gray-800 truncate">{userName(u)}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${getRoleDef(memberRoleMap[u.id])?.badge || 'bg-gray-100 text-gray-500'}`}>
                            {getRoleDef(memberRoleMap[u.id])?.label || ''}
                          </span>
                        </label>
                      ))}
                    </div>
                  ))}
                  {ungrouped.length > 0 && (
                    <div>
                      <div className="px-3 py-1"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Other</span></div>
                      {ungrouped.map(u => (
                        <label key={u.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer rounded-lg">
                          <input type="checkbox" checked={assigneeIds.includes(u.id)} onChange={() => toggle(u.id)}
                            className="w-3.5 h-3.5 rounded accent-indigo-600" />
                          <div className="w-5 h-5 rounded-full bg-gray-400 flex items-center justify-center text-white text-[8px] font-bold shrink-0">{userInitials(u)}</div>
                          <span className="flex-1 text-sm text-gray-800 truncate">{userName(u)}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="border-t px-3 py-2 flex items-center justify-between bg-gray-50">
                  <span className="text-xs text-gray-500">{assigneeIds.length} selected</span>
                  <button type="button" onClick={() => setShowPicker(false)}
                    className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={create} disabled={saving || !form.title.trim()} className="px-4 py-2 text-sm bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}Add Task
          </button>
        </div>
      </div>
    </div>
  );
}
