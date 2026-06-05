import request from '../request';

export interface Project {
  id: number;
  name: string;
  description: string;
  status: 'active' | 'archived' | 'completed';
  start_date: string | null;
  end_date: string | null;
  created_by: number | null;
  creator_name: string;
  member_count: number;
  created_at: string;
  updated_at: string;
  status_display: string;
}

export interface ProjectMember {
  id: number;
  project_id: number;
  user_id: number;
  role: 'admin' | 'member' | 'viewer';
  role_display: string;
  username: string;
  created_at: string | null;
}

export interface ProjectListParams {
  search?: string;
  status?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export function getProjects(params?: ProjectListParams) {
  return request.get<PaginatedResponse<Project>>('/api/projects', { params });
}

export function getProject(id: number) {
  return request.get<Project>(`/api/projects/${id}`);
}

export function createProject(data: Partial<Project> & { member_ids?: number[] }) {
  return request.post<Project>('/api/projects', data);
}

export function updateProject(id: number, data: Partial<Project>) {
  return request.put<Project>(`/api/projects/${id}`, data);
}

export function deleteProject(id: number) {
  return request.delete(`/api/projects/${id}`);
}

// 项目成员 API
export function getProjectMembers(projectId: number) {
  return request.get<ProjectMember[]>(`/api/projects/${projectId}/members`);
}

export function addProjectMember(projectId: number, data: { user_id: number; role?: string }) {
  return request.post<ProjectMember>(`/api/projects/${projectId}/members`, data);
}

export function removeProjectMember(projectId: number, userId: number) {
  return request.delete(`/api/projects/${projectId}/members/${userId}`);
}

export function updateProjectMemberRole(projectId: number, userId: number, role: string) {
  return request.put<ProjectMember>(`/api/projects/${projectId}/members/${userId}`, { role });
}
