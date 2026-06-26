import { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  Plus, FolderKanban, MessageSquare, Bug, Lightbulb, Sparkles, X, Send, ImagePlus,
  Loader2, Trash2, Calendar, LayoutDashboard, MessageCircle, ChevronDown,
  Flag, Layers,
} from 'lucide-react';
import { api, isAuthenticated, type Project, type Task, type UserProfile } from './services/api';
import { TaskDetailModal } from './components/TaskDetailModal';
import { LandingPage } from './components/LandingPage';

const COLUMNS: { id: Task['status']; label: string; color: string; headerColor: string }[] = [
  { id: 'todo', label: 'To Do', color: 'bg-gray-50', headerColor: 'bg-gray-200 text-gray-700' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-50', headerColor: 'bg-blue-200 text-blue-700' },
  { id: 'review', label: 'Review', color: 'bg-amber-50', headerColor: 'bg-amber-200 text-amber-700' },
  { id: 'done', label: 'Done', color: 'bg-green-50', headerColor: 'bg-green-200 text-green-700' },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

const PHASE_LABELS: Record<string, string> = {
  backend: 'BE', frontend: 'FE', documentation: 'Doc', qa_testing: 'QA', data_analyst: 'Data',
};


function FeedbackPanel({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('improvement');
  const [screenshot, setScreenshot] = useState('');
  const [sending, setSending] = useState(false);

  const handlePaste = (e: React.ClipboardEvent) => {
    for (let i = 0; i < e.clipboardData.items.length; i++) {
      if (e.clipboardData.items[i].type.startsWith('image/')) {
        const blob = e.clipboardData.items[i].getAsFile();
        if (blob) { const r = new FileReader(); r.onload = () => setScreenshot(r.result as string); r.readAsDataURL(blob); }
      }
    }
  };

  const send = async () => {
    if (!title.trim()) return;
    setSending(true);
    try {
      await api.createFeedback({ title, description: desc, category, page_url: window.location.href, screenshot });
      toast.success('Feedback sent!');
      setTitle(''); setDesc(''); setScreenshot('');
    } catch { toast.error('Failed to send feedback'); }
    finally { setSending(false); }
  };

  const cats = [
    { value: 'bug', icon: Bug, label: 'Bug' },
    { value: 'feature', icon: Sparkles, label: 'Feature' },
    { value: 'improvement', icon: Lightbulb, label: 'Improve' },
    { value: 'other', icon: MessageCircle, label: 'Other' },
  ];

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l z-50 flex flex-col" onPaste={handlePaste}>
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <h2 className="font-semibold flex items-center gap-2 text-gray-800">
          <MessageSquare className="w-4 h-4 text-indigo-500" />Send Feedback
        </h2>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-200 text-gray-500"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <div className="grid grid-cols-4 gap-1">
          {cats.map(c => (
            <button key={c.value} onClick={() => setCategory(c.value)}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl text-xs font-medium transition-colors ${category === c.value ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
              <c.icon className="w-4 h-4" />{c.label}
            </button>
          ))}
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title..." className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none" />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe your feedback..." className="w-full p-2.5 border rounded-xl text-sm h-24 resize-none focus:ring-2 focus:ring-indigo-300 outline-none" rows={4} />
        {screenshot ? (
          <div className="relative rounded-xl overflow-hidden border">
            <img src={screenshot} alt="Screenshot" className="w-full" />
            <button onClick={() => setScreenshot('')} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-xl p-5 text-center text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-400 transition-colors cursor-pointer">
            <ImagePlus className="w-5 h-5 mx-auto mb-1" />Paste a screenshot (Ctrl+V)
          </div>
        )}
      </div>
      <div className="p-4 border-t">
        <button onClick={send} disabled={sending || !title.trim()} className="w-full py-2.5 bg-indigo-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-indigo-600">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Send Feedback
        </button>
      </div>
    </div>
  );
}

function assigneeInitials(id: string) { return id.slice(0, 2).toUpperCase(); }

function TaskCard({
  task, index, onOpen,
}: { task: Task; index: number; onOpen: (task: Task) => void }) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  return (
    <Draggable key={task.id} draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onOpen(task)}
          className={`bg-white rounded-xl border p-3 shadow-sm hover:shadow-md transition-all cursor-pointer select-none ${snapshot.isDragging ? 'shadow-lg rotate-1 ring-2 ring-indigo-300' : ''}`}
        >
          <p className="text-sm font-medium text-gray-800 leading-snug">{task.title}</p>
          {task.description && (
            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{task.description}</p>
          )}
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold capitalize ${PRIORITY_COLORS[task.priority] || 'bg-gray-100 text-gray-600'}`}>
              {task.priority}
            </span>
            {task.phase && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 font-semibold">
                {PHASE_LABELS[task.phase] || task.phase}
              </span>
            )}
            {task.due_date && (
              <span className={`text-[10px] flex items-center gap-0.5 font-medium ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                <Calendar className="w-3 h-3" />
                {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {task.assignee_id && (
              <span className="ml-auto w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                {assigneeInitials(task.assignee_id)}
              </span>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}

interface NewTaskForm {
  status: Task['status'];
  title: string;
  priority: string;
  phase: string;
  dueDate: string;
  description: string;
}

function NewTaskModal({
  defaultStatus,
  projectId,
  onCreated,
  onClose,
}: {
  defaultStatus: Task['status'];
  projectId: string;
  onCreated: (task: Task) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<NewTaskForm>({
    status: defaultStatus, title: '', priority: 'medium', phase: '', dueDate: '', description: '',
  });
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const task = await api.createTask({
        project_id: projectId,
        title: form.title.trim(),
        status: form.status,
        priority: form.priority,
        phase: form.phase || undefined,
        due_date: form.dueDate || undefined,
        description: form.description.trim() || undefined,
      });
      onCreated(task);
      onClose();
      toast.success('Task added');
    } catch { toast.error('Failed to create task'); }
    finally { setSaving(false); }
  };

  const COLS = COLUMNS.map(c => ({ value: c.id, label: c.label }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">New Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <input
            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Task title" className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
            autoFocus onKeyDown={e => e.key === 'Enter' && create()}
          />
          <textarea
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)" className="w-full p-2.5 border rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-300 outline-none"
            rows={2}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><Layers className="w-3 h-3" />Column</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Task['status'] }))} className="w-full text-sm border rounded-xl px-3 py-2 bg-white">
                {COLS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><Flag className="w-3 h-3" />Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="w-full text-sm border rounded-xl px-3 py-2 bg-white">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Phase</label>
              <select value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value }))} className="w-full text-sm border rounded-xl px-3 py-2 bg-white">
                <option value="">None</option>
                <option value="backend">Backend</option>
                <option value="frontend">Frontend</option>
                <option value="documentation">Documentation</option>
                <option value="qa_testing">QA Testing</option>
                <option value="data_analyst">Data Analyst</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><Calendar className="w-3 h-3" />Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="w-full text-sm border rounded-xl px-3 py-2 bg-white" />
            </div>
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

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

  const [newTaskForCol, setNewTaskForCol] = useState<Task['status'] | null>(null);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  useEffect(() => {
    // Capture token passed back from Bwenge Learners via ?token=xxx
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem('accessToken', urlToken);
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (!isAuthenticated()) { setLoading(false); return; }

    api.getMe()
      .then(async u => {
        setUser(u);
        setAuthed(true);
        // Auto-sync profile into our UserCache if not yet cached
        if (!u.cached_profile && u.email) {
          try { await api.syncProfile({ email: u.email }); } catch { /* ignore */ }
        }
      })
      .catch(() => setAuthed(false))
      .finally(() => setLoading(false));
  }, []);

  const loadProjects = useCallback(async () => {
    try { setProjects(await api.getProjects()); } catch { /* */ }
  }, []);

  const loadTasks = useCallback(async (pid: string) => {
    try { setTasks(await api.getTasks(pid)); } catch { setTasks([]); }
  }, []);

  useEffect(() => { if (authed) loadProjects(); }, [authed, loadProjects]);

  const selectProject = (p: Project) => { setActiveProject(p); loadTasks(p.id); };

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    setCreatingProject(true);
    try {
      const p = await api.createProject({ name: newProjectName.trim(), description: newProjectDesc.trim() || undefined });
      setNewProjectName(''); setNewProjectDesc(''); setShowNewProject(false);
      await loadProjects();
      selectProject(p);
      toast.success('Project created');
    } catch { toast.error('Failed to create project'); }
    finally { setCreatingProject(false); }
  };

  const deleteProject = async () => {
    if (!activeProject) return;
    if (!confirm(`Delete project "${activeProject.name}" and all its tasks?`)) return;
    setDeletingProject(true);
    try {
      await api.deleteProject(activeProject.id);
      setActiveProject(null);
      setTasks([]);
      await loadProjects();
      toast.success('Project deleted');
    } catch { toast.error('Failed to delete project'); }
    finally { setDeletingProject(false); }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination || !activeProject) return;
    const { draggableId: taskId, source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newStatus = destination.droppableId as Task['status'];

    // Optimistically reorder tasks in state
    setTasks(prev => {
      const task = prev.find(t => t.id === taskId)!;
      const others = prev.filter(t => t.id !== taskId);
      const movedTask = { ...task, status: newStatus };

      // Rebuild each column's order
      const result: Task[] = [];
      COLUMNS.forEach(col => {
        const colTasks = others.filter(t => t.status === col.id);
        if (col.id === newStatus) colTasks.splice(destination.index, 0, movedTask);
        colTasks.forEach((t, i) => result.push({ ...t, sort_order: i }));
      });
      return result;
    });

    // Persist to backend
    try {
      const updated = tasks
        .filter(t => t.status === newStatus || t.status === source.droppableId || t.id === taskId)
        .map(t => {
          if (t.id === taskId) return { id: t.id, sort_order: destination.index, status: newStatus };
          return { id: t.id, sort_order: t.sort_order, status: t.status };
        });
      await api.reorderTasks(updated);
    } catch { toast.error('Failed to save order'); loadTasks(activeProject.id); }
  };

  const handleTaskCreated = (task: Task) => {
    setTasks(prev => [...prev, task]);
  };

  const handleTaskUpdated = (updated: Task) => {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelectedTask(updated);
  };

  const handleTaskDeleted = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setSelectedTask(null);
  };

  const userName = user?.cached_profile
    ? `${user.cached_profile.first_name} ${user.cached_profile.last_name}`.trim()
    : user?.email?.split('@')[0] || 'User';

  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  );
  if (!authed) return <LandingPage />;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Toaster position="top-right" richColors />

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdated}
          onDelete={handleTaskDeleted}
        />
      )}

      {/* Feedback Side Panel */}
      {showFeedback && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowFeedback(false)} />
          <FeedbackPanel onClose={() => setShowFeedback(false)} />
        </>
      )}

      {/* New Task Modal */}
      {newTaskForCol && activeProject && (
        <NewTaskModal
          defaultStatus={newTaskForCol}
          projectId={activeProject.id}
          onCreated={handleTaskCreated}
          onClose={() => setNewTaskForCol(null)}
        />
      )}

      {/* Header */}
      <header className="bg-white border-b shadow-sm px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm hidden sm:block">Project Manager</span>

          <div className="h-5 border-l border-gray-200 mx-1" />

          {/* Project selector */}
          <div className="relative flex items-center gap-1">
            <select
              className="text-sm border rounded-lg px-3 py-1.5 bg-white min-w-[180px] pr-7 appearance-none cursor-pointer"
              value={activeProject?.id || ''}
              onChange={e => { const p = projects.find(pp => pp.id === e.target.value); if (p) selectProject(p); }}
            >
              <option value="">Select a project...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 pointer-events-none" />
          </div>

          <button
            onClick={() => setShowNewProject(true)}
            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1.5 rounded-lg"
          >
            <Plus className="w-4 h-4" /><span className="hidden sm:block">New Project</span>
          </button>

          {activeProject && (
            <button
              onClick={deleteProject}
              disabled={deletingProject}
              title="Delete project"
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
            >
              {deletingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFeedback(!showFeedback)}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-gray-100"
          >
            <MessageSquare className="w-4 h-4" /><span className="hidden sm:block">Feedback</span>
          </button>

          {/* User avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
            {user?.cached_profile?.avatar_url ? (
              <img src={user.cached_profile.avatar_url} alt={userName} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                {userInitials}
              </div>
            )}
            <span className="text-sm text-gray-700 font-medium hidden sm:block max-w-[120px] truncate">{userName}</span>
          </div>
        </div>
      </header>

      {/* Board area */}
      <div className="flex-1 overflow-auto">
        {activeProject ? (
          <div className="p-4 md:p-6">
            {/* Board title */}
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">{activeProject.name}</h2>
              <span className="text-sm text-gray-400">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {COLUMNS.map(col => {
                  const colTasks = tasks.filter(t => t.status === col.id).sort((a, b) => a.sort_order - b.sort_order);
                  return (
                    <div key={col.id} className={`${col.color} rounded-2xl flex flex-col overflow-hidden`}>
                      {/* Column header */}
                      <div className="px-3 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.headerColor}`}>
                            {col.label}
                          </span>
                          <span className="text-xs text-gray-400 font-medium">{colTasks.length}</span>
                        </div>
                        <button
                          onClick={() => setNewTaskForCol(col.id)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-white/70 transition-colors"
                          title={`Add task to ${col.label}`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Cards */}
                      <Droppable droppableId={col.id}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`flex-1 px-3 pb-3 space-y-2 min-h-[120px] transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50/60' : ''}`}
                          >
                            {colTasks.map((task, i) => (
                              <TaskCard key={task.id} task={task} index={i} onOpen={setSelectedTask} />
                            ))}
                            {provided.placeholder}

                            {colTasks.length === 0 && !snapshot.isDraggingOver && (
                              <div className="text-center py-6 text-xs text-gray-300">
                                <FolderKanban className="w-6 h-6 mx-auto mb-1 opacity-50" />
                                Drop tasks here
                              </div>
                            )}
                          </div>
                        )}
                      </Droppable>

                      {/* Add task shortcut */}
                      <button
                        onClick={() => setNewTaskForCol(col.id)}
                        className="mx-3 mb-3 py-1.5 text-xs text-gray-400 hover:text-indigo-600 hover:bg-white/70 rounded-xl flex items-center justify-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />Add task
                      </button>
                    </div>
                  );
                })}
              </div>
            </DragDropContext>
          </div>
        ) : (
          <div className="flex items-center justify-center py-32 text-gray-400">
            <div className="text-center">
              <FolderKanban className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium text-gray-500">Select or create a project to get started</p>
              <button
                onClick={() => setShowNewProject(true)}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600"
              >
                <Plus className="w-4 h-4" />Create a project
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowNewProject(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900">New Project</h2>
              <button onClick={() => setShowNewProject(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <input
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                placeholder="Project name"
                className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && createProject()}
              />
              <textarea
                value={newProjectDesc}
                onChange={e => setNewProjectDesc(e.target.value)}
                placeholder="Description (optional)"
                className="w-full p-2.5 border rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-300 outline-none"
                rows={2}
              />
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setShowNewProject(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
              <button
                onClick={createProject}
                disabled={creatingProject || !newProjectName.trim()}
                className="px-4 py-2 text-sm bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2"
              >
                {creatingProject ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
