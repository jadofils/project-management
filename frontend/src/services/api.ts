const API = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

function token() { return localStorage.getItem('accessToken') || ''; }
function authHeaders() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }; }

const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: 'Bad request — please check your input.',
  401: 'Session expired — please sign in again.',
  403: 'You don\'t have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'A conflict occurred — this resource may already exist.',
  422: 'Validation failed — please check the submitted data.',
  429: 'Too many requests — please wait a moment and try again.',
  500: 'Server error — please try again later.',
  502: 'Server is temporarily unavailable — please try again shortly.',
  503: 'Service unavailable — the server may be starting up.',
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(`${API}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { ...authHeaders(), ...(options.headers as Record<string, string> || {}) },
    });
    clearTimeout(timer);

    if (!res.ok) {
      let message: string;
      try {
        const body = await res.json();
        // NestJS returns { message, statusCode, error } — prefer the message field
        message = Array.isArray(body.message)
          ? body.message.join('; ')
          : (body.message || body.error || HTTP_STATUS_MESSAGES[res.status] || `Request failed (${res.status})`);
      } catch {
        message = HTTP_STATUS_MESSAGES[res.status] || `Request failed (${res.status})`;
      }
      const err: any = new Error(message);
      err.statusCode = res.status;
      throw err;
    }
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return text ? JSON.parse(text) : (undefined as T);
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('Server is waking up from sleep mode — please wait a moment and try again.');
    }
    // Network failure (offline, DNS, etc.)
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Cannot reach server — please check your connection.');
    }
    throw err;
  }
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  phone?: string | null;
  system_role: 'admin' | 'user';
  is_active: boolean;
  must_change_password?: boolean;
  created_at: string;
}

export interface Invitation {
  id: string;
  project_id: string;
  email: string;
  role: string;
  permission_level: string;
  status: string;
  expires_at: string | null;
  created_at: string;
  project_name?: string;
  accepted_by_name?: string | null;
}

export interface EmailLogEntry {
  id: string;
  type: string;
  sender_id: string | null;
  recipient: string;
  subject: string;
  project_id: string | null;
  related_id: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface InvitationInfo {
  token: string;
  email: string;
  role: string;
  permission_level: string;
  project: { id: string; name: string; description?: string } | null;
  inviterName: string | null;
  expiresAt: string | null;
  emailExists: boolean;
}

export interface Project { id: string; name: string; description?: string; owner_id: string; division_id?: string | null; company_name?: string | null; company_email?: string | null; type: string; division_name?: string | null; status: string; created_at: string; updated_at: string; }

export interface AdminStats {
  totalProjects: number;
  activeProjects: number;
  disabledProjects: number;
  companyProjects: number;
  individualProjects: number;
  totalUsers: number;
  activeUsers: number;
  totalTasks: number;
  tasksByStatus: Record<string, number>;
  projects: Array<{ id: string; name: string; status: string; owner_id: string; created_at: string; member_count: string; task_count: string; }>;
  users: User[];
}
export interface Task {
  id: string; project_id: string; title: string; description?: string;
  status: string; priority: string; phase?: string;
  assignee_id?: string; assignee_ids?: string[];
  created_by?: string;
  module?: string;
  subtask_count: number; subtasks_done: number;
  sort_order: number; due_date?: string; original_due_date?: string;
  completed_at?: string; completed_by?: string;
  liked_by?: string[] | null;
  created_at: string; updated_at?: string;
}

export interface AssignmentLog {
  id: string;
  task_id: string;
  project_id: string;
  task_title: string;
  user_id: string | null;
  action: 'assigned' | 'unassigned';
  changed_by: string | null;
  note: string | null;
  created_at: string;
  user?: { id: string; first_name: string; last_name: string; email: string } | null;
  changedByUser?: { id: string; first_name: string; last_name: string; email: string } | null;
}

export interface UserTaskStats {
  totalAssigned: number;
  todo: number; in_progress: number; review: number; rework: number; done: number;
  overdue: number; extendedDeadlines: number;
  completedOnTime: number; completedLate: number;
}

export interface TeamMemberStats extends UserTaskStats {
  user: User; userId: string; role: string; roles: string[];
  completionRate: number; onTimeRate: number | null;
}

export interface ContributionTask {
  id: string;
  title: string;
  project_id: string;
  project_name: string;
  completed_by: string | null;
  confirmed_by_name: string | null;
}

export interface ContributionDay {
  date: string;
  count: number;
  tasks: ContributionTask[];
}

export interface ProjectStats {
  myStats: UserTaskStats;
  myTasks: Task[];
  overdueTasks: Task[];
  myLogs: AssignmentLog[];
  myChangedByLogs: AssignmentLog[];
  // PM/admin only:
  teamStats?: TeamMemberStats[];
  projectOverdue?: { task: Task; daysOverdue: number; assignees: User[] }[];
  projectStatusBreakdown?: Record<string, number>;
  recentLogs?: AssignmentLog[];
}

export interface Subtask {
  id: string; task_id: string; title: string;
  completed: boolean; completed_by?: string;
  sort_order: number; created_at: string;
}
export interface Comment { id: string; task_id: string; user_id: string; content: string; created_at: string; }
export interface Issue { id: string; project_id: string; title: string; description?: string; status: string; priority: string; reported_by: string; created_at: string; }
export interface FeedbackItem {
  id: string;
  user_id: string;
  project_id?: string | null;
  title: string;
  description?: string;
  category: string;
  screenshot_url?: string;
  status: string;
  reply_count: number;
  assigned_to?: string;
  created_at: string;
}

export interface Member {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  roles: string[];
  permission_level: 'viewer' | 'contributor' | 'editor' | 'manager';
  joined_at: string;
  user?: User;
}

export interface FeedbackReply {
  id: string;
  feedback_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface Message {
  id: string;
  project_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'help_request' | 'image' | 'file';
  file_url?: string | null;
  file_name?: string | null;
  reply_to_id?: string | null;
  task_id?: string | null;
  created_at: string;
  sender?: User;
}

// ── API ──────────────────────────────────────────────────────────────────────
export const api = {
  // Auth
  register: (dto: { email: string; password: string; first_name: string; last_name: string }) =>
    request<{ user: User; token: string }>('/auth/register', { method: 'POST', body: JSON.stringify(dto) }),
  login: (dto: { email: string; password: string }) =>
    request<{ user: User; token: string }>('/auth/login', { method: 'POST', body: JSON.stringify(dto) }),
  getMe: () => request<User>('/auth/me'),

  // Users (admin / PM)
  getUsers: () => request<User[]>('/users'),
  createUser: (dto: { email: string; first_name: string; last_name: string; system_role?: string }) =>
    request<{ user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(dto) }),
  updateUser: (id: string, dto: Partial<User>) => request<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  deactivateUser: (id: string) => request<User>(`/users/${id}`, { method: 'DELETE' }),
  permanentDeleteUser: (id: string) => request<{ ok: boolean; deleted: string }>(`/users/${id}/permanent`, { method: 'DELETE' }),
  changePassword: (dto: { current_password: string; new_password: string }) =>
    request<{ ok: boolean }>('/auth/change-password', { method: 'POST', body: JSON.stringify(dto) }),

  // Mail (admin / PM)
  sendMail: (dto: { to: any; subject: string; message: string }) =>
    request<{ sent: number; recipients: string[] }>('/mail/send', { method: 'POST', body: JSON.stringify(dto) }),

  // Projects
  getProjects: () => request<Project[]>('/projects'),
  createProject: (dto: { name: string; description?: string; division_id?: string; company_name?: string; company_email?: string; type?: string }) => request<Project>('/projects', { method: 'POST', body: JSON.stringify(dto) }),
  setProjectStatus: (id: string, status: 'active' | 'disabled') =>
    request<Project>(`/projects/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteProject: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
  getAdminStats: () => request<AdminStats>('/admin/stats'),

  // Tasks
  getTasks: (projectId: string) => request<Task[]>(`/tasks/project/${projectId}`),
  createTask: (dto: Partial<Task> & { project_id: string; title: string; module?: string }) => request<Task>('/tasks', { method: 'POST', body: JSON.stringify(dto) }),
  updateTask: (id: string, dto: Partial<Task>) => request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  reorderTasks: (orders: { id: string; sort_order: number; status: string }[]) =>
    request<void>('/tasks/reorder', { method: 'POST', body: JSON.stringify({ orders }) }),
  deleteTask: (id: string) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
  toggleLike: (taskId: string) => request<Task>(`/tasks/${taskId}/like`, { method: 'PATCH' }),

  // Stats
  getProjectStats: (projectId: string) => request<ProjectStats>(`/projects/${projectId}/stats`),

  // Subtasks
  getSubtasks: (taskId: string) => request<Subtask[]>(`/tasks/${taskId}/subtasks`),
  createSubtask: (taskId: string, title: string) =>
    request<Subtask>(`/tasks/${taskId}/subtasks`, { method: 'POST', body: JSON.stringify({ title }) }),
  updateSubtask: (taskId: string, id: string, dto: { title?: string; completed?: boolean }) =>
    request<Subtask>(`/tasks/${taskId}/subtasks/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  deleteSubtask: (taskId: string, id: string) =>
    request<void>(`/tasks/${taskId}/subtasks/${id}`, { method: 'DELETE' }),
  reorderSubtasks: (taskId: string, orders: { id: string; sort_order: number }[]) =>
    request<void>(`/tasks/${taskId}/subtasks/reorder`, { method: 'POST', body: JSON.stringify({ orders }) }),

  // Comments
  getComments: (taskId: string) => request<Comment[]>(`/tasks/${taskId}/comments`),
  createComment: (taskId: string, content: string) =>
    request<Comment>(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  deleteComment: (commentId: string) => request<void>(`/tasks/comments/${commentId}`, { method: 'DELETE' }),

  // Members
  getMembers: (projectId: string) => request<Member[]>(`/projects/${projectId}/members`),
  addMember: (projectId: string, userId: string, role: string, roles?: string[], permission_level?: string) =>
    request<Member>(`/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify({ user_id: userId, role, roles, permission_level }) }),
  addMembersBulk: (projectId: string, userIds: string[], role: string, permission_level?: string) =>
    request<Member[]>(`/projects/${projectId}/members/bulk`, { method: 'POST', body: JSON.stringify({ user_ids: userIds, role, permission_level }) }),
  updateMember: (projectId: string, userId: string, dto: { role?: string; roles?: string[]; permission_level?: string }) =>
    request<Member>(`/projects/${projectId}/members/${userId}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  removeMember: (projectId: string, userId: string) =>
    request<void>(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),

  // Messages
  getMessages: (projectId: string) => request<Message[]>(`/projects/${projectId}/messages`),
  sendMessage: (projectId: string, data: {
    content: string;
    type?: string;
    file_url?: string;
    file_name?: string;
    reply_to_id?: string;
    task_id?: string;
  }) => request<Message>(`/projects/${projectId}/messages`, { method: 'POST', body: JSON.stringify(data) }),

  // Issues
  getIssues: (projectId: string) => request<Issue[]>(`/issues/project/${projectId}`),
  createIssue: (dto: { project_id: string; title: string; description?: string; priority?: string }) =>
    request<Issue>('/issues', { method: 'POST', body: JSON.stringify(dto) }),
  updateIssue: (id: string, status: string) => request<Issue>(`/issues/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Contributions
  getMyContributions: (year?: number) =>
    request<ContributionDay[]>(`/contributions${year ? `?year=${year}` : ''}`),
  getUserContributions: (userId: string, year?: number) =>
    request<ContributionDay[]>(`/contributions/user/${userId}${year ? `?year=${year}` : ''}`),
  getProjectContributions: (projectId: string, year?: number) =>
    request<Record<string, ContributionDay[]>>(`/contributions/project/${projectId}${year ? `?year=${year}` : ''}`),
  getSystemContributionSummary: (year?: number) =>
    request<{ date: string; count: number }[]>(`/contributions/system/summary${year ? `?year=${year}` : ''}`),

  // Invitations
  inviteByEmail: (projectId: string, email: string, role: string, permission_level?: string) =>
    request<{ status: string; message: string; userExists?: boolean; user?: User }>(
      `/projects/${projectId}/invite`, { method: 'POST', body: JSON.stringify({ email, role, permission_level }) }),
  getInvitations: (projectId: string) => request<Invitation[]>(`/projects/${projectId}/invitations`),
  cancelInvitation: (projectId: string, invId: string) =>
    request<{ ok: boolean }>(`/projects/${projectId}/invitations/${invId}`, { method: 'DELETE' }),
  resendInvitation: (projectId: string, invId: string) =>
    request<{ ok: boolean; message: string }>(`/projects/${projectId}/invitations/${invId}/resend`, { method: 'POST' }),
  getAllInvitations: (page?: number, limit?: number) =>
    request<{ data: Invitation[]; total: number; page: number; limit: number; totalPages: number }>(
      `/invitations?page=${page || 1}&limit=${limit || 50}`,
    ),
  getInvitationByToken: (token: string) => request<InvitationInfo>(`/invitations/${token}`),
  acceptInvitation: (token: string) =>
    request<{ ok: boolean; project_id: string }>(`/invitations/${token}/accept`, { method: 'POST' }),
  registerAndAccept: (token: string, dto: { first_name: string; last_name: string; password: string }) =>
    request<{ user: User; token: string; project_id: string }>(`/invitations/${token}/register`, { method: 'POST', body: JSON.stringify(dto) }),

  // Feedback
  getFeedback: (projectId?: string) => request<{ data: FeedbackItem[]; total: number; page: number; limit: number; totalPages: number }>(
    `/feedback${projectId ? `?project_id=${projectId}` : ''}`,
  ).then(r => r),
  getFeedbackById: (id: string) => request<FeedbackItem>(`/feedback/${id}`),
  createFeedback: (dto: { title: string; description?: string; category?: string; page_url?: string; screenshot?: string; project_id?: string }) =>
    request<FeedbackItem>('/feedback', { method: 'POST', body: JSON.stringify(dto) }),
  getFeedbackReplies: (id: string) => request<FeedbackReply[]>(`/feedback/${id}/replies`),
  addFeedbackReply: (id: string, content: string) =>
    request<FeedbackReply>(`/feedback/${id}/replies`, { method: 'POST', body: JSON.stringify({ content }) }),
  assignFeedback: (id: string, assignedTo: string) =>
    request<FeedbackItem>(`/feedback/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ assigned_to: assignedTo }) }),

  // Email logs
  getEmailLogs: (params?: { type?: string; project_id?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.project_id) qs.set('project_id', params.project_id);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return request<{ data: EmailLogEntry[]; total: number; page: number; limit: number; totalPages: number }>(
      `/email-logs?${qs.toString()}`,
    );
  },
  getInvitationLogs: (invitationId: string) => request<EmailLogEntry[]>(`/email-logs/invitation/${invitationId}`),

  // Organization
  getOrgChart: () => request<any[]>('/org/chart'),
  getDivisions: () => request<any[]>('/org/divisions'),
  createDivision: (dto: any) => request<any>('/org/divisions', { method: 'POST', body: JSON.stringify(dto) }),
  updateDivision: (id: string, dto: any) => request<any>(`/org/divisions/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  deleteDivision: (id: string) => request<any>(`/org/divisions/${id}`, { method: 'DELETE' }),
  getDepartments: (divisionId?: string) => request<any[]>(`/org/departments${divisionId ? `?division_id=${divisionId}` : ''}`),
  createDepartment: (dto: any) => request<any>('/org/departments', { method: 'POST', body: JSON.stringify(dto) }),
  updateDepartment: (id: string, dto: any) => request<any>(`/org/departments/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  deleteDepartment: (id: string) => request<any>(`/org/departments/${id}`, { method: 'DELETE' }),
  getPositions: (divisionId?: string) => request<any[]>(`/org/positions${divisionId ? `?division_id=${divisionId}` : ''}`),
  createPosition: (dto: any) => request<any>('/org/positions', { method: 'POST', body: JSON.stringify(dto) }),
  updatePosition: (id: string, dto: any) => request<any>(`/org/positions/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  deletePosition: (id: string) => request<any>(`/org/positions/${id}`, { method: 'DELETE' }),
  getEmployees: (departmentId?: string) => request<any[]>(`/org/employees${departmentId ? `?department_id=${departmentId}` : ''}`),
  getEmployee: (userId: string) => request<any>(`/org/employees/${userId}`),
  upsertEmployee: (userId: string, dto: any) => request<any>(`/org/employees/${userId}`, { method: 'POST', body: JSON.stringify(dto) }),

  // Attendance
  generateAttendanceToken: () => request<{ token: string; hash: string; expires_at: string }>('/attendance/token'),
  scanAttendance: (dto: { token: string; hash: string; scanner_ip?: string; office_id?: string; lat?: number; lng?: number }) =>
    request<any>('/attendance/scan', { method: 'POST', body: JSON.stringify(dto) }),
  getTodayAttendance: () => request<any>('/attendance/today'),
  getAttendanceRecords: (params?: { user_id?: string; from?: string; to?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.user_id) qs.set('user_id', params.user_id);
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return request<any>(`/attendance/records?${qs.toString()}`);
  },
  getOffices: () => request<any[]>('/attendance/offices'),
  createOffice: (dto: any) => request<any>('/attendance/offices', { method: 'POST', body: JSON.stringify(dto) }),
  callIvr: (callerId: string, digits?: string) =>
    request<string>(`/attendance/ivr?From=${encodeURIComponent(callerId)}&Digits=${digits || ''}`),

  // Leave
  getLeaveTypes: () => request<any[]>('/leave/types'),
  createLeaveType: (dto: any) => request<any>('/leave/types', { method: 'POST', body: JSON.stringify(dto) }),
  deleteLeaveType: (id: string) => request<any>(`/leave/types/${id}`, { method: 'DELETE' }),
  getLeaveBalances: () => request<any[]>('/leave/balances'),
  getLeaveRequests: (userId?: string, status?: string) => {
    const qs = new URLSearchParams();
    if (userId) qs.set('user_id', userId);
    if (status) qs.set('status', status);
    return request<any[]>(`/leave/requests?${qs.toString()}`);
  },
  createLeaveRequest: (dto: { leave_type_id: string; start_date: string; end_date: string; reason?: string }) =>
    request<any>('/leave/requests', { method: 'POST', body: JSON.stringify(dto) }),
  approveLeaveRequest: (id: string) => request<any>(`/leave/requests/${id}/approve`, { method: 'PATCH' }),
  rejectLeaveRequest: (id: string, reason?: string) =>
    request<any>(`/leave/requests/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),

  // Recruitment
  getJobPostings: (status?: string) => request<any[]>(`/recruitment/postings${status ? `?status=${status}` : ''}`),
  createJobPosting: (dto: any) => request<any>('/recruitment/postings', { method: 'POST', body: JSON.stringify(dto) }),
  updateJobPosting: (id: string, dto: any) => request<any>(`/recruitment/postings/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  deleteJobPosting: (id: string) => request<any>(`/recruitment/postings/${id}`, { method: 'DELETE' }),
  getApplications: (postingId?: string, status?: string) => {
    const qs = new URLSearchParams();
    if (postingId) qs.set('posting_id', postingId);
    if (status) qs.set('status', status);
    return request<any[]>(`/recruitment/applications?${qs.toString()}`);
  },
  createApplication: (dto: any) => request<any>('/recruitment/applications', { method: 'POST', body: JSON.stringify(dto) }),
  updateApplication: (id: string, dto: any) => request<any>(`/recruitment/applications/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  deleteApplication: (id: string) => request<any>(`/recruitment/applications/${id}`, { method: 'DELETE' }),
};

export function isAuthenticated() { return !!localStorage.getItem('accessToken'); }
export function logout() { localStorage.removeItem('accessToken'); }
export function saveToken(t: string) { localStorage.setItem('accessToken', t); }

// Ping the backend health endpoint until it responds, then stop.
// On Render free tier, server sleeps after inactivity and takes 30-60s to wake.
export function wakeUpServer(onAwake?: () => void): () => void {
  let stopped = false;
  let attempts = 0;

  const ping = async () => {
    if (stopped) return;
    try {
      const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(30_000) });
      if (res.ok) { onAwake?.(); return; }
    } catch { /* server still sleeping */ }
    attempts++;
    if (!stopped) setTimeout(ping, attempts < 5 ? 3_000 : 8_000); // Fast retry first 5, then slower
  };

  ping();
  return () => { stopped = true; };
};

export function userInitials(u: User) {
  return `${u.first_name[0] || ''}${u.last_name[0] || ''}`.toUpperCase();
}

export function userName(u: User) {
  return `${u.first_name} ${u.last_name}`.trim() || u.email;
}
