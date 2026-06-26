const API = import.meta.env.VITE_API_URL || 'http://localhost:4001/api';

function token() { return localStorage.getItem('accessToken') || ''; }
function headers() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` }; }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...options, headers: { ...headers(), ...options.headers } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({ message: 'Request failed' }))).message || `HTTP ${res.status}`);
  if (res.status === 204 || options.method === 'DELETE') return undefined as T;
  return res.json();
}

export interface Project { id: string; name: string; description?: string; owner_id: string; status: string; created_at: string; }
export interface Task { id: string; project_id: string; title: string; description?: string; status: string; priority: string; phase?: string; assignee_id?: string; sort_order: number; due_date?: string; created_at: string; }
export interface Comment { id: string; task_id: string; user_id: string; content: string; created_at: string; }
export interface Issue { id: string; project_id: string; title: string; description?: string; status: string; priority: string; reported_by: string; created_at: string; }
export interface FeedbackItem { id: string; title: string; description?: string; category: string; screenshot_url?: string; status: string; created_at: string; }
export interface UserProfile { id: string; email: string; roles: string[]; cached_profile?: { first_name: string; last_name: string; avatar_url?: string } | null; }
export interface CachedUser { id: string; user_id: string; first_name: string; last_name: string; email: string; avatar_url?: string | null; }

export const api = {
  getMe: () => request<UserProfile>('/auth/me'),
  getUsers: () => request<CachedUser[]>('/auth/users'),
  syncProfile: (dto: { first_name?: string; last_name?: string; email?: string; avatar_url?: string }) =>
    request<UserProfile>('/auth/sync', { method: 'POST', body: JSON.stringify(dto) }),

  getProjects: () => request<Project[]>('/projects'),
  createProject: (dto: { name: string; description?: string }) => request<Project>('/projects', { method: 'POST', body: JSON.stringify(dto) }),
  deleteProject: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),

  getTasks: (projectId: string) => request<Task[]>(`/tasks/project/${projectId}`),
  createTask: (dto: Partial<Task> & { project_id: string; title: string }) => request<Task>('/tasks', { method: 'POST', body: JSON.stringify(dto) }),
  updateTask: (id: string, dto: Partial<Task>) => request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(dto) }),
  reorderTasks: (orders: { id: string; sort_order: number; status: string }[]) =>
    request<void>('/tasks/reorder', { method: 'POST', body: JSON.stringify({ orders }) }),
  deleteTask: (id: string) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),

  getComments: (taskId: string) => request<Comment[]>(`/tasks/${taskId}/comments`),
  createComment: (taskId: string, content: string) =>
    request<Comment>(`/tasks/${taskId}/comments`, { method: 'POST', body: JSON.stringify({ content }) }),
  deleteComment: (commentId: string) => request<void>(`/tasks/comments/${commentId}`, { method: 'DELETE' }),

  getIssues: (projectId: string) => request<Issue[]>(`/issues/project/${projectId}`),
  createIssue: (dto: { project_id: string; title: string; description?: string; priority?: string }) => request<Issue>('/issues', { method: 'POST', body: JSON.stringify(dto) }),
  updateIssue: (id: string, status: string) => request<Issue>(`/issues/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  getFeedback: () => request<{ data: FeedbackItem[] }>('/feedback').then(r => r.data),
  createFeedback: (dto: { title: string; description?: string; category?: string; page_url?: string; screenshot?: string }) =>
    request<FeedbackItem>('/feedback', { method: 'POST', body: JSON.stringify(dto) }),
  assignFeedback: (id: string, assignedTo: string) =>
    request<FeedbackItem>(`/feedback/${id}/assign`, { method: 'PATCH', body: JSON.stringify({ assigned_to: assignedTo }) }),
};

export function isAuthenticated() { return !!token(); }
