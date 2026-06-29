import type { Member, Task, User } from '../services/api';

export interface ProjectPermissions {
  canManageMembers: boolean;
  canCreateTask:    boolean;
  canEditTask:      boolean;
  canDeleteTask:    boolean;
  canComment:       boolean;
  canTickSubtask:   boolean;
  canDrag:          boolean;
  canManageProject: boolean;
  canAssignTask:    boolean; // only project managers / admins can assign tasks to others
  isManager:        boolean;
}

interface PermDef {
  canManageMembers: boolean;
  canCreateTask: boolean;
  canEditTask: boolean;
  canDeleteTask: boolean;
  canComment: boolean;
  canTickSubtask: boolean;
  canDrag: boolean;
  canManageProject: boolean;
  canAssignTask: boolean;
}

const PERMISSIONS_BY_LEVEL: Record<string, PermDef> = {
  viewer:      { canManageMembers:false, canCreateTask:false, canEditTask:false, canDeleteTask:false, canComment:false, canTickSubtask:false, canDrag:false, canManageProject:false, canAssignTask:false },
  contributor: { canManageMembers:false, canCreateTask:true,  canEditTask:true,  canDeleteTask:false, canComment:true,  canTickSubtask:true,  canDrag:true,  canManageProject:false, canAssignTask:false },
  editor:      { canManageMembers:false, canCreateTask:true,  canEditTask:true,  canDeleteTask:false, canComment:true,  canTickSubtask:true,  canDrag:true,  canManageProject:false, canAssignTask:false },
  manager:     { canManageMembers:true,  canCreateTask:true,  canEditTask:true,  canDeleteTask:true,  canComment:true,  canTickSubtask:true,  canDrag:true,  canManageProject:true,  canAssignTask:true  },
};

const HIERARCHY = ['viewer', 'contributor', 'editor', 'manager'];

function resolveLevel(level: string): PermDef {
  const idx = HIERARCHY.indexOf(level);
  if (idx < 0) return PERMISSIONS_BY_LEVEL.viewer;
  const merged = { ...PERMISSIONS_BY_LEVEL.viewer };
  for (let i = 0; i <= idx; i++) {
    Object.assign(merged, PERMISSIONS_BY_LEVEL[HIERARCHY[i]]);
  }
  return merged;
}

const ROLE_TO_LEVEL: Record<string, string> = {
  project_manager: 'manager',
  backend_dev:     'editor',
  frontend_dev:    'editor',
  db_engineer:     'editor',
  reviewer:        'editor',
  tester:          'editor',
  qa_tester:       'editor',
  documentalist:   'editor',
  analyst:         'editor',
};

export function computePermissions(
  user: User,
  member: Member | null | undefined,
): ProjectPermissions {
  if (user.system_role === 'admin') return { ...resolveLevel('manager'), isManager: true };

  if (!member) return { ...resolveLevel('viewer'), isManager: false };

  const roles = member.roles?.length ? member.roles : [member.role];
  if (roles.includes('project_manager')) return { ...resolveLevel('manager'), isManager: true };

  let maxLevel = 'viewer';
  for (const role of roles) {
    const level = ROLE_TO_LEVEL[role] || 'viewer';
    if (HIERARCHY.indexOf(level) > HIERARCHY.indexOf(maxLevel)) {
      maxLevel = level;
    }
  }

  if (member.permission_level && HIERARCHY.indexOf(member.permission_level) > HIERARCHY.indexOf(maxLevel)) {
    maxLevel = member.permission_level;
  }

  return { ...resolveLevel(maxLevel), isManager: false };
}

export function taskPermissions(
  base: ProjectPermissions,
  task: Task,
  userId: string,
): ProjectPermissions {
  // Managers / admins always have full rights — no further narrowing needed
  if (base.isManager) return base;

  const isCreator  = task.created_by === userId;
  const assigneeIds = task.assignee_ids?.length
    ? task.assignee_ids
    : (task.assignee_id ? [task.assignee_id] : []);
  const isAssignee = assigneeIds.includes(userId);

  // A creator who assigned the task to someone ELSE loses ownership.
  // The task now "belongs" to the assignee(s), not the creator.
  const creatorRetainsOwnership = isCreator && (assigneeIds.length === 0 || isAssignee);

  return {
    ...base,
    canEditTask:    base.canEditTask || creatorRetainsOwnership || isAssignee,
    canDeleteTask:  base.canDeleteTask || creatorRetainsOwnership,
    canComment:     base.canComment || isAssignee || isCreator,
    canTickSubtask: base.canTickSubtask || isAssignee,
    canDrag:        base.canDrag || isAssignee,
    // canAssignTask is NEVER granted by task context — only managers have it
  };
}

export const PERMISSION_LEVELS = [
  { value: 'viewer',      label: 'Viewer',      desc: 'Read-only',                          color: 'bg-gray-100 text-gray-600' },
  { value: 'contributor', label: 'Contributor',  desc: 'Create, edit, comment & drag tasks',  color: 'bg-blue-100 text-blue-600' },
  { value: 'editor',      label: 'Editor',       desc: 'Full task management',                color: 'bg-indigo-100 text-indigo-600' },
  { value: 'manager',     label: 'Manager',      desc: 'Full project access',                color: 'bg-purple-100 text-purple-700' },
];
