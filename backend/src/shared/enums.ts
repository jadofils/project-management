export const TaskStatus = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  REWORK: 'rework',
  DONE: 'done',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const ProjectRole = {
  PROJECT_MANAGER: 'project_manager',
  BACKEND_DEV: 'backend_dev',
  FRONTEND_DEV: 'frontend_dev',
  DOCUMENTALIST: 'documentalist',
  TESTER: 'tester',
  QA_TESTER: 'qa_tester',
  ANALYST: 'analyst',
  DB_ENGINEER: 'db_engineer',
  REVIEWER: 'reviewer',
} as const;
export type ProjectRole = (typeof ProjectRole)[keyof typeof ProjectRole];

export const SystemRole = {
  ADMIN: 'admin',
  USER: 'user',
} as const;
export type SystemRole = (typeof SystemRole)[keyof typeof SystemRole];

export const PermissionLevel = {
  VIEWER: 'viewer',
  CONTRIBUTOR: 'contributor',
  EDITOR: 'editor',
  MANAGER: 'manager',
} as const;
export type PermissionLevel = (typeof PermissionLevel)[keyof typeof PermissionLevel];

export const ProjectStatus = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const InvitationStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const;
export type InvitationStatus = (typeof InvitationStatus)[keyof typeof InvitationStatus];

export const FeedbackStatus = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;
export type FeedbackStatus = (typeof FeedbackStatus)[keyof typeof FeedbackStatus];

export const EmailType = {
  INVITATION_NEW: 'invitation_new',
  INVITATION_EXISTING: 'invitation_existing',
  WELCOME: 'welcome',
  TASK_ASSIGNED: 'task_assigned',
  TASK_UPDATED: 'task_updated',
  TASK_COMPLETED: 'task_completed',
  TASK_REVIEW: 'task_review',
  COMMENT_ADDED: 'comment_added',
  PHASE_TASK_CREATED: 'phase_task_created',
  CUSTOM: 'custom',
  GENERIC: 'generic',
} as const;
export type EmailType = (typeof EmailType)[keyof typeof EmailType];

export const MessageType = {
  TEXT: 'text',
  HELP_REQUEST: 'help_request',
  IMAGE: 'image',
  FILE: 'file',
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export const DevPhase = {
  BACKEND: 'backend',
  FRONTEND: 'frontend',
  DOCUMENTATION: 'documentation',
  QA_TESTING: 'qa_testing',
  DATA_ANALYST: 'data_analyst',
} as const;
export type DevPhase = (typeof DevPhase)[keyof typeof DevPhase];

export const IssueStatus = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
} as const;
export type IssueStatus = (typeof IssueStatus)[keyof typeof IssueStatus];
export const IssuePriority = TaskPriority;
export type IssuePriority = TaskPriority;

export const EmailStatus = {
  SENT: 'sent',
  FAILED: 'failed',
} as const;
export type EmailStatus = (typeof EmailStatus)[keyof typeof EmailStatus];

export const PHASE_TO_ROLES: Record<DevPhase, ProjectRole[]> = {
  [DevPhase.BACKEND]: [ProjectRole.BACKEND_DEV],
  [DevPhase.FRONTEND]: [ProjectRole.FRONTEND_DEV],
  [DevPhase.DOCUMENTATION]: [ProjectRole.DOCUMENTALIST],
  [DevPhase.QA_TESTING]: [ProjectRole.QA_TESTER, ProjectRole.TESTER],
  [DevPhase.DATA_ANALYST]: [ProjectRole.ANALYST],
};

export const ROLE_PERMISSION_LEVEL: Record<ProjectRole, PermissionLevel> = {
  [ProjectRole.PROJECT_MANAGER]: PermissionLevel.MANAGER,
  [ProjectRole.BACKEND_DEV]: PermissionLevel.EDITOR,
  [ProjectRole.FRONTEND_DEV]: PermissionLevel.EDITOR,
  [ProjectRole.DB_ENGINEER]: PermissionLevel.EDITOR,
  [ProjectRole.TESTER]: PermissionLevel.CONTRIBUTOR,
  [ProjectRole.QA_TESTER]: PermissionLevel.CONTRIBUTOR,
  [ProjectRole.REVIEWER]: PermissionLevel.EDITOR,
  [ProjectRole.DOCUMENTALIST]: PermissionLevel.CONTRIBUTOR,
  [ProjectRole.ANALYST]: PermissionLevel.CONTRIBUTOR,
};

export const PERMISSION_HIERARCHY: PermissionLevel[] = [
  PermissionLevel.VIEWER,
  PermissionLevel.CONTRIBUTOR,
  PermissionLevel.EDITOR,
  PermissionLevel.MANAGER,
];

export function getEffectivePermission(role: ProjectRole): PermissionLevel {
  return ROLE_PERMISSION_LEVEL[role] || PermissionLevel.VIEWER;
}

export function getHighestPermission(roles: ProjectRole[]): PermissionLevel {
  if (roles.length === 0) return PermissionLevel.VIEWER;
  let highest: PermissionLevel = PermissionLevel.VIEWER;
  for (const role of roles) {
    const level = getEffectivePermission(role);
    if (PERMISSION_HIERARCHY.indexOf(level) > PERMISSION_HIERARCHY.indexOf(highest)) {
      highest = level;
    }
  }
  return highest;
}

export const PROJECT_ROLES = Object.values(ProjectRole) as ProjectRole[];
export const ALL_VALID_ROLES = PROJECT_ROLES;
