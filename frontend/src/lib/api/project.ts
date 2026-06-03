import request from '../request';

export interface Project {
  id: number;
  name: string;
  description: string;
  status: 'active' | 'archived' | 'completed';
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  status_display: string;
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
  return request.get<PaginatedResponse<Project>>('/api/projects/', { params });
}

export function getProject(id: number) {
  return request.get<Project>(`/api/projects/${id}/`);
}

export function createProject(data: Partial<Project>) {
  return request.post<Project>('/api/projects/', data);
}

export function updateProject(id: number, data: Partial<Project>) {
  return request.put<Project>(`/api/projects/${id}/`, data);
}

export function deleteProject(id: number) {
  return request.delete(`/api/projects/${id}/`);
}
