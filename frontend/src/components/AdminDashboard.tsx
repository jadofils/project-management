import { useState, useEffect } from 'react';
import {
  FolderKanban, CheckSquare, TrendingUp,
  ToggleLeft, ToggleRight, Loader2, RefreshCw, UserCheck, UserX,
  Activity, BarChart3, ShieldCheck, Users, Clock, Building2, Briefcase,
} from 'lucide-react';
import { api, type AdminStats, type User, userName } from '../services/api';
import { toast } from 'sonner';
import { ContributionGraph } from './ContributionGraph';
import { UsersAdminPage } from './UsersAdminPage';

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: number | string;
  sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border p-5 flex items-start gap-4 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function AdminDashboard({ currentUser }: { currentUser: User }) {
  const [stats, setStats]     = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [tab, setTab]         = useState<'overview' | 'projects' | 'users'>('overview');
  const [systemContribs, setSystemContribs] = useState<{ date: string; count: number }[]>([]);
  const [year, setYear]       = useState(new Date().getFullYear());

  const load = () => {
    setLoading(true);
    Promise.all([
      api.getAdminStats(),
      api.getSystemContributionSummary(year),
    ])
      .then(([s, c]) => { setStats(s); setSystemContribs(c); })
      .catch(() => toast.error('Failed to load admin stats'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [year]);

  const toggleProject = async (id: string, current: string) => {
    const next = current === 'active' ? 'disabled' : 'active';
    setTogglingId(id);
    try {
      await api.setProjectStatus(id, next);
      setStats(prev => prev ? {
        ...prev,
        activeProjects:   next === 'active' ? prev.activeProjects + 1 : prev.activeProjects - 1,
        disabledProjects: next === 'disabled' ? prev.disabledProjects + 1 : prev.disabledProjects - 1,
        projects: prev.projects.map(p => p.id === id ? { ...p, status: next } : p),
      } : prev);
      toast.success(`Project ${next === 'active' ? 'enabled' : 'disabled'}`);
    } catch { toast.error('Failed to update project'); }
    finally { setTogglingId(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
    </div>
  );

  if (!stats) return null;

  const doneCount   = stats.tasksByStatus.done || 0;
  const openCount   = stats.totalTasks - doneCount;
  const completionRate = stats.totalTasks > 0 ? Math.round((doneCount / stats.totalTasks) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-purple-500" />
            System Administration
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Full visibility across all projects, users, and tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}
            className="text-xs border rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:ring-2 focus:ring-indigo-300 outline-none">
            {[0, 1, 2].map(o => { const y = new Date().getFullYear() - o; return <option key={y} value={y}>{y}</option>; })}
          </select>
          <button onClick={load} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-gray-100">
            <RefreshCw className="w-3.5 h-3.5" />Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FolderKanban}  label="Total Projects" value={stats.totalProjects}
          sub={`${stats.activeProjects} active · ${stats.disabledProjects} disabled`}
          color="bg-indigo-500" />
        <StatCard icon={Building2}     label="Company Projects" value={stats.companyProjects || 0}
          sub="Linked to divisions"
          color="bg-purple-500" />
        <StatCard icon={UserCheck}     label="Personal Projects" value={stats.individualProjects || 0}
          sub="Individual workspace"
          color="bg-blue-500" />
        <StatCard icon={Users}         label="Registered Users" value={stats.totalUsers}
          sub={`${stats.activeUsers} active`}
          color="bg-cyan-500" />
        <StatCard icon={CheckSquare}   label="Total Tasks" value={stats.totalTasks}
          sub={`${openCount} open · ${doneCount} done`}
          color="bg-green-500" />
        <StatCard icon={TrendingUp}    label="Completion Rate" value={`${completionRate}%`}
          sub={`across all projects`}
          color="bg-purple-500" />
      </div>

      {/* Task status breakdown */}
      <div className="bg-white rounded-2xl border p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-400" />Task Status Breakdown
        </h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            { key: 'todo',        label: 'To Do',       color: 'bg-gray-200 text-gray-700' },
            { key: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
            { key: 'review',      label: 'Review',      color: 'bg-amber-100 text-amber-700' },
            { key: 'done',        label: 'Done',        color: 'bg-green-100 text-green-700' },
          ].map(s => (
            <div key={s.key} className={`rounded-xl px-3 py-3 text-center ${s.color}`}>
              <p className="text-2xl font-bold">{stats.tasksByStatus[s.key] || 0}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        {/* Completion bar */}
        {stats.totalTasks > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Overall progress</span>
              <span className="font-semibold">{completionRate}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-green-500 rounded-full transition-all"
                style={{ width: `${completionRate}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* System-wide Contribution Graph */}
      <div className="bg-white rounded-2xl border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-green-500" />
          <h3 className="text-sm font-semibold text-gray-700">System Activity</h3>
          <span className="text-xs text-gray-400">— tasks marked done across all projects</span>
        </div>
        <ContributionGraph
          data={systemContribs.map(d => ({ date: d.date, count: d.count, tasks: [] }))}
          year={year}
        />
      </div>

      {/* Tab Nav */}
      <div className="border-b flex items-center gap-1">
        {(['overview', 'projects', 'users'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-sm px-4 py-2.5 font-medium border-b-2 capitalize transition-colors ${tab === t ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* ── Overview tab ─────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Recent projects */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold text-sm text-gray-700">Recent Projects</span>
            </div>
            <div className="divide-y">
              {stats.projects.slice(0, 8).map(p => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.member_count} members · {p.task_count} tasks</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* User list */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              <span className="font-semibold text-sm text-gray-700">Registered Users</span>
            </div>
            <div className="divide-y max-h-[360px] overflow-y-auto">
              {stats.users.slice(0, 20).map(u => (
                <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${u.system_role === 'admin' ? 'bg-purple-500' : 'bg-indigo-400'}`}>
                    {u.first_name[0]}{u.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{userName(u)}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {u.system_role === 'admin' && (
                      <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold">Admin</span>
                    )}
                    {u.is_active
                      ? <UserCheck className="w-3.5 h-3.5 text-green-500" />
                      : <UserX className="w-3.5 h-3.5 text-red-400" />
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Projects tab ─────────────────────────────────────────────────────── */}
      {tab === 'projects' && (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Project</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Members</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Tasks</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Created</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Toggle</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.projects.map(p => (
                  <tr key={p.id} className={`hover:bg-gray-50 ${p.status === 'disabled' ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-800">{p.name}</p>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{p.member_count}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{p.task_count}</td>
                    <td className="px-4 py-3 text-center text-gray-400 text-xs">
                      {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleProject(p.id, p.status)}
                        disabled={togglingId === p.id}
                        title={p.status === 'active' ? 'Disable project' : 'Enable project'}
                        className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors">
                        {togglingId === p.id
                          ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                          : p.status === 'active'
                            ? <ToggleRight className="w-5 h-5 text-green-500" />
                            : <ToggleLeft className="w-5 h-5 text-gray-400" />
                        }
                      </button>
                    </td>
                  </tr>
                ))}
                {stats.projects.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">No projects yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Users tab ────────────────────────────────────────────────────────── */}
      {tab === 'users' && (
        <UsersAdminPage currentUser={currentUser} />
      )}
    </div>
  );
}
