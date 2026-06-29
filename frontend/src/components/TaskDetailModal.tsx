import { useState, useEffect, useRef } from 'react';
import {
  X, Trash2, Send, Loader2, Calendar, Flag, Layers, MessageSquare,
  Check, Users, Search, Plus, GripVertical, CheckSquare, Square,
  FolderOpen, ChevronDown, ChevronUp,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import {
  api, type Task, type Comment, type User, type Member, type Subtask,
  userName, userInitials,
} from '../services/api';
import { ROLE_CATEGORIES, PHASES, getRoleDef } from '../lib/roles';
import type { ProjectPermissions } from '../lib/permissions';

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const STATUSES   = ['todo', 'in_progress', 'review', 'rework', 'done'] as const;

const FULL_PERMS: ProjectPermissions = {
  canManageMembers: true, canCreateTask: true, canEditTask: true,
  canDeleteTask: true, canComment: true, canTickSubtask: true,
  canDrag: true, canManageProject: true, canAssignTask: true, isManager: true,
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  medium:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  low:      'bg-green-100 text-green-700 border-green-200',
};

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do', in_progress: 'In Progress', review: 'Review', rework: 'Rework', done: 'Done',
};

interface Props {
  task: Task;
  onClose: () => void;
  onUpdate: (updated: Task) => void;
  onDelete: (id: string) => void;
  permissions?: ProjectPermissions;
}

