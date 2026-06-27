import { useState, useEffect } from 'react';
import {
  BarChart3, CheckCircle2, Clock, AlertTriangle, TrendingUp, TrendingDown,
  RotateCcw, UserCheck, ArrowRightLeft, Calendar, Loader2, RefreshCw,
  ChevronDown, ChevronUp, Users, Target, Flame, Award,
} from 'lucide-react';
import { api, type User, type ProjectStats, type TeamMemberStats, type AssignmentLog, type ContributionDay, userName, userInitials } from '../services/api';
import { getRoleDef } from '../lib/roles';
import { toast } from 'sonner';
import { ContributionGraph } from './ContributionGraph';

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysAgo(date: string) {
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  return d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`;
}

function daysOverdueLabel(due: string) {
  const d = Math.floor((Date.now() - new Date(due).getTime()) / 86_400_000);
  if (d <= 0) return null;
  return `${d}d overdue`;
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function Card({ icon: Icon, label, value, sub, color, warn }: {
  icon: React.ElementType; label: string; value: number | string;
  sub?: string; color: string; warn?: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl border p-4 flex items-start gap-3 shadow-sm ${warn && Number(value) > 0 ? 'border-red-200 bg-red-50/30' : ''}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
      </div>
      <div>
        <p className={`text-xl font-bold ${warn && Number(value) > 0 ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Log Timeline Entry ────────────────────────────────────────────────────────
function LogEntry({ log, isMe }: { log: AssignmentLog; isMe: boolean }) {
  const person = log.user ? `${log.user.first_name} ${log.user.last_name}` : '?';
  const changer = log.changedByUser ? `${log.changedByUser.first_name} ${log.changedByUser.last_name}` : 'Someone';
  const assigned = log.action === 'assigned';

  return (
    <div className="flex gap-3 text-sm py-2.5 border-b last:border-0">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${assigned ? 'bg-green-100' : 'bg-orange-100'}`}>
        <ArrowRightLeft className={`w-3 h-3 ${assigned ? 'text-green-600' : 'text-orange-600'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-700 leading-snug">
          {assigned
            ? <><span className="font-semibold">{person}</span> {isMe ? 'was assigned to' : 'assigned to'} <span className="font-medium text-indigo-600">"{log.task_title}"</span></>
            : <><span className="font-semibold">{person}</span> {isMe ? 'was unassigned from' : 'unassigned from'} <span className="font-medium text-indigo-600">"{log.task_title}"</span></>
          }
          {log.changedByUser && <span className="text-gray-400"> by {changer}</span>}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">{daysAgo(log.created_at)}</p>
      </div>
    </div>
  );
}

// ── Team Member Row ───────────────────────────────────────────────────────────
function TeamRow({ m, onClick, active }: { m: TeamMemberStats; onClick: () => void; active: boolean }) {
  const rd = getRoleDef((m.roles?.[0] || m.role) as string);
  const completionColor = m.completionRate >= 80 ? 'text-green-600' : m.completionRate >= 50 ? 'text-amber-600' : 'text-red-500';
  return (
    <tr onClick={onClick}
      className={`cursor-pointer hover:bg-gray-50 transition-colors ${active ? 'bg-indigo-50/60' : ''}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${rd.dot}`}>
            {userInitials(m.user)}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{userName(m.user)}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${rd.badge}`}>{rd.label}</span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">{m.totalAssigned}</td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <span className="text-sm font-bold text-green-600">{m.done}</span>
          <span className="text-xs text-gray-400">/ {m.totalAssigned}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-center text-sm font-semibold text-blue-600">{m.in_progress}</td>
      <td className="px-4 py-3 text-center">
        {m.overdue > 0
          ? <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{m.overdue}</span>
          : <span className="text-xs text-gray-300">—</span>}
      </td>
      <td className="px-4 py-3 text-center">
        {m.rework > 0
          ? <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">{m.rework}</span>
          : <span className="text-xs text-gray-300">—</span>}
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`text-sm font-bold ${completionColor}`}>{m.completionRate}%</span>
      </td>
      <td className="px-4 py-3 text-center">
        {m.onTimeRate !== null
          ? <span className={`text-xs font-semibold ${m.onTimeRate >= 80 ? 'text-green-600' : m.onTimeRate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{m.onTimeRate}%</span>
          : <span className="text-xs text-gray-300">—</span>}
      </td>
    </tr>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function StatsPanel({ projectId, currentUser, isManager, userMap }: {
  projectId: string; currentUser: User; isManager: boolean; userMap: Record<string, User>;
}) {
  const [stats, setStats]   = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView]     = useState<'me' | 'team'>('me');
  const [selectedMember, setSelectedMember] = useState<TeamMemberStats | null>(null);
  const [showOverdue, setShowOverdue] = useState(true);
  const [showLogs, setShowLogs]       = useState(true);
  const [contributions, setContributions] = useState<ContributionDay[]>([]);
  const [memberContributions, setMemberContributions] = useState<Record<string, ContributionDay[]>>({});
  const [year, setYear] = useState(new Date().getFullYear());

  const load = () => {
    setLoading(true);
    Promise.all([
      api.getProjectStats(projectId),
      api.getMyContributions(year),
    ])
      .then(([s, c]) => { setStats(s); setContributions(c); })
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [projectId, year]);

  // Load team contributions when switching to team view
  useEffect(() => {
    if (view === 'team' && isManager) {
      api.getProjectContributions(projectId, year)
        .then(setMemberContributions)
        .catch(() => {});
    }
  }, [view, projectId, year, isManager]);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
    </div>
  );

  if (!stats) return null;

  const { myStats, myTasks, overdueTasks, myLogs, myChangedByLogs } = stats;
  const s = selectedMember || null;
  const displayStats = s ? s : myStats;
  const displayName  = s ? userName(s.user) : `${currentUser.first_name} ${currentUser.first_name}`;

  const onTimeRate = myStats.completedOnTime + myStats.completedLate > 0
    ? Math.round((myStats.completedOnTime / (myStats.completedOnTime + myStats.completedLate)) * 100) : null;

  // Tasks the selected member (or me) is working on
  const memberActiveTasks = (s ? stats.myTasks : myTasks).filter(t => t.status !== 'done');

  return (
    <div className="max-w-6xl mx-auto py-5 px-4 space-y-5">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            {isManager ? 'Project Analytics' : 'My Progress'}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {isManager ? 'Team performance, delivery accuracy, and task health' : 'Your assignment history and delivery record'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Year selector */}
          <select
            value={year}
            onChange={e => setYear(parseInt(e.target.value))}
            className="text-xs border rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:ring-2 focus:ring-indigo-300 outline-none"
          >
            {[0, 1, 2].map(offset => {
              const y = new Date().getFullYear() - offset;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
          {isManager && (
            <div className="flex rounded-xl border overflow-hidden text-sm">
              <button onClick={() => { setView('me'); setSelectedMember(null); }}
                className={`px-3 py-1.5 font-medium ${view === 'me' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                My Stats
              </button>
              <button onClick={() => setView('team')}
                className={`px-3 py-1.5 font-medium ${view === 'team' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                Team View
              </button>
            </div>
          )}
          <button onClick={load} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-xl">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ══ MY STATS VIEW ═══════════════════════════════════════════════════ */}
      {view === 'me' && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card icon={Target}       label="Total Assigned"    value={myStats.totalAssigned} color="bg-indigo-500"
              sub={`${myStats.in_progress} active`} />
            <Card icon={CheckCircle2} label="Completed"         value={myStats.done}          color="bg-green-500"
              sub={onTimeRate !== null ? `${onTimeRate}% on time` : undefined} />
            <Card icon={AlertTriangle} label="Overdue"          value={myStats.overdue}       color="bg-red-500" warn />
            <Card icon={RotateCcw}    label="Rework"            value={myStats.rework}        color="bg-orange-500" warn />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card icon={Clock}        label="Todo"              value={myStats.todo}          color="bg-gray-400" />
            <Card icon={Flame}        label="In Progress"       value={myStats.in_progress}   color="bg-blue-500" />
            <Card icon={TrendingUp}   label="On-Time Deliveries" value={myStats.completedOnTime} color="bg-teal-500"
              sub="Finished before due date" />
            <Card icon={Calendar}     label="Extended Deadlines" value={myStats.extendedDeadlines} color="bg-amber-500"
              sub="Due date was extended" warn />
          </div>

          {/* Overdue tasks */}
          {overdueTasks.length > 0 && (
            <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
              <button className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                onClick={() => setShowOverdue(o => !o)}>
                <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Overdue Tasks ({overdueTasks.length})</span>
                {showOverdue ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showOverdue && (
                <div className="divide-y">
                  {overdueTasks.map(t => {
                    const label = daysOverdueLabel(t.due_date!);
                    const extended = t.original_due_date && t.due_date && t.due_date > t.original_due_date;
                    return (
                      <div key={t.id} className="px-5 py-3 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {t.module && <p className="text-[10px] font-semibold text-indigo-400 mb-0.5">{t.module}</p>}
                          <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-gray-400 capitalize">{t.status.replace('_', ' ')}</span>
                            {extended && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">Extended</span>}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-bold text-red-500">{label}</p>
                          <p className="text-[10px] text-gray-400">Due {new Date(t.due_date!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Assignment history */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Tasks assigned to me */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <button className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setShowLogs(l => !l)}>
                <span className="flex items-center gap-2"><UserCheck className="w-4 h-4 text-green-500" />My Assignment History ({myLogs.length})</span>
                {showLogs ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>
              {showLogs && (
                <div className="px-4 py-1 max-h-72 overflow-y-auto">
                  {myLogs.length === 0
                    ? <p className="text-sm text-gray-400 text-center py-6">No assignment history yet</p>
                    : myLogs.map(l => <LogEntry key={l.id} log={l} isMe={true} />)
                  }
                </div>
              )}
            </div>

            {/* Tasks I reassigned */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 text-sm font-semibold text-gray-700 border-b flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-blue-500" />Actions I Took ({myChangedByLogs.length})
              </div>
              <div className="px-4 py-1 max-h-72 overflow-y-auto">
                {myChangedByLogs.length === 0
                  ? <p className="text-sm text-gray-400 text-center py-6">No actions taken yet</p>
                  : myChangedByLogs.map(l => <LogEntry key={l.id} log={l} isMe={false} />)
                }
              </div>
            </div>
          </div>

          {/* ── Contribution Graph ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-green-500" />
              <p className="text-sm font-bold text-gray-800">My Contributions</p>
              <span className="text-xs text-gray-400">— completed tasks confirmed by PM</span>
            </div>
            <ContributionGraph data={contributions} year={year} />
          </div>
        </>
      )}

      {/* ══ TEAM VIEW (PM/admin) ═════════════════════════════════════════════ */}
      {view === 'team' && stats.teamStats && (
        <>
          {/* Project-level status breakdown */}
          {stats.projectStatusBreakdown && (
            <div className="bg-white rounded-2xl border shadow-sm p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Project Status Breakdown</p>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { key: 'todo',        label: 'To Do',       color: 'bg-gray-100 text-gray-700' },
                  { key: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
                  { key: 'review',      label: 'Review',      color: 'bg-amber-100 text-amber-700' },
                  { key: 'rework',      label: 'Rework',      color: 'bg-red-100 text-red-700' },
                  { key: 'done',        label: 'Done',        color: 'bg-green-100 text-green-700' },
                ].map(s => (
                  <div key={s.key} className={`rounded-xl text-center py-3 ${s.color}`}>
                    <p className="text-2xl font-bold">{stats.projectStatusBreakdown![s.key] || 0}</p>
                    <p className="text-[10px] font-semibold mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Team leaderboard table */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold text-gray-700">Team Performance</span>
              <span className="text-xs text-gray-400 ml-1">({stats.teamStats.length} members)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Member</th>
                    <th className="text-center px-4 py-2.5 font-semibold text-gray-600 text-xs">Assigned</th>
                    <th className="text-center px-4 py-2.5 font-semibold text-gray-600 text-xs">Done</th>
                    <th className="text-center px-4 py-2.5 font-semibold text-gray-600 text-xs">Active</th>
                    <th className="text-center px-4 py-2.5 font-semibold text-gray-600 text-xs">Overdue</th>
                    <th className="text-center px-4 py-2.5 font-semibold text-gray-600 text-xs">Rework</th>
                    <th className="text-center px-4 py-2.5 font-semibold text-gray-600 text-xs">Completion</th>
                    <th className="text-center px-4 py-2.5 font-semibold text-gray-600 text-xs">On-Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.teamStats.map(m => (
                    <TeamRow key={m.userId} m={m}
                      onClick={() => setSelectedMember(prev => prev?.userId === m.userId ? null : m)}
                      active={selectedMember?.userId === m.userId} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Team Contribution Graphs ────────────────────────────────── */}
          {stats.teamStats.length > 0 && (
            <div className="bg-white rounded-2xl border shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-4 h-4 text-green-500" />
                <p className="text-sm font-bold text-gray-800">Team Contributions</p>
                <span className="text-xs text-gray-400">— tasks confirmed done, hover for details</span>
              </div>
              <div className="space-y-5">
                {stats.teamStats.map(m => {
                  const contrib = memberContributions[m.userId] || [];
                  const total   = contrib.reduce((s, d) => s + d.count, 0);
                  return (
                    <div key={m.userId} className="border-b last:border-0 pb-5 last:pb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${getRoleDef((m.roles?.[0] || m.role) as string).dot}`}>
                          {userInitials(m.user)}
                        </div>
                        <p className="text-sm font-semibold text-gray-700">{userName(m.user)}</p>
                        <span className="text-xs text-green-600 font-semibold">{total} tasks done</span>
                        {m.overdue > 0 && (
                          <span className="text-xs text-red-500 font-semibold">{m.overdue} overdue</span>
                        )}
                      </div>
                      <ContributionGraph data={contrib} year={year} compact />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Drill-down for selected member */}
          {selectedMember && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-500" />
                  {userName(selectedMember.user)}'s Detail
                </h4>
                <button onClick={() => setSelectedMember(null)} className="text-xs text-gray-400 hover:text-gray-700">Close</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card icon={Target}       label="Assigned"    value={selectedMember.totalAssigned} color="bg-indigo-500" />
                <Card icon={CheckCircle2} label="Completed"   value={selectedMember.done}          color="bg-green-500" />
                <Card icon={AlertTriangle} label="Overdue"    value={selectedMember.overdue}       color="bg-red-500" warn />
                <Card icon={RotateCcw}    label="Rework"      value={selectedMember.rework}        color="bg-orange-500" warn />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl p-3 text-center border">
                  <p className="text-xl font-bold text-indigo-600">{selectedMember.completionRate}%</p>
                  <p className="text-xs text-gray-500">Completion Rate</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center border">
                  <p className={`text-xl font-bold ${selectedMember.onTimeRate === null ? 'text-gray-400' : selectedMember.onTimeRate >= 70 ? 'text-green-600' : 'text-red-500'}`}>
                    {selectedMember.onTimeRate === null ? '—' : `${selectedMember.onTimeRate}%`}
                  </p>
                  <p className="text-xs text-gray-500">On-Time Delivery</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center border">
                  <p className="text-xl font-bold text-amber-500">{selectedMember.extendedDeadlines}</p>
                  <p className="text-xs text-gray-500">Extended Deadlines</p>
                </div>
              </div>
              {/* Selected member's contribution graph */}
              {memberContributions[selectedMember.userId] && (
                <div className="bg-white rounded-xl border p-4">
                  <ContributionGraph data={memberContributions[selectedMember.userId]} year={year} label="Contribution History" />
                </div>
              )}
            </div>
          )}

          {/* Project overdue tasks */}
          {stats.projectOverdue && stats.projectOverdue.length > 0 && (
            <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-red-50 border-b border-red-100">
                <h4 className="text-sm font-bold text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />Project Overdue Tasks ({stats.projectOverdue.length})
                </h4>
              </div>
              <div className="divide-y max-h-72 overflow-y-auto">
                {stats.projectOverdue.map(({ task, daysOverdue, assignees }) => (
                  <div key={task.id} className="px-5 py-3 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {task.module && <p className="text-[10px] font-semibold text-indigo-400 mb-0.5">{task.module}</p>}
                      <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                      {assignees.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          {assignees.map(u => (
                            <span key={u.id} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                              {u.first_name}
                            </span>
                          ))}
                        </div>
                      )}
                      {assignees.length === 0 && (
                        <p className="text-[10px] text-orange-500 font-semibold mt-0.5">⚠ Unassigned</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold text-red-500">{daysOverdue}d overdue</p>
                      <p className="text-[10px] text-gray-400">Due {new Date(task.due_date!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      {task.original_due_date && task.original_due_date !== task.due_date && (
                        <p className="text-[10px] text-amber-500 font-semibold">Extended</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent assignment activity */}
          {stats.recentLogs && stats.recentLogs.length > 0 && (
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold text-gray-700">Recent Assignment Activity</span>
              </div>
              <div className="px-4 py-1 max-h-64 overflow-y-auto">
                {stats.recentLogs.map(l => <LogEntry key={l.id} log={l} isMe={false} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
