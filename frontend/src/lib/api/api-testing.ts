/** 接口测试模块 API 调用 */
import request from '../request';

// ====== 类型定义 ======

export interface ApiProject {
  id: number;
  name: string;
  description: string | null;
  type: string | null;
  status: string;
  collection_count: number;
  request_count: number;
  created_at: string | null;
}

export interface ApiCollectionTreeNode {
  id: number;
  project_id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
  request_count: number;
  children: ApiCollectionTreeNode[];
}

export interface ApiRequest {
  id: number;
  collection_id: number;
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  query_params: Record<string, string>;
  body: any;
  body_type: string | null;
  expected_response: Record<string, any>;
  is_favorite: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface ApiTestSuite {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  request_ids: number[];
  created_at: string | null;
}

export interface ApiEnvironment {
  id: number;
  project_id: number | null;
  name: string;
  env_type: string;
  variables: Record<string, string>;
  is_active: boolean;
  created_at: string | null;
}

export interface ApiRequestHistory {
  id: number;
  request_id: number | null;
  project_id: number;
  method: string;
  url: string;
  headers: any;
  query_params: any;
  body: any;
  response_status: number | null;
  response_body: string | null;
  response_headers: any;
  elapsed_time: number | null;
  executed_at: string | null;
}

export interface ApiScheduledTask {
  id: number;
  name: string;
  task_type: string;
  suite_id: number | null;
  request_id: number | null;
  cron_expression: string;
  trigger_type: string;
  interval_seconds: number | null;
  status: string;
  last_executed_at: string | null;
  created_at: string | null;
}

export interface ApiNotificationConfig {
  id: number;
  name: string;
  notify_type: string;
  webhook_url: string;
  secret: string | null;
  is_active: boolean;
  created_at: string | null;
}

export interface ApiNotificationLog {
  id: number;
  config_id: number;
  event_type: string;
  status: string;
  message: string | null;
  response: string | null;
  sent_at: string | null;
}

export interface DashboardStats {
  project_count: number;
  request_count: number;
  suite_count: number;
  today_executions: number;
}

export interface ExecuteResponse {
  status_code: number;
  headers: Record<string, string>;
  body: string;
  elapsed_ms: number;
  history_id: number | null;
}

export interface SuiteExecuteResult {
  suite_id: number;
  suite_name: string;
  total: number;
  passed: number;
  failed: number;
  results: SingleRequestResult[];
  duration_ms: number;
  started_at: string;
  finished_at: string;
}

export interface SingleRequestResult {
  request_id: number;
  request_name: string;
  method: string;
  url: string;
  status_code: number | null;
  elapsed_ms: number;
  passed: boolean;
  error: string | null;
}

export interface PaginatedResponse<T> {
  count: number;
  results: T[];
  next: string | null;
  previous: string | null;
}

// ====== 仪表盘 ======

export function getDashboardStats() {
  return request.get<DashboardStats>('/api/api-testing/dashboard/stats');
}

// ====== API 项目 ======

export function getApiProjects(params?: { search?: string; status?: string; page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<ApiProject>>('/api/api-testing/projects', { params });
}

export function getApiProject(id: number) {
  return request.get<ApiProject>(`/api/api-testing/projects/${id}`);
}

export function createApiProject(data: Partial<ApiProject>) {
  return request.post<ApiProject>('/api/api-testing/projects', data);
}

export function updateApiProject(id: number, data: Partial<ApiProject>) {
  return request.put<ApiProject>(`/api/api-testing/projects/${id}`, data);
}

export function deleteApiProject(id: number) {
  return request.delete(`/api/api-testing/projects/${id}`);
}

// ====== 集合 ======

export function getCollectionTree(projectId: number) {
  return request.get<ApiCollectionTreeNode[]>('/api/api-testing/collections', {
    params: { project_id: projectId },
  });
}

export function createCollection(data: { project_id: number; name: string; parent_id?: number | null }) {
  return request.post('/api/api-testing/collections', data);
}

export function updateCollection(id: number, data: { name?: string; parent_id?: number | null }) {
  return request.put(`/api/api-testing/collections/${id}`, data);
}

export function deleteCollection(id: number) {
  return request.delete(`/api/api-testing/collections/${id}`);
}

// ====== 请求 ======

export function getRequests(collectionId: number, params?: { search?: string; is_favorite?: boolean }) {
  return request.get<ApiRequest[]>('/api/api-testing/requests', {
    params: { collection_id: collectionId, ...params },
  });
}

export function getRequest(id: number) {
  return request.get<ApiRequest>(`/api/api-testing/requests/${id}`);
}

export function createRequest(data: Partial<ApiRequest>) {
  return request.post<ApiRequest>('/api/api-testing/requests', data);
}

export function updateRequest(id: number, data: Partial<ApiRequest>) {
  return request.put<ApiRequest>(`/api/api-testing/requests/${id}`, data);
}

export function deleteRequest(id: number) {
  return request.delete(`/api/api-testing/requests/${id}`);
}

export function executeRequest(id: number, data?: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  query_params?: Record<string, string>;
  body?: any;
  body_type?: string;
  environment_id?: number;
  project_id?: number;
}) {
  return request.post<ExecuteResponse>(`/api/api-testing/requests/${id}/execute`, data);
}

export function batchExecuteRequests(data: {
  request_ids: number[];
  environment_id?: number;
  project_id?: number;
}) {
  return request.post('/api/api-testing/requests/batch-execute', data);
}

// ====== 测试套件 ======

export function getTestSuites(params?: { project_id?: number; page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<ApiTestSuite>>('/api/api-testing/test-suites', { params });
}

export function getTestSuite(id: number) {
  return request.get<ApiTestSuite>(`/api/api-testing/test-suites/${id}`);
}

export function createTestSuite(data: Partial<ApiTestSuite>) {
  return request.post<ApiTestSuite>('/api/api-testing/test-suites', data);
}

export function updateTestSuite(id: number, data: Partial<ApiTestSuite>) {
  return request.put<ApiTestSuite>(`/api/api-testing/test-suites/${id}`, data);
}

export function deleteTestSuite(id: number) {
  return request.delete(`/api/api-testing/test-suites/${id}`);
}

export function executeTestSuite(id: number, environment_id?: number) {
  return request.post<SuiteExecuteResult>(`/api/api-testing/test-suites/${id}/execute`, null, {
    params: { environment_id },
  });
}

// ====== 环境 ======

export function getEnvironments(params?: { project_id?: number; env_type?: string }) {
  return request.get<ApiEnvironment[]>('/api/api-testing/environments', { params });
}

export function createEnvironment(data: Partial<ApiEnvironment>) {
  return request.post<ApiEnvironment>('/api/api-testing/environments', data);
}

export function updateEnvironment(id: number, data: Partial<ApiEnvironment>) {
  return request.put<ApiEnvironment>(`/api/api-testing/environments/${id}`, data);
}

export function deleteEnvironment(id: number) {
  return request.delete(`/api/api-testing/environments/${id}`);
}

export function activateEnvironment(id: number) {
  return request.post<ApiEnvironment>(`/api/api-testing/environments/${id}/activate`);
}

// ====== 请求历史 ======

export function getRequestHistory(params?: {
  project_id?: number;
  request_id?: number;
  method?: string;
  status_code?: number;
  search?: string;
  page?: number;
  page_size?: number;
}) {
  return request.get<PaginatedResponse<ApiRequestHistory>>('/api/api-testing/request-history', { params });
}

export function getRequestHistoryDetail(id: number) {
  return request.get<ApiRequestHistory>(`/api/api-testing/request-history/${id}`);
}

export function deleteRequestHistory(ids: number[]) {
  return request.delete('/api/api-testing/request-history', { data: { ids } });
}

export function clearRequestHistory(projectId: number) {
  return request.delete('/api/api-testing/request-history/clear', { data: { project_id: projectId } });
}

// ====== 定时任务 ======

export function getScheduledTasks(params?: { status?: string; page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<ApiScheduledTask>>('/api/api-testing/scheduled-tasks', { params });
}

export function getScheduledTask(id: number) {
  return request.get<ApiScheduledTask>(`/api/api-testing/scheduled-tasks/${id}`);
}

export function createScheduledTask(data: Partial<ApiScheduledTask>) {
  return request.post<ApiScheduledTask>('/api/api-testing/scheduled-tasks', data);
}

export function updateScheduledTask(id: number, data: Partial<ApiScheduledTask>) {
  return request.put<ApiScheduledTask>(`/api/api-testing/scheduled-tasks/${id}`, data);
}

export function deleteScheduledTask(id: number) {
  return request.delete(`/api/api-testing/scheduled-tasks/${id}`);
}

export function pauseScheduledTask(id: number) {
  return request.post<ApiScheduledTask>(`/api/api-testing/scheduled-tasks/${id}/pause`);
}

export function resumeScheduledTask(id: number) {
  return request.post<ApiScheduledTask>(`/api/api-testing/scheduled-tasks/${id}/resume`);
}

export function runScheduledTaskNow(id: number) {
  return request.post(`/api/api-testing/scheduled-tasks/${id}/run-now`);
}

// ====== 通知 ======

export function getNotifications() {
  return request.get<ApiNotificationConfig[]>('/api/api-testing/notifications');
}

export function createNotification(data: Partial<ApiNotificationConfig>) {
  return request.post<ApiNotificationConfig>('/api/api-testing/notifications', data);
}

export function updateNotification(id: number, data: Partial<ApiNotificationConfig>) {
  return request.put<ApiNotificationConfig>(`/api/api-testing/notifications/${id}`, data);
}

export function deleteNotification(id: number) {
  return request.delete(`/api/api-testing/notifications/${id}`);
}

export function testNotification(id: number) {
  return request.post(`/api/api-testing/notifications/${id}/test`);
}

export function getNotificationLogs(params?: { page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<ApiNotificationLog>>('/api/api-testing/notification-logs', { params });
}
