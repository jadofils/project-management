import { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import {
  Plus, FolderKanban, MessageSquare, Sparkles, X, Loader2, Trash2, Calendar, LayoutDashboard, MessageCircle, ChevronDown,
  Flag, Layers, Users, LogOut, UserCog, Mail, BarChart3,
} from 'lucide-react';
import { api, isAuthenticated, logout, wakeUpServer, userInitials, userName, type Project, type Task, type User, type Member } from './services/api';
import { getRoleDef } from './lib/roles';
import { COLUMNS } from './lib/constants';
import { computePermissions, taskPermissions, type ProjectPermissions } from './lib/permissions';
import { TaskDetailModal } from './components/TaskDetailModal';
import { AuthPage } from './components/AuthPage';
import { MembersPanel } from './components/MembersPanel';
import { ChatRoomsPage } from './components/ChatRoomsPage';
import { CommunicationsPanel } from './components/CommunicationsPanel';
import { UsersAdminPage } from './components/UsersAdminPage';
import { AdminDashboard } from './components/AdminDashboard';
import { StatsPanel } from './components/StatsPanel';
import { MailComposer } from './components/MailComposer';
import { FeedbackPage } from './components/FeedbackPage';
import { TaskCard } from './components/TaskCard';
import { NewTaskModal } from './components/NewTaskModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { Sidebar } from './components/Sidebar';
import { AttendancePanel } from './components/AttendancePanel';
import { OrgChartPanel } from './components/OrgChartPanel';
import { LeavePanel } from './components/LeavePanel';
import { ReportsPanel } from './components/ReportsPanel';
import { RecruitmentPanel } from './components/RecruitmentPanel';
import AcceptInvitePage from './components/AcceptInvitePage';

type BoardTab = 'board' | 'members' | 'chat' | 'stats' | 'feedback';
type TopNav  = 'projects' | 'users' | 'admin' | 'comms';

export default function App() {
  const [authed, setAuthed]         = useState(false);
  const [user, setUser]             = useState<User | null>(null);
  const [projects, setProjects]     = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [tasks, setTasks]           = useState<Task[]>([]);
  const [loading, setLoading]       = useState(true);

  const [allUsers, setAllUsers]         = useState<User[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [activeRole, setActiveRole]     = useState<string | null>(null);

  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectType, setNewProjectType] = useState<'individual' | 'company'>('individual');
  const [newProjectDivisionId, setNewProjectDivisionId] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectFilter, setProjectFilter] = useState<'all' | 'company' | 'individual'>('all');
  const [divisions, setDivisions] = useState<any[]>([]);

  const [newTaskForCol, setNewTaskForCol] = useState<string | null>(null);
  const [selectedTask, setSelectedTask]   = useState<Task | null>(null);
  const [deletingProject, setDeletingProject] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [helpTask, setHelpTask] = useState<{ taskId: string; taskTitle: string } | null>(null);

  const [boardTab, setBoardTab] = useState<BoardTab>('board');
  const [topNav,   setTopNav]   = useState<TopNav>('projects');
  const [showMailComposer, setShowMailComposer] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarSection, setSidebarSection] = useState('board');

  // ── Invitation token from URL ─────────────────────────────────────────────
  const [inviteToken, setInviteToken] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('invite');
  });

  // ── Bootstrap ────────────────────────────────────────────────────────────
  useEffect(() => {
    const stopPing = wakeUpServer();

    if (!isAuthenticated()) { setLoading(false); return stopPing; }
    api.getMe()
      .then(u => { setUser(u); setAuthed(true); })
      .catch(() => { logout(); setAuthed(false); })
      .finally(() => setLoading(false));

    return stopPing;
  }, []);

  const handleAuth = (u: User) => { setUser(u); setAuthed(true); };

  const handleInviteAccepted = async (projectId: string) => {
    // Strip the invite param from URL without reloading
    const url = new URL(window.location.href);
    url.searchParams.delete('invite');
    window.history.replaceState({}, '', url.toString());
    setInviteToken(null);

    // If not yet authed (new user flow), the registerAndAccept handler already saved the token
    // and set the user — force a reload of auth state
    if (!authed) {
      try {
        const u = await api.getMe();
        setUser(u); setAuthed(true);
      } catch { /* token already saved, just reload */ }
    }

    // Load projects and jump to the accepted project
    try {
      const projs = await api.getProjects();
      setProjects(projs);
      const p = projs.find(x => x.id === projectId);
      if (p) selectProject(p);
    } catch { /* */ }
    toast.success('You have joined the project!');
  };

  const handleLogout = () => { logout(); setUser(null); setAuthed(false); setProjects([]); setActiveProject(null); setTasks([]); };

  const handleSidebarNav = (section: string) => {
    setSidebarSection(section);
    // Map sidebar sections to topNav + boardTab
    if (section === 'admin' || section === 'users' || section === 'comms' || section === 'email-logs' || section === 'invitations') {
      setTopNav(section === 'email-logs' || section === 'invitations' ? 'comms' : section as TopNav);
    } else if (section === 'employees') {
      setTopNav('users');
    } else if (section === 'org-chart') {
      setTopNav('org-chart' as any);
    } else if (section === 'attendance' || section === 'today' || section === 'records' || section === 'report') {
      setTopNav('attendance' as any);
    } else if (section === 'requests' || section === 'balances' || section === 'calendar') {
      setTopNav('leave' as any);
    } else if (section === 'attendance-report' || section === 'leave-report' || section === 'headcount') {
      setTopNav('reports' as any);
    } else if (section === 'postings' || section === 'applications') {
      setTopNav('recruitment' as any);
    } else if (['board', 'stats', 'members', 'chat', 'feedback'].includes(section)) {
      setTopNav('projects');
      setBoardTab(section as BoardTab);
    }
  };

  // ── Projects ─────────────────────────────────────────────────────────────
  const loadProjects = useCallback(async () => {
    try { setProjects(await api.getProjects()); } catch { /* */ }
  }, []);

  const loadTasks = useCallback(async (pid: string) => {
    try { setTasks(await api.getTasks(pid)); } catch { setTasks([]); }
  }, []);

  useEffect(() => {
    if (authed) {
      loadProjects();
      api.getUsers().then(setAllUsers).catch(() => {});
      api.getDivisions().then(setDivisions).catch(() => {});
    }
  }, [authed, loadProjects]);

  const selectProject = (p: Project) => {
    setActiveProject(p);
    loadTasks(p.id);
    setBoardTab('board');
    setCurrentMember(null);
    setActiveRole(null);
    // Load membership to compute permissions
    api.getMembers(p.id)
      .then(members => {
        const me = members.find(m => m.user_id === user?.id) || null;
        setCurrentMember(me);
        const roles = me?.roles?.length ? me.roles : (me?.role ? [me.role] : []);
        setActiveRole(roles[0] || null);
      })
      .catch(() => {});
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    setCreatingProject(true);
    try {
      const p = await api.createProject({
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || undefined,
        type: newProjectType,
        division_id: newProjectType === 'company' ? newProjectDivisionId || undefined : undefined,
      });
      setNewProjectName(''); setNewProjectDesc(''); setNewProjectType('individual'); setNewProjectDivisionId(''); setShowNewProject(false);
      await loadProjects();
      selectProject(p);
      toast.success('Project created');
    } catch { toast.error('Failed to create project'); }
    finally { setCreatingProject(false); }
  };

  const deleteProject = async () => {
    if (!activeProject) return;
    setDeletingProject(true);
    try {
      await api.deleteProject(activeProject.id);
      setActiveProject(null); setTasks([]);
      await loadProjects();
      toast.success('Project deleted');
    } catch { toast.error('Failed to delete project'); }
    finally { setDeletingProject(false); setShowDeleteConfirm(false); }
  };

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  const onDragEnd = async (result: DropResult) => {
    if (!result.destination || !activeProject) return;
    const { draggableId: taskId, source, destination } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const newStatus = destination.droppableId;
    setTasks(prev => {
      const task = prev.find(t => t.id === taskId)!;
      const others = prev.filter(t => t.id !== taskId);
      const moved = { ...task, status: newStatus };
      const out: Task[] = [];
      COLUMNS.forEach(col => {
        const colTasks = others.filter(t => t.status === col.id);
        if (col.id === newStatus) colTasks.splice(destination.index, 0, moved);
        colTasks.forEach((t, i) => out.push({ ...t, sort_order: i }));
      });
      return out;
    });
    try {
      const orders = tasks.map(t => {
        if (t.id === taskId) return { id: t.id, sort_order: destination.index, status: newStatus };
        return { id: t.id, sort_order: t.sort_order, status: t.status };
      });
      await api.reorderTasks(orders);
    } catch { toast.error('Failed to save order'); loadTasks(activeProject.id); }
  };

  // ── Like toggle ───────────────────────────────────────────────────────────
  const handleLike = async (task: Task) => {
    if (!user) return;
    const prev = task.liked_by || [];
    const next = prev.includes(user.id) ? prev.filter(id => id !== user.id) : [...prev, user.id];
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, liked_by: next } : t));
    try {
      const updated = await api.toggleLike(task.id);
      setTasks(ts => ts.map(t => t.id === task.id ? updated : t));
    } catch {
      setTasks(ts => ts.map(t => t.id === task.id ? task : t));
      toast.error('Failed to update like');
    }
  };

  // ── Quick status change from card ─────────────────────────────────────────
  const handleQuickStatus = async (task: Task, newStatus: string) => {
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    try {
      const updated = await api.updateTask(task.id, { status: newStatus } as any);
      setTasks(ts => ts.map(t => t.id === task.id ? updated : t));
      const label = newStatus === 'in_progress' ? 'In Progress' : newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
      toast.success(`Moved to ${label}`);
    } catch (e: any) {
      setTasks(ts => ts.map(t => t.id === task.id ? task : t));
      toast.error(e.message || 'Failed to update task');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    </div>
  );

  // Invitation page — intercept before login if there's a token
  if (inviteToken) return (
    <>
      <Toaster position="top-right" richColors />
      <AcceptInvitePage
        token={inviteToken}
        currentUser={user}
        onAccepted={handleInviteAccepted}
        onLoginRedirect={() => {
          // Clear invite token from state so auth page shows, preserve token in URL
          setInviteToken(null);
        }}
      />
    </>
  );

  if (!authed) return (
    <>
      <Toaster position="top-right" richColors />
      <AuthPage onAuth={handleAuth} />
    </>
  );

  const initials  = user ? userInitials(user) : 'U';
  const name      = user ? userName(user) : 'User';
  const isAdmin   = user?.system_role === 'admin';
  const userMap   = Object.fromEntries(allUsers.map(u => [u.id, u]));

  const projectPerms: ProjectPermissions = user
    ? computePermissions(user, currentMember)
    : { canManageMembers: false, canCreateTask: false, canEditTask: false, canDeleteTask: false, canComment: false, canTickSubtask: false, canDrag: false, canManageProject: false, isManager: false };

  const currentMemberRoles = currentMember?.roles?.length
    ? currentMember.roles
    : (currentMember?.role ? [currentMember.role] : []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Toaster position="top-right" richColors />

      {selectedTask && user && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={t => { setTasks(prev => prev.map(x => x.id === t.id ? t : x)); setSelectedTask(t); }}
          onDelete={id => { setTasks(prev => prev.filter(t => t.id !== id)); setSelectedTask(null); }}
          permissions={taskPermissions(projectPerms, selectedTask, user.id)}
        />
      )}

      {showMailComposer && (
        <MailComposer
          onClose={() => setShowMailComposer(false)}
          projectId={activeProject?.id}
        />
      )}

      {newTaskForCol && activeProject && (
        <NewTaskModal
          defaultStatus={newTaskForCol} projectId={activeProject.id}
          onCreated={t => setTasks(prev => [...prev, t])}
          onClose={() => setNewTaskForCol(null)}
        />
      )}

      {showDeleteConfirm && activeProject && (
        <DeleteConfirmModal
          title={`Delete "${activeProject.name}"?`}
          message="This will permanently delete the project and all its tasks. This action cannot be undone."
          loading={deletingProject}
          onConfirm={deleteProject}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          activeSection={sidebarSection}
          onNavigate={handleSidebarNav}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="bg-white border-b shadow-sm px-4 py-2 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                <LayoutDashboard className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900 text-sm hidden sm:block">Project Manager</span>
              <div className="h-5 border-l border-gray-200 mx-1" />

              <nav className="flex items-center gap-1">
                <button onClick={() => setTopNav('projects')}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${topNav === 'projects' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                  <FolderKanban className="w-4 h-4" />Projects
                </button>
                {isAdmin && (
                  <>
                    <button onClick={() => setTopNav('admin')}
                      className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${topNav === 'admin' ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                      <Layers className="w-4 h-4" />Dashboard
                    </button>
                    <button onClick={() => setTopNav('users')}
                      className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${topNav === 'users' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                      <UserCog className="w-4 h-4" />Users
                    </button>
                    <button onClick={() => setTopNav('comms')}
                      className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${topNav === 'comms' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>
                      <Mail className="w-4 h-4" />Comms
                    </button>
                  </>
                )}
              </nav>

                  {topNav === 'projects' && (
                <>
                  <div className="h-5 border-l border-gray-200 mx-1" />
                  <div className="relative flex items-center gap-1">
                    <select
                      className="text-sm border rounded-lg px-3 py-1.5 bg-white min-w-[180px] pr-7 appearance-none cursor-pointer"
                      value={activeProject?.id || ''}
                      onChange={e => { const p = projects.find(pp => pp.id === e.target.value); if (p) selectProject(p); }}
                    >
                      <option value="">Select a project…</option>
                      {projects
                        .filter(p => projectFilter === 'all' || (projectFilter === 'company' ? p.type === 'company' : p.type !== 'company'))
                        .map(p => <option key={p.id} value={p.id}>{p.name}{p.type === 'company' ? ' [Company]' : ' [Personal]'}{p.division_name ? ` — ${p.division_name}` : ''}</option>)}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 pointer-events-none" />
                  </div>
                  <select value={projectFilter} onChange={e => setProjectFilter(e.target.value as any)}
                    className="text-xs border rounded-lg px-2 py-1.5 bg-white text-gray-500 cursor-pointer">
                    <option value="all">All</option>
                    <option value="company">Company</option>
                    <option value="individual">Personal</option>
                  </select>
                  <button onClick={() => setShowNewProject(true)}
                    className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1.5 rounded-lg">
                    <Plus className="w-4 h-4" /><span className="hidden sm:block">New</span>
                  </button>
                  {activeProject && (
                    <button onClick={() => setShowDeleteConfirm(true)} disabled={deletingProject} title="Delete project"
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                      {deletingProject ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <button onClick={() => setShowMailComposer(true)}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-gray-100">
                  <Mail className="w-4 h-4" /><span className="hidden sm:block">Send Email</span>
                </button>
              )}
              <button onClick={() => { setTopNav('projects'); setBoardTab('feedback'); }}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-gray-100">
                <MessageSquare className="w-4 h-4" /><span className="hidden sm:block">Feedback</span>
              </button>
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">{initials}</div>
                )}
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-800 max-w-[120px] truncate">{name}</p>
                  {isAdmin && <p className="text-[10px] text-purple-500 font-semibold">Admin</p>}
                </div>
                <button onClick={handleLogout} title="Sign out"
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg ml-1">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </header>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      {topNav === 'admin' ? (
        <div className="flex-1 overflow-auto">
          <AdminDashboard currentUser={user!} />
        </div>
      ) : topNav === 'users' ? (
        <div className="flex-1 overflow-auto">
          <UsersAdminPage currentUser={user!} />
        </div>
      ) : topNav === 'comms' ? (
        <div className="flex-1 overflow-auto">
          <CommunicationsPanel projects={projects} />
        </div>
      ) : topNav === ('org-chart' as any) ? (
        <div className="flex-1 overflow-auto">
          <OrgChartPanel />
        </div>
      ) : topNav === ('attendance' as any) ? (
        <div className="flex-1 overflow-auto">
          <AttendancePanel />
        </div>
      ) : topNav === ('leave' as any) ? (
        <div className="flex-1 overflow-auto">
          <LeavePanel />
        </div>
      ) : topNav === ('reports' as any) ? (
        <div className="flex-1 overflow-auto">
          <ReportsPanel />
        </div>
      ) : topNav === ('recruitment' as any) ? (
        <div className="flex-1 overflow-auto">
          <RecruitmentPanel />
        </div>
      ) : (
        <div className="flex-1 overflow-auto flex flex-col">
          {activeProject ? (
            <>
              {/* Board sub-tabs */}
              <div className="bg-white border-b px-4 flex items-center gap-1 flex-wrap">
                {([
                  { id: 'board',    icon: LayoutDashboard, label: 'Board' },
                  { id: 'stats',    icon: BarChart3,        label: 'Stats' },
                  { id: 'members',  icon: Users,            label: 'Members' },
                  { id: 'chat',     icon: MessageCircle,    label: 'Chat' },
                  { id: 'feedback', icon: MessageSquare,    label: 'Feedback' },
                ] as { id: BoardTab; icon: React.ElementType; label: string }[]).map(t => (
                  <button key={t.id} onClick={() => setBoardTab(t.id)}
                    className={`flex items-center gap-1.5 text-sm px-3 py-2.5 font-medium border-b-2 transition-colors ${boardTab === t.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                    <t.icon className="w-3.5 h-3.5" />{t.label}
                  </button>
                ))}
                <div className="ml-3 text-sm text-gray-400 hidden sm:block py-2.5">
                  {activeProject.name}
                  <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${activeProject.type === 'company' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                    {activeProject.type === 'company' ? 'Company' : 'Personal'}
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-2 py-1.5">
                  {/* Role switcher — only shown when user has 2+ roles in this project */}
                  {currentMemberRoles.length > 1 && (
                    <div className="flex items-center gap-1.5 bg-gray-50 border rounded-lg px-2 py-1">
                      <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Role:</span>
                      {currentMemberRoles.map(r => {
                        const rd = getRoleDef(r);
                        return (
                          <button key={r} onClick={() => setActiveRole(r)}
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-all ${activeRole === r ? rd.badge + ' ring-1 ring-offset-1 ring-indigo-300' : 'text-gray-400 hover:bg-gray-100'}`}>
                            {rd.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {/* Permission level badge */}
                  {currentMember && !projectPerms.isManager && (
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${
                      currentMember.permission_level === 'viewer' ? 'bg-gray-100 text-gray-600' :
                      currentMember.permission_level === 'contributor' ? 'bg-blue-100 text-blue-600' :
                      'bg-indigo-100 text-indigo-600'
                    }`}>
                      {currentMember.permission_level}
                    </span>
                  )}
                </div>
              </div>

              {/* Tab content */}
              {boardTab === 'board' && (
                <div className="flex-1 overflow-auto p-4 md:p-6">
                  <DragDropContext onDragEnd={onDragEnd}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 min-w-[900px]">
                      {COLUMNS.map(col => {
                        const colTasks = tasks.filter(t => t.status === col.id).sort((a, b) => a.sort_order - b.sort_order);
                        const isMember = !!currentMember || user?.system_role === 'admin';

                        // Group tasks by module
                        const grouped = colTasks.reduce((acc, task) => {
                          const key = task.module || '__ungrouped__';
                          if (!acc[key]) acc[key] = [];
                          acc[key].push(task);
                          return acc;
                        }, {} as Record<string, Task[]>);

                        const moduleKeys = Object.keys(grouped);

                        return (
                          <div key={col.id} className={`${col.color} rounded-2xl flex flex-col overflow-hidden`}>
                            <div className="px-3 py-2.5 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.headerColor}`}>{col.label}</span>
                                <span className="text-xs text-gray-400 font-medium">{colTasks.length}</span>
                              </div>
                              {col.id === 'todo' && projectPerms.canCreateTask && (
                                <button onClick={() => setNewTaskForCol(col.id)}
                                  className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-white/70">
                                  <Plus className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <Droppable droppableId={col.id}>
                              {(provided, snapshot) => (
                                <div ref={provided.innerRef} {...provided.droppableProps}
                                  className={`flex-1 px-3 pb-3 space-y-3 min-h-[120px] transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50/60' : ''}`}>
                                  {moduleKeys.map(moduleKey => {
                                    const moduleTasks = grouped[moduleKey];
                                    const isModule = moduleKey !== '__ungrouped__';
                                    return (
                                      <div key={moduleKey}>
                                        {isModule && (
                                          <div className="flex items-center gap-2 mb-1.5 ml-1">
                                            <span className="w-2 h-2 rounded-full bg-indigo-300" />
                                            <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider truncate">{moduleKey}</span>
                                            <span className="text-[9px] text-gray-400">{moduleTasks.length}</span>
                                          </div>
                                        )}
                                        <div className="space-y-2">
                                          {moduleTasks.map((task, i) => (
                                            <TaskCard
                                              key={task.id} task={task} index={i}
                                              onOpen={setSelectedTask} userMap={userMap}
                                              isDragDisabled={!projectPerms.canDrag}
                                              currentUserId={user?.id}
                                              isMember={isMember}
                                              canConfirm={projectPerms.isManager}
                                              canEditTask={projectPerms.canEditTask}
                                              onLike={handleLike}
                                              onQuickStatus={handleQuickStatus}
                                              onAskHelp={(task) => {
                                                setHelpTask({ taskId: task.id, taskTitle: task.title });
                                                setBoardTab('chat');
                                              }}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {provided.placeholder}
                                  {colTasks.length === 0 && !snapshot.isDraggingOver && (
                                    <div className="text-center py-6 text-xs text-gray-300">
                                      <FolderKanban className="w-6 h-6 mx-auto mb-1 opacity-50" />Drop tasks here
                                    </div>
                                  )}
                                </div>
                              )}
                            </Droppable>
                            {col.id === 'todo' && projectPerms.canCreateTask && (
                              <button onClick={() => setNewTaskForCol(col.id)}
                                className="mx-3 mb-3 py-1.5 text-xs text-gray-400 hover:text-indigo-600 hover:bg-white/70 rounded-xl flex items-center justify-center gap-1">
                                <Plus className="w-3.5 h-3.5" />Add module tasks
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </DragDropContext>
                </div>
              )}

              {boardTab === 'stats' && user && (
                <div className="flex-1 overflow-auto">
                  <StatsPanel
                    projectId={activeProject.id}
                    currentUser={user}
                    isManager={projectPerms.isManager}
                    userMap={userMap}
                  />
                </div>
              )}

              {boardTab === 'members' && (
                <div className="flex-1 overflow-auto">
                  <MembersPanel
                    projectId={activeProject.id}
                    currentUserId={user!.id}
                    isManager={projectPerms.isManager}
                  />
                </div>
              )}

              {boardTab === 'chat' && user && (
                <div className="flex-1 overflow-hidden">
                  <ChatRoomsPage
                    currentUser={user}
                    allUsers={allUsers}
                    projects={projects}
                    activeProject={activeProject}
                    helpTask={helpTask}
                    clearHelpTask={() => setHelpTask(null)}
                  />
                </div>
              )}

              {boardTab === 'feedback' && user && (
                <div className="flex-1 overflow-auto">
                  <FeedbackPage
                    projectId={activeProject.id}
                    currentUser={user}
                    allUsers={allUsers}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center py-32 text-gray-400">
              <div className="text-center">
                <FolderKanban className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium text-gray-500">Select or create a project to get started</p>
                <button onClick={() => setShowNewProject(true)}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600">
                  <Plus className="w-4 h-4" />Create a project
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* New Project Modal */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowNewProject(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-900">New Project</h2>
              <button onClick={() => setShowNewProject(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
              <div className="space-y-3">
              <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                placeholder="Project name" className="w-full p-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                autoFocus onKeyDown={e => e.key === 'Enter' && createProject()} />
              <textarea value={newProjectDesc} onChange={e => setNewProjectDesc(e.target.value)}
                placeholder="Description (optional)" className="w-full p-2.5 border rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-300 outline-none" rows={2} />
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Project Type</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setNewProjectType('individual')}
                    className={`flex-1 py-2 text-sm rounded-xl border font-medium ${newProjectType === 'individual' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500'}`}>
                    Individual
                  </button>
                  <button type="button" onClick={() => setNewProjectType('company')}
                    className={`flex-1 py-2 text-sm rounded-xl border font-medium ${newProjectType === 'company' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500'}`}>
                    Company
                  </button>
                </div>
              </div>
              {newProjectType === 'company' && divisions.length > 0 && (
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Division</label>
                  <select value={newProjectDivisionId} onChange={e => setNewProjectDivisionId(e.target.value)}
                    className="w-full text-sm border rounded-xl px-3 py-2 bg-white">
                    <option value="">Select division...</option>
                    {divisions.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setShowNewProject(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl">Cancel</button>
              <button onClick={createProject} disabled={creatingProject || !newProjectName.trim()}
                className="px-4 py-2 text-sm bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2">
                {creatingProject ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}Create
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
