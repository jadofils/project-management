import { useState, useEffect, useRef } from 'react';
import { X, Trash2, Send, Loader2, Calendar, Flag, Layers, MessageSquare, Check, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { api, type Task, type Comment, type User, userName } from '../services/api';

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const PHASES = ['backend', 'frontend', 'documentation', 'qa_testing', 'data_analyst'] as const;
const STATUSES = ['todo', 'in_progress', 'review', 'done'] as const;

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done',
};

const PHASE_LABELS: Record<string, string> = {
  backend: 'Backend', frontend: 'Frontend', documentation: 'Documentation',
  qa_testing: 'QA Testing', data_analyst: 'Data Analyst',
};

interface Props {
  task: Task;
  onClose: () => void;
  onUpdate: (updated: Task) => void;
  onDelete: (id: string) => void;
}

export function TaskDetailModal({ task, onClose, onUpdate, onDelete }: Props) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [phase, setPhase] = useState(task.phase || '');
  const [dueDate, setDueDate] = useState(task.due_date || '');
  const [assigneeId, setAssigneeId] = useState(task.assignee_id || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [users, setUsers] = useState<User[]>([]);

  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    api.getUsers().then(setUsers).catch(() => { /* ignore */ });
    api.getComments(task.id)
      .then(setComments)
      .catch(() => { /* ignore */ })
      .finally(() => setLoadingComments(false));
  }, [task.id]);

  useEffect(() => {
    const changed =
      title !== task.title ||
      description !== (task.description || '') ||
      status !== task.status ||
      priority !== task.priority ||
      phase !== (task.phase || '') ||
      dueDate !== (task.due_date || '') ||
      assigneeId !== (task.assignee_id || '');
    setDirty(changed);
  }, [title, description, status, priority, phase, dueDate, assigneeId, task]);

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
        assignee_id: assigneeId || undefined,
      });
      onUpdate(updated);
      setDirty(false);
      toast.success('Task updated');
    } catch { toast.error('Failed to save task'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
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
    try {
      await api.deleteComment(id);
      setComments(prev => prev.filter(c => c.id !== id));
    } catch { toast.error('Failed to delete comment'); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b gap-3">
          <input
            ref={titleRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="flex-1 text-lg font-semibold bg-transparent border-0 outline-none focus:ring-2 focus:ring-indigo-300 rounded-lg px-2 py-1 -ml-2"
            placeholder="Task title"
          />
          <div className="flex items-center gap-2 shrink-0">
            {dirty && (
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500 text-white text-sm rounded-lg hover:bg-indigo-600 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Meta fields */}
          <div className="p-5 grid grid-cols-2 gap-4 border-b">
            {/* Status */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                <Layers className="w-3 h-3" />Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2 bg-white"
              >
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
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`text-xs px-2 py-1 rounded border font-medium capitalize ${priority === p ? PRIORITY_COLORS[p] : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Phase */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                <Layers className="w-3 h-3" />Phase
              </label>
              <select
                value={phase}
                onChange={e => setPhase(e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2 bg-white"
              >
                <option value="">None</option>
                {PHASES.map(p => <option key={p} value={p}>{PHASE_LABELS[p]}</option>)}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                <Calendar className="w-3 h-3" />Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2 bg-white"
              />
            </div>

            {/* Assignee */}
            <div className="col-span-2">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                <UserIcon className="w-3 h-3" />Assignee
              </label>
              <select
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2 bg-white"
              >
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{userName(u)} ({u.email})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="p-5 border-b">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add a description..."
              className="w-full text-sm border rounded-lg px-3 py-2 resize-none min-h-[80px] focus:ring-2 focus:ring-indigo-300 focus:outline-none"
              rows={3}
            />
          </div>

          {/* Comments */}
          <div className="p-5">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1 mb-3">
              <MessageSquare className="w-3 h-3" />Comments ({comments.length})
            </h3>
            {loadingComments ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : (
              <div className="space-y-3 mb-4">
                {comments.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-2">No comments yet.</p>
                )}
                {comments.map(c => (
                  <div key={c.id} className="flex gap-2 group">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0 mt-0.5">
                      {c.user_id.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                      <p className="text-sm text-gray-800">{c.content}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {new Date(c.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteComment(c.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* New comment input */}
            <div className="flex gap-2">
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && postComment()}
                placeholder="Write a comment..."
                className="flex-1 text-sm border rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-300 focus:outline-none"
              />
              <button
                onClick={postComment}
                disabled={postingComment || !newComment.trim()}
                className="px-3 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50"
              >
                {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
