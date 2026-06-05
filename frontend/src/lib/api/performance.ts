/** 性能测试模块 - API 封装 */
import request from '@/lib/request';

// ====== 类型定义 ======

export interface PerformanceScene {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  scenario_type: string;
  config?: Record<string, unknown>;
  status: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface JMXFile {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  file_path: string;
  file_size: number;
  created_by: number;
  created_at: string;
}

export interface PerformanceExecution {
  id: number;
  scene_id: number;
  status: string;
  config_snapshot?: Record<string, unknown>;
  concurrent_users?: number;
  total_requests?: number;
  total_duration_ms?: number;
  avg_response_time_ms?: number;
  p50_response_time_ms?: number;
  p90_response_time_ms?: number;
  p95_response_time_ms?: number;
  p99_response_time_ms?: number;
  error_rate?: number;
  throughput?: number;
  error_message?: string;
  created_by?: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface PerformanceReport {
  id: number;
  execution_id: number;
  name: string;
  summary?: string;
  content?: Record<string, unknown>;
  created_at: string;
}

export interface PaginatedResponse<T> {
  count: number;
  results: T[];
}

// ====== 场景管理 ======

export function getScenes(params: {
  project_id: number;
  status?: string;
  search?: string;
  page?: number;
  page_size?: number;
}) {
  return request.get<PaginatedResponse<PerformanceScene>>('/api/performance/scenes', { params });
}

export function getScene(sceneId: number) {
  return request.get<PerformanceScene>(`/api/performance/scenes/${sceneId}`);
}

export function createScene(projectId: number, data: {
  name: string; description?: string; scenario_type?: string; config?: Record<string, unknown>;
}) {
  return request.post<PerformanceScene>('/api/performance/scenes', data, { params: { project_id: projectId } });
}

export function updateScene(sceneId: number, data: Partial<{
  name: string; description: string; scenario_type: string; config: Record<string, unknown>; status: string;
}>) {
  return request.put<PerformanceScene>(`/api/performance/scenes/${sceneId}`, data);
}

export function deleteScene(sceneId: number) {
  return request.delete(`/api/performance/scenes/${sceneId}`);
}

// ====== JMX 文件 ======

export function uploadJMXFile(projectId: number, file: File, description?: string) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<JMXFile>('/api/performance/jmx-files/upload', formData, {
    params: { project_id: projectId, description },
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function getJMXFiles(projectId: number) {
  return request.get<{ results: JMXFile[] }>('/api/performance/jmx-files', { params: { project_id: projectId } });
}

export function deleteJMXFile(fileId: number) {
  return request.delete(`/api/performance/jmx-files/${fileId}`);
}

// ====== 执行管理 ======

export function executeScene(sceneId: number) {
  return request.post<{ execution_id: number; status: string; scene_type: string }>(
    `/api/performance/scenes/${sceneId}/execute`,
  );
}

export function getExecutions(params: { scene_id?: number; page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<PerformanceExecution>>('/api/performance/executions', { params });
}

export function getExecution(executionId: number) {
  return request.get<PerformanceExecution>(`/api/performance/executions/${executionId}`);
}

// ====== 报告管理 ======

export function getPerformanceReports(params: { execution_id?: number; page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<PerformanceReport>>('/api/performance/reports', { params });
}

export function getPerformanceReport(reportId: number) {
  return request.get<PerformanceReport>(`/api/performance/reports/${reportId}`);
}