// ── Assignee Picker ───────────────────────────────────────────────────────────
function AssigneePicker({ users, members, value, onChange }: {
  users: User[]; members: Member[]; value: string[]; onChange: (ids: string[]) => void;
}) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const roleMap = Object.fromEntries(members.map(m => [m.user_id, m.role]));
  const q       = search.toLowerCase();
  const filtered = users.filter(u =>
    !q || u.first_name.toLowerCase().includes(q) || u.last_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
  );
  const grouped   = ROLE_CATEGORIES.map(cat => ({ ...cat, users: filtered.filter(u => cat.roles.some(r => r.value === roleMap[u.id])) })).filter(g => g.users.length > 0);
  const ungrouped = filtered.filter(u => !roleMap[u.id]);

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id]);
  const toggleGroup = (ids: string[]) => {
    const allOn = ids.every(id => value.includes(id));
    onChange(allOn ? value.filter(id => !ids.includes(id)) : [...new Set([...value, ...ids])]);
  };

  const selectedUsers = users.filter(u => value.includes(u.id));

  const Row = ({ u }: { u: User }) => (
    <label className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer rounded-lg">
      <input type="checkbox" checked={value.includes(u.id)} onChange={() => toggle(u.id)} className="w-3.5 h-3.5 rounded accent-indigo-600 shrink-0" />
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 ${getRoleDef(roleMap[u.id])?.dot || 'bg-gray-400'}`}>
        {userInitials(u)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{userName(u)}</p>
        <p className="text-[10px] text-gray-400 truncate">{u.email}</p>
      </div>
      {roleMap[u.id] && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${getRoleDef(roleMap[u.id]).badge}`}>
          {getRoleDef(roleMap[u.id]).label}
        </span>
      )}
    </label>
  );

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full text-sm border rounded-lg px-3 py-2 bg-white text-left flex items-center gap-2 min-h-[38px]">
        {selectedUsers.length === 0
          ? <span className="text-gray-400 flex-1">Unassigned</span>
          : <div className="flex items-center gap-1.5 flex-wrap flex-1">
              {selectedUsers.slice(0, 4).map(u => (
                <span key={u.id} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${getRoleDef(roleMap[u.id])?.badge || 'bg-gray-100 text-gray-600'}`}>
                  {userName(u)}
                </span>
              ))}
              {selectedUsers.length > 4 && <span className="text-xs text-gray-400">+{selectedUsers.length - 4}</span>}
            </div>
        }
        <Users className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-auto" />
      </button>

      {open && (
        <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-white border rounded-xl shadow-xl flex flex-col max-h-64 overflow-hidden">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search users…" className="w-full text-sm pl-8 pr-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-indigo-300 outline-none" />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            <button type="button" onClick={() => onChange([])}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-50 rounded-lg">Unassigned (clear all)</button>
            {grouped.map(cat => (
              <div key={cat.label} className="mt-1">
                <div className="flex items-center justify-between px-3 py-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{cat.label}</span>
                  <button type="button" onClick={() => toggleGroup(cat.users.map(u => u.id))}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium">
                    {cat.users.every(u => value.includes(u.id)) ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
                {cat.users.map(u => <Row key={u.id} u={u} />)}
              </div>
            ))}
            {ungrouped.length > 0 && (
              <div className="mt-1">
                <div className="px-3 py-1"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Other Users</span></div>
                {ungrouped.map(u => <Row key={u.id} u={u} />)}
              </div>
            )}
            {filtered.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No users found</p>}
          </div>
          <div className="border-t px-3 py-2 flex items-center justify-between bg-gray-50">
            <span className="text-xs text-gray-500">{value.length} selected</span>
            <button type="button" onClick={() => setOpen(false)}
              className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Subtask Checklist ─────────────────────────────────────────────────────────
function SubtaskList({ task, onCountChange, canTick = true, canEdit = true }: {
  task: Task;
  onCountChange: (total: number, done: number) => void;
  canTick?: boolean;
  canEdit?: boolean;
}) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading]   = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding]     = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [editVal, setEditVal]   = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getSubtasks(task.id).then(s => {
      setSubtasks(s);
      onCountChange(s.length, s.filter(x => x.completed).length);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [task.id]);

  const sync = (list: Subtask[]) => {
    setSubtasks(list);
    onCountChange(list.length, list.filter(x => x.completed).length);
  };

  const add = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setAdding(true);
    try {
      const s = await api.createSubtask(task.id, title);
      sync([...subtasks, s]);
      setNewTitle('');
      inputRef.current?.focus();
    } catch { toast.error('Failed to add subtask'); }
    finally { setAdding(false); }
  };

  const toggle = async (s: Subtask) => {
    const updated = await api.updateSubtask(task.id, s.id, { completed: !s.completed }).catch(() => null);
    if (updated) sync(subtasks.map(x => x.id === s.id ? updated : x));
  };

  const remove = async (s: Subtask) => {
    await api.deleteSubtask(task.id, s.id).catch(() => null);
    sync(subtasks.filter(x => x.id !== s.id));
  };

  const saveEdit = async (s: Subtask) => {
    const title = editVal.trim();
    if (!title || title === s.title) { setEditId(null); return; }
    const updated = await api.updateSubtask(task.id, s.id, { title }).catch(() => null);
    if (updated) sync(subtasks.map(x => x.id === s.id ? updated : x));
    setEditId(null);
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const reordered = Array.from(subtasks);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    const withOrder = reordered.map((s, i) => ({ ...s, sort_order: i }));
    sync(withOrder);
    await api.reorderSubtasks(task.id, withOrder.map((s, i) => ({ id: s.id, sort_order: i }))).catch(() => {});
  };

  const done  = subtasks.filter(s => s.completed).length;
  const total = subtasks.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  if (loading) return <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>;

  return (
    <div>
      {/* Progress header */}
      {total > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">{done} / {total} completed</span>
            <span className="text-xs font-semibold text-indigo-600">{pct}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${pct === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Draggable subtask list */}
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="subtasks">
          {provided => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1 mb-2">
              {subtasks.map((s, i) => (
                <Draggable key={s.id} draggableId={s.id} index={i}>
                  {(dp, snap) => (
                    <div ref={dp.innerRef} {...dp.draggableProps}
                      className={`flex items-center gap-2 group rounded-lg px-1 py-1 ${snap.isDragging ? 'bg-indigo-50 shadow-md' : 'hover:bg-gray-50'}`}>
                      {/* Drag handle — only editors can reorder */}
                      {canEdit
                        ? <div {...dp.dragHandleProps} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0"><GripVertical className="w-3.5 h-3.5" /></div>
                        : <div className="w-3.5 shrink-0" />
                      }
                      {/* Checkbox */}
                      <button type="button" onClick={() => canTick && toggle(s)} disabled={!canTick} className="shrink-0">
                        {s.completed
                          ? <CheckSquare className={`w-4 h-4 ${canTick ? 'text-indigo-500' : 'text-indigo-300'}`} />
                          : <Square className={`w-4 h-4 ${canTick ? 'text-gray-300 hover:text-indigo-400' : 'text-gray-200'}`} />}
                      </button>
                      {/* Title — click to edit (editors only) */}
                      {editId === s.id ? (
                        <input
                          autoFocus
                          value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onBlur={() => saveEdit(s)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(s); if (e.key === 'Escape') setEditId(null); }}
                          className="flex-1 text-sm border rounded px-2 py-0.5 focus:ring-2 focus:ring-indigo-300 outline-none"
                        />
                      ) : (
                        <span
                          onClick={() => canEdit && (setEditId(s.id), setEditVal(s.title))}
                          className={`flex-1 text-sm select-text ${canEdit ? 'cursor-text' : 'cursor-default'} ${s.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}
                        >
                          {s.title}
                        </span>
                      )}
                      {/* Delete — editors only */}
                      {canEdit && (
                        <button type="button" onClick={() => remove(s)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-red-500 transition-opacity shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add subtask — editors only */}
      {canEdit && (
        <div className="flex gap-1.5 mt-2">
          <input
            ref={inputRef}
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Add a subtask…"
            className="flex-1 text-sm border rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none"
          />
          <button type="button" onClick={add} disabled={adding || !newTitle.trim()}
            className="p-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-40">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
}

// ── TaskDetailModal ───────────────────────────────────────────────────────────
export function TaskDetailModal({ task, onClose, onUpdate, onDelete, permissions = FULL_PERMS }: Props) {
  const [title, setTitle]             = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus]           = useState(task.status);
  const [priority, setPriority]       = useState(task.priority);
  const [phase, setPhase]             = useState(task.phase || '');
  const [dueDate, setDueDate]         = useState(task.due_date || '');
  const [module, setModule]           = useState(task.module || '');
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    task.assignee_ids?.length ? task.assignee_ids : (task.assignee_id ? [task.assignee_id] : []),
  );
  const [subtaskCount, setSubtaskCount] = useState(task.subtask_count || 0);
  const [subtasksDone, setSubtasksDone] = useState(task.subtasks_done || 0);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dirty, setDirty]     = useState(false);
  const [showMeta, setShowMeta] = useState(true);

  const [users, setUsers]     = useState<User[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const initialIds = task.assignee_ids?.length ? task.assignee_ids : (task.assignee_id ? [task.assignee_id] : []);

  useEffect(() => {
    titleRef.current?.focus();
    Promise.all([api.getUsers(), api.getMembers(task.project_id), api.getComments(task.id)])
      .then(([u, m, c]) => { setUsers(u); setMembers(m); setComments(c); })
      .catch(() => {})
      .finally(() => setLoadingComments(false));
  }, [task.id, task.project_id]);

  useEffect(() => {
    setDirty(
      title !== task.title ||
      description !== (task.description || '') ||
      status !== task.status ||
      priority !== task.priority ||
      phase !== (task.phase || '') ||
      dueDate !== (task.due_date || '') ||
      module !== (task.module || '') ||
      JSON.stringify([...assigneeIds].sort()) !== JSON.stringify([...initialIds].sort()),
    );
  }, [title, description, status, priority, phase, dueDate, module, assigneeIds]);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const updated = await api.updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        status: status as Task['status'],
        priority,
        phase: phase || undefined,
        due_date: dueDate || undefined,
        module: module.trim() || undefined,
        assignee_ids: assigneeIds.length ? assigneeIds : undefined,
        assignee_id: assigneeIds[0] || undefined,
      });
      onUpdate({ ...updated, subtask_count: subtaskCount, subtasks_done: subtasksDone });
      setDirty(false);
      toast.success('Task updated');
    } catch { toast.error('Failed to save task'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task and all its subtasks?')) return;
    setDeleting(true);
    try {
      await api.deleteTask(task.id);
      onDelete(task.id);
      onClose();
    } catch { toast.error('Failed to delete task'); setDeleting(false); }
  };

  const postComment = async () => {
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      const c = await api.createComment(task.id, newComment.trim());
      setComments(prev => [...prev, c]);
      setNewComment('');
    } catch { toast.error('Failed to post comment'); }
    finally { setPostingComment(false); }
  };

  const deleteComment = async (id: string) => {
    try { await api.deleteComment(id); setComments(prev => prev.filter(c => c.id !== id)); }
    catch { toast.error('Failed to delete comment'); }
  };

  const userMap  = Object.fromEntries(users.map(u => [u.id, u]));
  const roleMap  = Object.fromEntries(members.map(m => [m.user_id, m.role]));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b gap-3">
          <div className="flex-1 min-w-0">
            {/* Module breadcrumb */}
            {(module || task.module) && (
              <div className="flex items-center gap-1 mb-1">
                <FolderOpen className="w-3 h-3 text-indigo-400" />
                <span className="text-xs text-indigo-500 font-medium">{module || task.module}</span>
              </div>
            )}
            <input
              ref={titleRef}
              value={title}
              onChange={e => permissions.canEditTask && setTitle(e.target.value)}
              readOnly={!permissions.canEditTask}
              className={`w-full text-lg font-semibold bg-transparent border-0 outline-none rounded-lg px-2 py-1 -ml-2 ${permissions.canEditTask ? 'focus:ring-2 focus:ring-indigo-300' : 'text-gray-700 cursor-default select-text'}`}
              placeholder="Task title"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {dirty && permissions.canEditTask && (
              <button onClick={save} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 disabled:opacity-50">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save
              </button>
            )}
            {!permissions.canEditTask && (
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">View only</span>
            )}
            {permissions.canDeleteTask && (
              <button onClick={handleDelete} disabled={deleting}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── Meta fields (collapsible) ─────────────────────────────────── */}
          <div className="border-b">
            <button type="button" onClick={() => setShowMeta(m => !m)}
              className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:bg-gray-50">
              <span>Details</span>
              {showMeta ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showMeta && (
              <div className="px-5 pb-5 grid grid-cols-2 gap-4">
                {/* Status */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                    <Layers className="w-3 h-3" />Status
                  </label>
                  <select value={status} onChange={e => permissions.canEditTask && setStatus(e.target.value as any)}
                    disabled={!permissions.canEditTask}
                    className="w-full text-sm border rounded-lg px-3 py-2 bg-white disabled:bg-gray-50 disabled:text-gray-500">
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                    <Flag className="w-3 h-3" />Priority
                  </label>
                  <div className="flex gap-1 flex-wrap">
                    {PRIORITIES.map(p => (
                      <button key={p} type="button" onClick={() => permissions.canEditTask && setPriority(p)}
                        disabled={!permissions.canEditTask}
                        className={`text-xs px-2 py-1 rounded border font-medium capitalize disabled:cursor-default ${priority === p ? PRIORITY_COLORS[p] : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Module */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                    <FolderOpen className="w-3 h-3" />Module (optional)
                  </label>
                  <input value={module} onChange={e => setModule(e.target.value)}
                    readOnly={!permissions.canEditTask}
                    placeholder="e.g. Course Management"
                    className={`w-full text-sm border rounded-lg px-3 py-2 outline-none ${permissions.canEditTask ? 'focus:ring-2 focus:ring-indigo-300' : 'bg-gray-50 text-gray-500'}`} />
                </div>

                {/* Due Date */}
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                    <Calendar className="w-3 h-3" />Due Date
                  </label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                    disabled={!permissions.canEditTask}
                    className="w-full text-sm border rounded-lg px-3 py-2 bg-white disabled:bg-gray-50 disabled:text-gray-500" />
                </div>

                {/* Phase */}
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                    <Layers className="w-3 h-3" />Phase / Role Group
                  </label>
                  <select value={phase} onChange={e => setPhase(e.target.value)}
                    disabled={!permissions.canEditTask}
                    className="w-full text-sm border rounded-lg px-3 py-2 bg-white disabled:bg-gray-50 disabled:text-gray-500">
                    <option value="">None</option>
                    {PHASES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  {phase && (
                    <p className="text-[10px] text-indigo-500 mt-1">
                      Notifies: {PHASES.find(p => p.value === phase)?.roles.map(r => getRoleDef(r).label).join(', ')}
                    </p>
                  )}
                </div>

                {/* Assignees — only managers can change who a task is assigned to */}
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                    <Users className="w-3 h-3" />Assignees
                    {!permissions.canAssignTask && (
                      <span className="ml-auto text-[10px] text-gray-400 font-normal normal-case">Only project managers can change assignees</span>
                    )}
                  </label>
                  {permissions.canAssignTask
                    ? <AssigneePicker users={users} members={members} value={assigneeIds} onChange={setAssigneeIds} />
                    : <div className="flex flex-wrap gap-1.5">{assigneeIds.map(id => { const u = userMap[id]; if (!u) return null; const role = roleMap[id]; return (<span key={id} className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${role ? getRoleDef(role).badge : 'bg-gray-100 text-gray-600'}`}>{userName(u)}</span>); })}{assigneeIds.length === 0 && <span className="text-sm text-gray-400">Unassigned</span>}</div>
                  }
                  {permissions.canAssignTask && assigneeIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {assigneeIds.map(id => {
                        const u = userMap[id];
                        if (!u) return null;
                        const role = roleMap[id];
                        return (
                          <span key={id} className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium ${role ? getRoleDef(role).badge : 'bg-gray-100 text-gray-600'}`}>
                            {userName(u)}
                            <button type="button" onClick={() => setAssigneeIds(prev => prev.filter(x => x !== id))}>
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Subtasks ──────────────────────────────────────────────────────── */}
          <div className="p-5 border-b">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-3">
              <CheckSquare className="w-3 h-3" />Subtasks
              {subtaskCount > 0 && (
                <span className="ml-auto text-xs font-semibold text-indigo-600">{subtasksDone}/{subtaskCount}</span>
              )}
            </h3>
            <SubtaskList
              task={task}
              onCountChange={(total, done) => { setSubtaskCount(total); setSubtasksDone(done); }}
              canTick={permissions.canTickSubtask}
              canEdit={permissions.canEditTask}
            />
          </div>

          {/* ── Description ───────────────────────────────────────────────────── */}
          <div className="p-5 border-b">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              readOnly={!permissions.canEditTask}
              placeholder={permissions.canEditTask ? 'Add a description…' : 'No description'}
              className={`w-full text-sm border rounded-lg px-3 py-2 resize-none min-h-[70px] focus:outline-none ${permissions.canEditTask ? 'focus:ring-2 focus:ring-indigo-300' : 'bg-gray-50 text-gray-500 cursor-default'}`}
              rows={3} />
          </div>

          {/* ── Comments ──────────────────────────────────────────────────────── */}
          <div className="p-5">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-3">
              <MessageSquare className="w-3 h-3" />Comments ({comments.length})
            </h3>
            {loadingComments
              ? <div className="flex justify-center py-3"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
              : (
                <div className="space-y-3 mb-4">
                  {comments.length === 0 && <p className="text-sm text-gray-400 text-center py-2">No comments yet.</p>}
                  {comments.map(c => {
                    const author = userMap[c.user_id];
                    return (
                      <div key={c.id} className="flex gap-2 group">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5 ${getRoleDef(roleMap[c.user_id] || '')?.dot || 'bg-indigo-400'}`}>
                          {author ? userInitials(author) : c.user_id.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                          {author && <p className="text-[10px] font-semibold text-gray-600 mb-0.5">{userName(author)}</p>}
                          <p className="text-sm text-gray-800">{c.content}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{new Date(c.created_at).toLocaleString()}</p>
                        </div>
                        <button onClick={() => deleteComment(c.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-opacity">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            }
            {permissions.canComment ? (
              <div className="flex gap-2">
                <input value={newComment} onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && postComment()}
                  placeholder="Write a comment…"
                  className="flex-1 text-sm border rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-300 focus:outline-none" />
                <button onClick={postComment} disabled={postingComment || !newComment.trim()}
                  className="px-3 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50">
                  {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-2 bg-gray-50 rounded-xl">
                You have view-only access and cannot comment on this task.
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
