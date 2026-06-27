import { Draggable } from '@hello-pangea/dnd';
import React from 'react';
import { Calendar, CheckCircle2, Heart, MessageSquare, ArrowRight, HelpCircle } from 'lucide-react';
import { PHASE_SHORT } from '../lib/roles';
import { PRIORITY_COLORS } from '../lib/constants';
import { type Task, type User, userName, userInitials } from '../services/api';

export const TaskCard = React.memo(function TaskCard({
  task, index, onOpen, userMap, isDragDisabled = false,
  currentUserId, isMember, canConfirm, canEditTask,
  onLike, onQuickStatus, onAskHelp,
}: {
  task: Task; index: number; onOpen: (t: Task) => void; userMap: Record<string, User>; isDragDisabled?: boolean;
  currentUserId?: string;
  isMember?: boolean;
  canConfirm?: boolean;
  canEditTask?: boolean;
  onLike?: (task: Task) => void;
  onQuickStatus?: (task: Task, newStatus: string) => void;
  onAskHelp?: (task: Task) => void;
}) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const assignees = (task.assignee_ids?.length ? task.assignee_ids : (task.assignee_id ? [task.assignee_id] : []))
    .map(id => userMap[id]).filter(Boolean);

  const likedBy = task.liked_by || [];
  const isLiked = !!currentUserId && likedBy.includes(currentUserId);

  const isAssignee = !!currentUserId && (
    (task.assignee_ids || []).includes(currentUserId) || task.assignee_id === currentUserId
  );
  const canEditThis = canEditTask || isAssignee;

  const confirmedByUser = task.completed_by ? userMap[task.completed_by] : null;

  const quickAction = (() => {
    if (!isMember) return null;
    switch (task.status) {
      case 'todo':        return canEditThis  ? { label: 'Start',  status: 'in_progress', cls: 'text-blue-600 hover:bg-blue-50' }  : null;
      case 'in_progress': return canEditThis  ? { label: 'Review', status: 'review',      cls: 'text-amber-600 hover:bg-amber-50' } : null;
      case 'review':      return canConfirm   ? { label: 'Approve',status: 'done',        cls: 'text-green-600 hover:bg-green-50' } : null;
      case 'rework':      return canEditThis  ? { label: 'Fixed',  status: 'in_progress', cls: 'text-blue-600 hover:bg-blue-50' }  : null;
      case 'done':        return canConfirm   ? { label: 'Reopen', status: 'todo',        cls: 'text-gray-500 hover:bg-gray-100' }  : null;
      default: return null;
    }
  })();

  const rejectAction = task.status === 'review' && canConfirm
    ? { label: 'Send Back', status: 'in_progress', cls: 'text-amber-600 hover:bg-amber-50' }
    : null;

  return (
    <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={isDragDisabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
          onClick={() => onOpen(task)}
          className={`bg-white rounded-xl border p-3 shadow-sm hover:shadow-md transition-all cursor-pointer select-none ${snapshot.isDragging ? 'shadow-lg rotate-1 ring-2 ring-indigo-300' : ''}`}
        >
          {task.module && (
            <p className="text-[10px] font-semibold text-indigo-400 mb-0.5 truncate">{task.module}</p>
          )}
          <p className="text-sm font-medium text-gray-800 leading-snug">{task.title}</p>
          {task.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{task.description}</p>}

          {task.subtask_count > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-gray-400">{task.subtasks_done}/{task.subtask_count} subtasks</span>
                <span className="text-[10px] text-indigo-500 font-medium">{Math.round((task.subtasks_done / task.subtask_count) * 100)}%</span>
              </div>
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${task.subtasks_done === task.subtask_count ? 'bg-green-500' : 'bg-indigo-400'}`}
                  style={{ width: `${Math.round((task.subtasks_done / task.subtask_count) * 100)}%` }} />
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold capitalize ${PRIORITY_COLORS[task.priority] || 'bg-gray-100 text-gray-600'}`}>
              {task.priority}
            </span>
            {task.phase && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 font-semibold">
                {PHASE_SHORT[task.phase] || task.phase}
              </span>
            )}
            {task.due_date && (
              <span className={`text-[10px] flex items-center gap-0.5 font-medium ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                <Calendar className="w-3 h-3" />
                {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {assignees.length > 0 && (
              <div className="ml-auto flex -space-x-1">
                {assignees.slice(0, 3).map(u => (
                  <div key={u.id} title={userName(u)}
                    className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[8px] font-bold ring-1 ring-white shrink-0">
                    {userInitials(u)}
                  </div>
                ))}
                {assignees.length > 3 && (
                  <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-[8px] font-bold ring-1 ring-white shrink-0">
                    +{assignees.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>

          {task.status === 'done' && task.completed_at && (
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-green-600 font-medium">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span>
                {new Date(task.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {confirmedByUser && ` · ${confirmedByUser.first_name}`}
              </span>
            </div>
          )}

          {isMember && (
            <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <button
                onClick={e => { e.stopPropagation(); onLike?.(task); }}
                title={isLiked ? 'Unlike' : 'Like'}
                className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-lg font-medium transition-colors ${isLiked ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-red-400 hover:bg-red-50'}`}
              >
                <Heart className={`w-3 h-3 ${isLiked ? 'fill-current' : ''}`} />
                {likedBy.length > 0 && <span>{likedBy.length}</span>}
              </button>

              <button
                onClick={e => { e.stopPropagation(); onOpen(task); }}
                title="Open & comment"
                className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
              >
                <MessageSquare className="w-3 h-3" />
              </button>

              <div className="ml-auto flex items-center gap-1">
                {onAskHelp && (
                  <button
                    onClick={e => { e.stopPropagation(); onAskHelp(task); }}
                    title="Ask for help"
                    className="text-[10px] px-1.5 py-0.5 rounded-lg font-medium text-amber-500 hover:bg-amber-50 flex items-center gap-0.5"
                  >
                    <HelpCircle className="w-2.5 h-2.5" />Help
                  </button>
                )}
                {rejectAction && (
                  <button
                    onClick={e => { e.stopPropagation(); onQuickStatus?.(task, rejectAction.status); }}
                    className={`text-[10px] px-2 py-0.5 rounded-lg font-medium transition-colors ${rejectAction.cls}`}
                  >
                    {rejectAction.label}
                  </button>
                )}
                {quickAction && (
                  <button
                    onClick={e => { e.stopPropagation(); onQuickStatus?.(task, quickAction.status); }}
                    className={`flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-lg font-medium transition-colors ${quickAction.cls}`}
                  >
                    {quickAction.label}<ArrowRight className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
});
