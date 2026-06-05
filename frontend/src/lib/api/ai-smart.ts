/** AI 智能模式 - API 封装 */
import request from '../request';


// ====== 类型定义 ======

export interface AICase {
  id: number;
  project_id: number | null;
  name: string;
  task_description: string | null;
  target_url: string | null;
  execution_mode: string;
  enable_gif: boolean;
  planned_tasks: Record<string, unknown>[] | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface AIExecutionRecord {
  id: number;
  ai_case_id: number | null;
  project_id: number | null;
  task_description: string | null;
  execution_mode: string;
  enable_gif: boolean;
  steps_completed: number;
  planned_tasks: Record<string, unknown>[] | null;
  execution_log: Record<string, unknown>[] | null;
  gif_recording: string | null;
  status: string;
  summary: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
}

export interface AISmartStats {
  case_count: number;
  execution_count: number;
  today_executions: number;
  pass_rate: number;
  running_count: number;
}

export interface ExecutionReport {
  record_id: number;
  case_name: string;
  task_description: string;
  status: string;
  summary: string | null;
  steps_completed: number;
  planned_tasks: Record<string, unknown>[] | null;
  execution_log: Record<string, unknown>[] | null;
  gif_recording: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number;
}

export interface PaginatedResponse<T> {
  count: number;
  results: T[];
}


// ====== 仪表盘 ======

export function getAISmartStats() {
  return request.get<AISmartStats>('/api/ai-smart/dashboard/stats');
}

// ====== AI 用例 ======

export function getAICases(params?: { project_id?: number; status?: string; page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<AICase>>('/api/ai-smart/cases', { params });
}

export function getAICase(id: number) {
  return request.get<AICase>(`/api/ai-smart/cases/${id}`);
}

export function createAICase(data: Partial<AICase>) {
  return request.post<AICase>('/api/ai-smart/cases', data);
}

export function updateAICase(id: number, data: Partial<AICase>) {
  return request.put<AICase>(`/api/ai-smart/cases/${id}`, data);
}

export function deleteAICase(id: number) {
  return request.delete(`/api/ai-smart/cases/${id}`);
}

export function runAICase(id: number) {
  return request.post<{ execution_id: number; status: string }>(`/api/ai-smart/cases/${id}/run`);
}

// ====== 执行记录 ======

export function getAIExecutions(params?: { ai_case_id?: number; status?: string; page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<AIExecutionRecord>>('/api/ai-smart/executions', { params });
}

export function getAIExecution(id: number) {
  return request.get<AIExecutionRecord>(`/api/ai-smart/executions/${id}`);
}

export function deleteAIExecution(id: number) {
  return request.delete(`/api/ai-smart/executions/${id}`);
}

export function batchDeleteAIExecutions(ids: number[]) {
  return request.post('/api/ai-smart/executions/batch-delete', ids);
}

export function runAdhocAI(data: {
  task_description: string;
  target_url?: string;
  execution_mode?: string;
  enable_gif?: boolean;
}) {
  return request.post<{ execution_id: number; status: string }>('/api/ai-smart/executions/run-adhoc', data);
}

export function stopAIExecution(id: number) {
  return request.post(`/api/ai-smart/executions/${id}/stop`);
}

export function getAIExecutionReport(id: number) {
  return request.get<ExecutionReport>(`/api/ai-smart/executions/${id}/report`);
}

/** 导出 AI 执行记录为 PDF 报告 */
export function exportExecutionPdf(id: number) {
  return request.get(`/api/ai-smart/executions/${id}/export-pdf`, {
    responseType: 'blob',
  });
}
