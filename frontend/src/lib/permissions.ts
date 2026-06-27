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
}

const PERMISSIONS_BY_LEVEL: Record<string, PermDef> = {
  viewer:      { canManageMembers:false, canCreateTask:false, canEditTask:false, canDeleteTask:false, canComment:false, canTickSubtask:false, canDrag:false, canManageProject:false },
  contributor: { canManageMembers:false, canCreateTask:false, canEditTask:false, canDeleteTask:false, canComment:true,  canTickSubtask:true,  canDrag:true,  canManageProject:false },
  editor:      { canManageMembers:false, canCreateTask:true,  canEditTask:true,  canDeleteTask:false, canComment:true,  canTickSubtask:true,  canDrag:true,  canManageProject:false },
  manager:     { canManageMembers:true,  canCreateTask:true,  canEditTask:true,  canDeleteTask:true,  canComment:true,  canTickSubtask:true,  canDrag:true,  canManageProject:true  },
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
  tester:          'contributor',
  qa_tester:       'contributor',
  documentalist:   'contributor',
  analyst:         'contributor',
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
  if (base.isManager) return base;
  const isCreator  = task.created_by === userId;
  const isAssignee = (task.assignee_ids || [task.assignee_id].filter(Boolean) as string[]).includes(userId);
  return {
    ...base,
    canEditTask:   base.canEditTask || isCreator || isAssignee,
    canDeleteTask: base.canDeleteTask || isCreator,
    canComment:    base.canComment || isAssignee,
    canTickSubtask: base.canTickSubtask || isAssignee,
    canDrag:       base.canDrag || isAssignee,
  };
}

export const PERMISSION_LEVELS = [
  { value: 'viewer',      label: 'Viewer',      desc: 'Read-only',                          color: 'bg-gray-100 text-gray-600' },
  { value: 'contributor', label: 'Contributor',  desc: 'Comment, tick subtasks & drag',      color: 'bg-blue-100 text-blue-600' },
  { value: 'editor',      label: 'Editor',       desc: 'Create & edit tasks',                color: 'bg-indigo-100 text-indigo-600' },
  { value: 'manager',     label: 'Manager',      desc: 'Full project access',                color: 'bg-purple-100 text-purple-700' },
];
