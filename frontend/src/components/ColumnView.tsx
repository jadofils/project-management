import { useState, useMemo } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { ChevronDown, ChevronRight, Plus, FolderKanban, Calendar, UserCheck } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { type Task, type User, userName } from '../services/api';

interface ColumnViewProps {
  col: { id: string; label: string; color: string; headerColor: string };
  tasks: Task[];
  isMember: boolean;
  userMap: Record<string, User>;
  currentUserId?: string;
  canCreateTask: boolean;
  canDrag: boolean;
  canEditTask: boolean;
  isManager: boolean;
  onOpen: (t: Task) => void;
  onLike: (task: Task) => void;
  onQuickStatus: (task: Task, newStatus: string) => void;
  onAskHelp: (task: Task) => void;
  onAddTask: () => void;
}

function dateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const taskDate = new Date(d); taskDate.setHours(0, 0, 0, 0);
  if (taskDate.getTime() === today.getTime()) return 'Today';
  if (taskDate.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function ColumnView({ col, tasks, isMember, userMap, currentUserId, canCreateTask, canDrag, canEditTask, isManager, onOpen, onLike, onQuickStatus, onAskHelp, onAddTask }: ColumnViewProps) {
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const [collapsedDevs, setCollapsedDevs] = useState<Set<string>>(new Set());

  const dateGroups = useMemo(() => {
    const groups: { date: string; label: string; tasks: Task[] }[] = [];
    const seen = new Set<string>();
    for (const t of tasks) {
      const key = t.due_date || '__none__';
      if (!seen.has(key)) {
        seen.add(key);
        groups.push({ date: key, label: t.due_date ? dateLabel(t.due_date) : 'No Due Date', tasks: [] });
      }
      groups.find(g => g.date === key)!.tasks.push(t);
    }
    groups.sort((a, b) => {
      if (a.date === '__none__') return 1;
      if (b.date === '__none__') return -1;
      return a.date.localeCompare(b.date);
    });
    return groups;
  }, [tasks]);

  const toggleDate = (date: string) => {
    setCollapsedDates(prev => { const next = new Set(prev); if (next.has(date)) next.delete(date); else next.add(date); return next; });
  };

  const toggleDev = (key: string) => {
    setCollapsedDevs(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  };

  return (
    <div className={`${col.color} rounded-2xl flex flex-col overflow-hidden`}>
      <div className="px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.headerColor}`}>{col.label}</span>
          <span className="text-xs text-gray-400 font-medium">{tasks.length}</span>
        </div>
        {col.id === 'todo' && canCreateTask && (
          <button onClick={onAddTask} className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-white/70">
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
      <Droppable droppableId={col.id}>
        {(provided, snapshot) => (
          <div ref={provided.innerRef} {...provided.droppableProps}
            className={`flex-1 px-3 pb-3 min-h-[120px] transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50/60' : ''}`}>
            {dateGroups.map(group => {
              const isCollapsed = collapsedDates.has(group.date);
              const completedCount = group.tasks.filter(t => t.status === 'done').length;
              return (
                <div key={group.date} className="mb-3">
                  <button onClick={() => toggleDate(group.date)}
                    className="flex items-center gap-1.5 w-full text-left py-1 px-1 rounded-lg hover:bg-white/50 group">
                    {isCollapsed ? <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-gray-500" /> : <ChevronDown className="w-3 h-3 text-gray-300 group-hover:text-gray-500" />}
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{group.label}</span>
                    <span className="text-[9px] text-gray-400 ml-auto">{completedCount}/{group.tasks.length}</span>
                  </button>
                  {!isCollapsed && (
                    <div className="space-y-2 mt-1">
                      {/* Group tasks by developer within date */}
                      {(() => {
                        const devGroups: { userId: string; name: string; initials: string; tasks: Task[] }[] = [];
                        const seenU = new Set<string>();
                        for (const t of group.tasks) {
                          const ids = t.assignee_ids?.length ? t.assignee_ids : (t.assignee_id ? [t.assignee_id] : []);
                          if (ids.length === 0) {
                            if (!seenU.has('__unassigned__')) {
                              seenU.add('__unassigned__');
                              devGroups.push({ userId: '__unassigned__', name: 'Unassigned', initials: '?', tasks: [] });
                            }
                            devGroups.find(d => d.userId === '__unassigned__')!.tasks.push(t);
                          } else {
                            for (const uid of ids) {
                              if (!seenU.has(uid)) {
                                seenU.add(uid);
                                const u = userMap[uid];
                                devGroups.push({ userId: uid, name: u ? userName(u) : uid.slice(0, 8), initials: u ? `${u.first_name[0]}${u.last_name[0]}`.toUpperCase() : uid.slice(0, 2).toUpperCase(), tasks: [] });
                              }
                              devGroups.find(d => d.userId === uid)!.tasks.push(t);
                            }
                          }
                        }
                        return devGroups.map(dev => {
                          const devKey = `${group.date}-${dev.userId}`;
                          const isDevCollapsed = collapsedDevs.has(devKey);
                          const devDone = dev.tasks.filter(t => t.status === 'done').length;
                          const pct = dev.tasks.length > 0 ? Math.round((devDone / dev.tasks.length) * 100) : 0;
                          return (
                            <div key={devKey}>
                              <button onClick={() => toggleDev(devKey)}
                                className="flex items-center gap-1.5 w-full px-2 py-0.5 rounded-md hover:bg-white/50 group ml-2">
                                {isDevCollapsed ? <ChevronRight className="w-2.5 h-2.5 text-gray-300" /> : <ChevronDown className="w-2.5 h-2.5 text-gray-300" />}
                                <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[7px] font-bold">{dev.initials}</div>
                                <span className="text-[10px] font-medium text-gray-600 truncate">{dev.name}</span>
                                <span className="text-[9px] text-gray-400 ml-auto">{devDone}/{dev.tasks.length}</span>
                                <div className="w-8 h-1 bg-gray-200 rounded-full ml-1 overflow-hidden">
                                  <div className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-indigo-400'}`} style={{ width: `${pct}%` }} />
                                </div>
                              </button>
                              {!isDevCollapsed && (
                                <div className="space-y-1.5 ml-5 mt-0.5">
                                  {dev.tasks.map((task, i) => (
                                    <TaskCard
                                      key={task.id} task={task} index={i}
                                      onOpen={onOpen} userMap={userMap}
                                      isDragDisabled={!canDrag}
                                      currentUserId={currentUserId}
                                      isMember={isMember}
                                      canConfirm={isManager}
                                      canEditTask={canEditTask}
                                      onLike={onLike}
                                      onQuickStatus={onQuickStatus}
                                      onAskHelp={onAskHelp}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
            {provided.placeholder}
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="text-center py-6 text-xs text-gray-300">
                <FolderKanban className="w-6 h-6 mx-auto mb-1 opacity-50" />Drop tasks here
              </div>
            )}
          </div>
        )}
      </Droppable>
      {col.id === 'todo' && canCreateTask && (
        <button onClick={onAddTask}
          className="mx-3 mb-3 py-1.5 text-xs text-gray-400 hover:text-indigo-600 hover:bg-white/70 rounded-xl flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />Add tasks
        </button>
      )}
    </div>
  );
}
