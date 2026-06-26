import { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  Plus, FolderKanban, MessageSquare, Bug, Lightbulb, Sparkles, X, Send, ImagePlus,
  Loader2, Trash2, ChevronDown, AlertTriangle, CheckCircle2, Clock, User, Calendar,
  LayoutDashboard, MessageCircle,
} from 'lucide-react';
import { api, isAuthenticated, type Project, type Task } from './services/api';

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'bg-gray-100' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-50' },
  { id: 'review', label: 'Review', color: 'bg-amber-50' },
  { id: 'done', label: 'Done', color: 'bg-green-50' },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700', high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700', low: 'bg-green-100 text-green-700',
};

const PHASE_LABELS: Record<string, string> = {
  backend: 'BE', frontend: 'FE', documentation: 'Doc', qa_testing: 'QA', data_analyst: 'Data',
};

function LoginScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center space-y-4 p-8 bg-white rounded-xl shadow-lg max-w-md">
        <LayoutDashboard className="w-16 h-16 text-indigo-500 mx-auto" />
        <h1 className="text-2xl font-bold">Project Manager</h1>
        <p className="text-gray-500">Task Management & Feedback System</p>
        <p className="text-sm text-gray-400">Please log in through Bwenge Learners first, then return here.</p>
        <a href="http://localhost:3000/login" className="inline-block px-6 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600">
          Go to Bwenge Login
        </a>
      </div>
    </div>
  );
}

function FeedbackPanel({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('improvement');
  const [screenshot, setScreenshot] = useState('');
  const [sending, setSending] = useState(false);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => setScreenshot(reader.result as string);
          reader.readAsDataURL(blob);
        }
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
    { value: 'improvement', icon: Lightbulb, label: 'Improvement' },
    { value: 'other', icon: MessageCircle, label: 'Other' },
  ];

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl border-l z-50 flex flex-col" onPaste={handlePaste}>
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-semibold flex items-center gap-2"><MessageSquare className="w-5 h-5 text-indigo-500" />Feedback</h2>
        <button onClick={onClose}><X className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        <div className="flex gap-1">
          {cats.map(c => (
            <button key={c.value} onClick={() => setCategory(c.value)}
              className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-colors ${category === c.value ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
              <c.icon className="w-4 h-4" />{c.label}
            </button>
          ))}
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title..." className="w-full p-2 border rounded-lg text-sm" />
        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe the issue or suggestion..." className="w-full p-2 border rounded-lg text-sm h-24 resize-none" rows={4} />
        {screenshot ? (
          <div className="relative"><img src={screenshot} alt="Screenshot" className="w-full rounded-lg border" />
            <button onClick={() => setScreenshot('')} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-lg p-6 text-center text-sm text-gray-400">
            <ImagePlus className="w-6 h-6 mx-auto mb-1" />Paste screenshot here (Ctrl+V)
          </div>
        )}
      </div>
      <div className="p-4 border-t">
        <button onClick={send} disabled={sending || !title.trim()} className="w-full py-2 bg-indigo-500 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Send Feedback
        </button>
      </div>
    </div>
  );
}

function TaskCard({ task, index }: { task: Task; index: number }) {
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => { setDeleting(true); try { await api.deleteTask(task.id); window.location.reload(); } catch { toast.error('Failed to delete'); } finally { setDeleting(false); } };

  return (
    <div className="task-card bg-white rounded-lg border p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium flex-1">{task.title}</p>
        <button onClick={handleDelete} className="text-gray-300 hover:text-red-500 shrink-0">{deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}</button>
      </div>
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${PRIORITY_COLORS[task.priority] || ''}`}>{task.priority}</span>
        {task.phase && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">{PHASE_LABELS[task.phase] || task.phase}</span>}
        {task.due_date && (
          <span className="text-[10px] flex items-center gap-1 text-gray-500">
            <Calendar className="w-3 h-3" />{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { setLoading(false); return; }
    api.getMe().then(() => setAuthed(true)).catch(() => setAuthed(false)).finally(() => setLoading(false));
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
    try { await api.createProject({ name: newProjectName }); setNewProjectName(''); setShowNewProject(false); loadProjects(); toast.success('Project created'); }
    catch { toast.error('Failed'); }
  };

  const createTask = async () => {
    if (!newTaskTitle.trim() || !activeProject) return;
    try { await api.createTask({ project_id: activeProject.id, title: newTaskTitle, priority: 'medium' }); setNewTaskTitle(''); setShowNewTask(false); loadTasks(activeProject.id); toast.success('Task added'); }
    catch { toast.error('Failed'); }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination || !activeProject) return;
    const taskId = result.draggableId;
    const newStatus = result.destination.droppableId;
    const colTasks = tasks.filter(t => t.status === newStatus);
    const destIndex = result.destination.index;
    try {
      await api.updateTask(taskId, { status: newStatus as Task['status'], sort_order: destIndex });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus as Task['status'], sort_order: destIndex } : t));
    } catch { toast.error('Failed to move task'); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  if (!authed) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      {showFeedback && <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowFeedback(false)} />}
      {showFeedback && <FeedbackPanel onClose={() => setShowFeedback(false)} />}

      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold flex items-center gap-2"><LayoutDashboard className="w-5 h-5 text-indigo-500" />Project Manager</h1>
          <select className="text-sm border rounded-lg px-3 py-1.5 bg-white min-w-[200px]"
            value={activeProject?.id || ''}
            onChange={e => { const p = projects.find(pp => pp.id === e.target.value); if (p) selectProject(p); }}>
            <option value="">Select a project...</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button onClick={() => setShowNewProject(true)} className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Plus className="w-4 h-4" />New</button>
        </div>
        <button onClick={() => setShowFeedback(!showFeedback)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-gray-100">
          <MessageSquare className="w-4 h-4" />Feedback
        </button>
      </header>

      {/* New Project Modal */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setShowNewProject(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold mb-4">New Project</h2>
            <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="Project name" className="w-full p-2 border rounded-lg mb-3" autoFocus onKeyDown={e => e.key === 'Enter' && createProject()} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNewProject(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={createProject} className="px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {activeProject && (
        <div className="p-4">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-4 gap-4">
              {COLUMNS.map(col => (
                <div key={col.id} className={`${col.color} rounded-xl p-3`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm">{col.label} <span className="text-gray-400 font-normal">({tasks.filter(t => t.status === col.id).length})</span></h3>
                    {col.id === 'todo' && (
                      <button onClick={() => setShowNewTask(true)} className="text-gray-400 hover:text-indigo-500"><Plus className="w-4 h-4" /></button>
                    )}
                  </div>
                  <Droppable droppableId={col.id}>
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="kanban-column space-y-2">
                        {tasks.filter(t => t.status === col.id).sort((a, b) => a.sort_order - b.sort_order).map((task, i) => (
                          <Draggable key={task.id} draggableId={task.id} index={i}>
                            {(provided) => <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}><TaskCard task={task} index={i} /></div>}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        </div>
      )}

      {/* New Task Modal */}
      {showNewTask && activeProject && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setShowNewTask(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="font-semibold mb-4">New Task</h2>
            <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Task title" className="w-full p-2 border rounded-lg mb-3" autoFocus onKeyDown={e => e.key === 'Enter' && createTask()} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNewTask(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={createTask} className="px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg">Add Task</button>
            </div>
          </div>
        </div>
      )}

      {!activeProject && (
        <div className="flex items-center justify-center py-32 text-gray-400">
          <div className="text-center">
            <FolderKanban className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Select or create a project to get started</p>
          </div>
        </div>
      )}
    </div>
  );
}
