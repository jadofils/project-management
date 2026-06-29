import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Plus, X, Loader2, Users, Search, Trash2, ImagePlus } from 'lucide-react';
import { api, type Task, type User, type Member, userName, userInitials } from '../services/api';
import { PHASES, getRoleDef, ROLE_CATEGORIES } from '../lib/roles';
import { COLUMNS } from '../lib/constants';

interface TaskRow {
  id: string;
  title: string;
  assigneeIds: string[];
  priority: string;
  dueDate: string;
  description: string;
  images: { file: File; preview: string; base64: string }[];
}

export function NewTaskModal({ defaultStatus, projectId, onCreated, onClose, isManager = false }: {
  defaultStatus: string; projectId: string; onCreated: (t: Task) => void; onClose: () => void; isManager?: boolean;
}) {
  const [module, setModule] = useState('');
  const [phase, setPhase] = useState('');
  const [rows, setRows] = useState<TaskRow[]>([{ id: '1', title: '', assigneeIds: [], priority: 'medium', dueDate: '', description: '', images: [] }]);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([api.getUsers(), api.getMembers(projectId)]).then(([u, m]) => { setUsers(u); setMembers(m); }).catch(() => {});
    const handler = (e: MouseEvent) => { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setOpenPicker(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [projectId]);

  const memberRoleMap = Object.fromEntries(members.map(m => [m.user_id, m.role]));
  const q = search.toLowerCase();
  const filteredUsers = users.filter(u => !q || u.first_name.toLowerCase().includes(q) || u.last_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  const grouped = ROLE_CATEGORIES.map(cat => ({ ...cat, users: filteredUsers.filter(u => cat.roles.some(r => r.value === memberRoleMap[u.id])) })).filter(g => g.users.length > 0);
  const ungrouped = filteredUsers.filter(u => !memberRoleMap[u.id]);

  const updateRow = (rowId: string, field: keyof TaskRow, value: any) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, [field]: value } : r));
  };

  const toggleAssignee = (rowId: string, userId: string) => {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const ids = r.assigneeIds.includes(userId) ? r.assigneeIds.filter(x => x !== userId) : [...r.assigneeIds, userId];
      return { ...r, assigneeIds: ids };
    }));
  };

  const addRow = () => {
    setRows(prev => [...prev, { id: String(Date.now()), title: '', assigneeIds: [], priority: 'medium', dueDate: '', description: '', images: [] }]);
  };

  const addImages = async (rowId: string, files: FileList | null) => {
    if (!files) return;
    const items = await Promise.all(Array.from(files).slice(0, 6).map(file => new Promise<{ file: File; preview: string; base64: string }>(resolve => {
      const reader = new FileReader();
      reader.onload = e => {
        const result = e.target?.result as string;
        const base64 = result.split(',')[1];
        resolve({ file, preview: result, base64 });
      };
      reader.readAsDataURL(file);
    })));
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, images: [...r.images, ...items].slice(0, 6) } : r));
  };

  const removeImage = (rowId: string, idx: number) => {
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, images: r.images.filter((_, i) => i !== idx) } : r));
  };

  const removeRow = (rowId: string) => {
    if (rows.length <= 1) return;
    setRows(prev => prev.filter(r => r.id !== rowId));
  };

  const createAll = async () => {
    const valid = rows.filter(r => r.title.trim());
    if (valid.length === 0) return;
    if (!module.trim()) { toast.error('Module name is required'); return; }
    setSaving(true);
    try {
      for (const row of valid) {
        let task = await api.createTask({
          project_id: projectId,
          title: row.title.trim(),
          status: defaultStatus,
          priority: row.priority,
          phase: phase || undefined,
          due_date: row.dueDate || undefined,
          description: row.description.trim() || undefined,
          module: module.trim(),
          assignee_ids: row.assigneeIds.length ? row.assigneeIds : undefined,
          assignee_id: row.assigneeIds[0] || undefined,
        });
        if (row.images.length) {
          task = await api.uploadTaskImages(task.id, row.images.map(i => i.base64)).catch(() => task);
        }
        onCreated(task);
      }
      toast.success(`${valid.length} task${valid.length > 1 ? 's' : ''} created in module "${module.trim()}"`);
      onClose();
    } catch { toast.error('Failed to create tasks'); }
    finally { setSaving(false); }
  };

  const getSelectedUsers = (rowId: string) => {
    const row = rows.find(r => r.id === rowId);
    return (row?.assigneeIds || []).map(id => users.find(x => x.id === id)).filter(Boolean) as User[];
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()} ref={pickerRef}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">New Module Tasks</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-4">
          {/* Module Name — FIRST */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Module / Feature Name</label>
            <input value={module} onChange={e => setModule(e.target.value)}
              placeholder="e.g. Course Management, User Authentication, Payment Gateway"
              className="w-full p-3 border-2 border-indigo-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-300 outline-none bg-indigo-50/30"
              autoFocus />
          </div>

          {/* Column + Phase */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Default Column</label>
              <select value={defaultStatus} disabled className="w-full text-sm border rounded-xl px-3 py-2 bg-gray-50 text-gray-400">
                {COLUMNS.filter(c => c.id !== 'rework').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Phase / Role Group</label>
              <select value={phase} onChange={e => setPhase(e.target.value)} className="w-full text-sm border rounded-xl px-3 py-2 bg-white">
                <option value="">None</option>
                {PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {/* Task Rows */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tasks in this Module</label>
              <span className="text-[10px] text-gray-400">{rows.length} task{rows.length > 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={row.id} className="bg-gray-50 rounded-xl p-3 border space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-300 w-4">{i + 1}.</span>
                    <input value={row.title} onChange={e => updateRow(row.id, 'title', e.target.value)}
                      placeholder={`Task ${i + 1} title`}
                      className="flex-1 px-2.5 py-1.5 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Assignee mini picker — only project managers can assign tasks */}
                      {isManager && (
                      <div className="relative">
                        <button type="button" onClick={() => setOpenPicker(openPicker === row.id ? null : row.id)}
                          className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg border bg-white text-gray-500 hover:border-indigo-300">
                          <Users className="w-3 h-3" />
                          {row.assigneeIds.length > 0 && <span className="font-medium text-indigo-600">{row.assigneeIds.length}</span>}
                        </button>
                        {openPicker === row.id && (
                          <div className="absolute z-30 top-full right-0 mt-1 w-56 bg-white border rounded-xl shadow-xl max-h-48 overflow-hidden">
                            <div className="p-1.5 border-b"><input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full text-[10px] px-2 py-1 border rounded-lg outline-none" /></div>
                            <div className="overflow-y-auto max-h-36 p-1">
                              {grouped.map(cat => (
                                <div key={cat.label}>
                                  <div className="px-2 py-0.5 text-[9px] font-bold text-gray-400 uppercase">{cat.label}</div>
                                  {cat.users.map(u => (
                                    <label key={u.id} className="flex items-center gap-1.5 px-2 py-1 hover:bg-gray-50 cursor-pointer rounded text-[11px]">
                                      <input type="checkbox" checked={row.assigneeIds.includes(u.id)} onChange={() => toggleAssignee(row.id, u.id)} className="w-3 h-3 rounded accent-indigo-600" />
                                      <span className="truncate">{userName(u)}</span>
                                    </label>
                                  ))}
                                </div>
                              ))}
                            </div>
                            <button onClick={() => setOpenPicker(null)} className="w-full py-1.5 bg-indigo-600 text-white text-[10px] font-medium hover:bg-indigo-700">Done</button>
                          </div>
                        )}
                      </div>
                      )}
                      <select value={row.priority} onChange={e => updateRow(row.id, 'priority', e.target.value)}
                        className="text-[10px] border rounded-lg px-1.5 py-1.5 bg-white w-20">
                        <option value="low">Low</option><option value="medium">Med</option><option value="high">High</option><option value="critical">Crit</option>
                      </select>
                      <input type="date" value={row.dueDate} onChange={e => updateRow(row.id, 'dueDate', e.target.value)}
                        className="text-[10px] border rounded-lg px-1.5 py-1.5 bg-white w-28" />
                      <button onClick={() => removeRow(row.id)} disabled={rows.length <= 1}
                        className="p-1 text-gray-300 hover:text-red-400 disabled:opacity-20"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  {row.assigneeIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 pl-5">
                      {getSelectedUsers(row.id).map(u => (
                        <span key={u.id} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${memberRoleMap[u.id] ? getRoleDef(memberRoleMap[u.id]).badge : 'bg-gray-100 text-gray-600'}`}>
                          {userName(u)}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Image upload */}
                  <div className="pl-5">
                    <label className="inline-flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-indigo-500 cursor-pointer border border-dashed border-gray-200 hover:border-indigo-300 rounded-lg px-2.5 py-1.5">
                      <ImagePlus className="w-3 h-3" />
                      Add screenshots
                      <input type="file" accept="image/*" multiple className="hidden" onChange={e => addImages(row.id, e.target.files)} />
                    </label>
                    {row.images.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {row.images.map((img, idx) => (
                          <div key={idx} className="relative group">
                            <img src={img.preview} alt="" className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
                            <button onClick={() => removeImage(row.id, idx)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] items-center justify-center hidden group-hover:flex">×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addRow}
              className="mt-2 w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-indigo-300 hover:text-indigo-500 flex items-center justify-center gap-1">
              <Plus className="w-3 h-3" />Add Another Task
            </button>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-5 pt-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
          <button onClick={createAll} disabled={saving || !module.trim() || !rows.some(r => r.title.trim())}
            className="px-5 py-2 text-sm bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2 font-medium">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Create {rows.filter(r => r.title.trim()).length || ''} Task{rows.filter(r => r.title.trim()).length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
