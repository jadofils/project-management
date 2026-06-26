const API = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

function token() { return localStorage.getItem('accessToken') || ''; }
function authHeaders() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }; }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...options, headers: { ...authHeaders(), ...(options.headers as Record<string,string> || {}) } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return text ? JSON.parse(text) : undefined as T;
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
  system_role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
}

export interface Project { id: string; name: string; description?: string; owner_id: string; status: string; created_at: string; }
export interface Task { id: string; project_id: string; title: string; description?: string; status: string; priority: string; phase?: string; assignee_id?: string; sort_order: number; due_date?: string; created_at: string; }
export interface Comment { id: string; task_id: string; user_id: string; content: string; created_at: string; }
export interface Issue { id: string; project_id: string; title: string; description?: string; status: string; priority: string; reported_by: string; created_at: string; }
export interface FeedbackItem { id: string; title: string; description?: string; category: string; screenshot_url?: string; status: string; created_at: string; }

export interface Member {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user?: User;
}

export interface Message {
  id: string;
  project_id: string;
  sender_id: string;
  content: string;
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
  createUser: (dto: { email: string; password: string; first_name: string; last_name: string; system_role?: string }) =>
    request<{ user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(dto) }),
  updateUser: (id: string, dto: Partial<User>) => request<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  deactivateUser: (id: string) => request<User>(`/users/${id}`, { method: 'DELETE' }),
  changePassword: (dto: { current_password: string; new_password: string }) =>
    request<{ ok: boolean }>('/auth/change-password', { method: 'POST', body: JSON.stringify(dto) }),

  // Mail (admin / PM)
  sendMail: (dto: { to: any; subject: string; message: string }) =>
    request<{ sent: number; recipients: string[] }>('/mail/send', { method: 'POST', body: JSON.stringify(dto) }),

  // Projects
  getProjects: () => request<Project[]>('/projects'),
  createProject: (dto: { name: string; description?: string }) => request<Project>('/projects', { method: 'POST', body: JSON.stringify(dto) }),
  deleteProject: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),

  // Tasks
  getTasks: (projectId: string) => request<Task[]>(`/tasks/project/${projectId}`),
  createTask: (dto: Partial<Task> & { project_id: string; title: string }) => request<Task>('/tasks', { method: 'POST', body: JSON.stringify(dto) }),
  updateTask: (id: string, dto: Partial<Task>) => request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  reorderTasks: (orders: { id: string; sort_order: number; status: string }[]) =>
    request<void>('/tasks/reorder', { method: 'POST', body: JSON.stringify({ orders }) }),
  deleteTask: (id: string) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),

  // Comments
  getComments: (taskId: string) => request<Comment[]>(`/tasks/${taskId}/comments`),
  createComment: (taskId: string, content: string) =>
    request<Comment>(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  deleteComment: (commentId: string) => request<void>(`/tasks/comments/${commentId}`, { method: 'DELETE' }),

  // Members
  getMembers: (projectId: string) => request<Member[]>(`/projects/${projectId}/members`),
  addMember: (projectId: string, userId: string, role: string) =>
    request<Member>(`/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify({ user_id: userId, role }) }),
  updateMemberRole: (projectId: string, userId: string, role: string) =>
    request<Member>(`/projects/${projectId}/members/${userId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeMember: (projectId: string, userId: string) =>
    request<void>(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),

  // Messages
  getMessages: (projectId: string) => request<Message[]>(`/projects/${projectId}/messages`),
  sendMessage: (projectId: string, content: string) =>
    request<Message>(`/projects/${projectId}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),

  // Issues
  getIssues: (projectId: string) => request<Issue[]>(`/issues/project/${projectId}`),
  createIssue: (dto: { project_id: string; title: string; description?: string; priority?: string }) =>
    request<Issue>('/issues', { method: 'POST', body: JSON.stringify(dto) }),
  updateIssue: (id: string, status: string) => request<Issue>(`/issues/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Feedback
  getFeedback: () => request<{ data: FeedbackItem[] }>('/feedback').then(r => r.data),
  createFeedback: (dto: { title: string; description?: string; category?: string; page_url?: string; screenshot?: string }) =>
    request<FeedbackItem>('/feedback', { method: 'POST', body: JSON.stringify(dto) }),
  assignFeedback: (id: string, assignedTo: string) =>
    request<FeedbackItem>(`/feedback/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ assigned_to: assignedTo }) }),
};

export function isAuthenticated() { return !!localStorage.getItem('accessToken'); }
export function logout() { localStorage.removeItem('accessToken'); }
export function saveToken(t: string) { localStorage.setItem('accessToken', t); }

export function userInitials(u: User) {
  return `${u.first_name[0] || ''}${u.last_name[0] || ''}`.toUpperCase();
}

export function userName(u: User) {
  return `${u.first_name} ${u.last_name}`.trim() || u.email;
}
