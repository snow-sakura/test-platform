/** UI 自动化测试模块 - API 封装 */
import request from '../request';

// ====== 类型定义 ======

export interface UiProject {
  id: number;
  name: string;
  description: string | null;
  url: string | null;
  browser_type: string;
  status: string;
  element_count: number;
  page_object_count: number;
  script_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface UiElementGroup {
  id: number;
  project_id: number;
  name: string;
  parent_id: number | null;
  sort_order: number;
  children: UiElementGroup[];
  element_count: number;
}

export interface UiElement {
  id: number;
  project_id: number;
  name: string;
  locator_type: string;
  locator_value: string;
  backup_locators: { type: string; value: string }[] | null;
  group_id: number | null;
  page_url: string | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UiPageObject {
  id: number;
  project_id: number;
  name: string;
  url: string | null;
  generated_code: string | null;
  element_count: number;
  element_links: { id: number; element_id: number; alias: string | null; order: number }[];
  created_at: string | null;
  updated_at: string | null;
}

export interface UiScriptStep {
  id: number;
  script_id: number;
  step_number: number;
  action_type: string;
  element_id: number | null;
  input_value: string | null;
  expected_result: string | null;
  wait_seconds: number | null;
}

export interface UiTestScript {
  id: number;
  project_id: number;
  name: string;
  page_object_id: number | null;
  description: string | null;
  step_count: number;
  steps: UiScriptStep[];
  created_at: string | null;
  updated_at: string | null;
}

export interface UiTestCase {
  id: number;
  project_id: number;
  name: string;
  script_id: number | null;
  priority: string;
  status: string;
  test_data: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UiTestSuite {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  case_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface UiTestExecution {
  id: number;
  suite_id: number | null;
  test_case_id: number | null;
  status: string;
  result: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string | null;
  screenshots: { id: number; image_path: string }[];
  operation_records: { id: number; action_type: string; success: boolean }[];
}

export interface UiEnvironment {
  id: number;
  project_id: number | null;
  name: string;
  browser_type: string;
  window_width: number;
  window_height: number;
  timeout_ms: number;
  headless: boolean;
  screenshot_on_failure: boolean;
  record_video: boolean;
  created_at: string | null;
}

export interface UiScheduledTask {
  id: number;
  name: string;
  suite_id: number | null;
  cron_expression: string;
  trigger_type: string;
  interval_seconds: number | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface UiNotificationConfig {
  id: number;
  name: string;
  notify_type: string;
  webhook_url: string;
  secret: string | null;
  is_active: boolean;
  created_at: string | null;
}

export interface UiNotificationLog {
  id: number;
  config_id: number;
  event_type: string;
  status: string;
  message: string | null;
  response: string | null;
  sent_at: string | null;
}

export interface UiDashboardStats {
  project_count: number;
  element_count: number;
  script_count: number;
  today_executions: number;
  pass_rate: number;
}

export interface UiExecuteScriptResult {
  script_id: number;
  script_name: string;
  passed: boolean;
  duration_ms: number;
  error: string | null;
  screenshots: string[];
  steps: { step_number: number; success: boolean; error: string | null }[];
}

export interface UiExecuteSuiteResult {
  suite_id: number;
  suite_name: string;
  total: number;
  passed: number;
  failed: number;
  duration_ms: number;
  results: UiExecuteScriptResult[];
}

export interface PaginatedResponse<T> {
  count: number;
  results: T[];
}

// ====== 仪表盘 ======

export function getUiDashboardStats() {
  return request.get<UiDashboardStats>('/api/ui-automation/dashboard/stats');
}

// ====== 项目 CRUD ======

export function getUiProjects(params?: { search?: string; status?: string; page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<UiProject>>('/api/ui-automation/projects', { params });
}

export function getUiProject(id: number) {
  return request.get<UiProject>(`/api/ui-automation/projects/${id}`);
}

export function createUiProject(data: Partial<UiProject>) {
  return request.post<UiProject>('/api/ui-automation/projects', data);
}

export function updateUiProject(id: number, data: Partial<UiProject>) {
  return request.put<UiProject>(`/api/ui-automation/projects/${id}`, data);
}

export function deleteUiProject(id: number) {
  return request.delete(`/api/ui-automation/projects/${id}`);
}

// ====== 元素分组 ======

export function getUiElementGroups(projectId: number) {
  return request.get<UiElementGroup[]>('/api/ui-automation/element-groups', {
    params: { project_id: projectId },
  });
}

export function createUiElementGroup(data: { project_id: number; name: string; parent_id?: number | null }) {
  return request.post<UiElementGroup>('/api/ui-automation/element-groups', data);
}

export function updateUiElementGroup(id: number, data: { name?: string; parent_id?: number | null }) {
  return request.put<UiElementGroup>(`/api/ui-automation/element-groups/${id}`, data);
}

export function deleteUiElementGroup(id: number) {
  return request.delete(`/api/ui-automation/element-groups/${id}`);
}

// ====== 元素 CRUD ======

export function getUiElements(params: {
  project_id: number; group_id?: number; search?: string; page?: number; page_size?: number;
}) {
  return request.get<PaginatedResponse<UiElement>>('/api/ui-automation/elements', { params });
}

export function getUiElement(id: number) {
  return request.get<UiElement>(`/api/ui-automation/elements/${id}`);
}

export function createUiElement(data: Partial<UiElement>) {
  return request.post<UiElement>('/api/ui-automation/elements', data);
}

export function updateUiElement(id: number, data: Partial<UiElement>) {
  return request.put<UiElement>(`/api/ui-automation/elements/${id}`, data);
}

export function deleteUiElement(id: number) {
  return request.delete(`/api/ui-automation/elements/${id}`);
}

export function validateUiElement(id: number, url?: string) {
  return request.post<{ found: boolean; locator_type: string; locator_value: string; error: string | null }>(
    `/api/ui-automation/elements/${id}/validate`,
    null, { params: { url } },
  );
}

// ====== 页面对象 CRUD ======

export function getUiPageObjects(params: { project_id: number; page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<UiPageObject>>('/api/ui-automation/page-objects', { params });
}

export function getUiPageObject(id: number) {
  return request.get<UiPageObject>(`/api/ui-automation/page-objects/${id}`);
}

export function createUiPageObject(data: { project_id: number; name: string; url?: string; element_ids?: number[] }) {
  return request.post<UiPageObject>('/api/ui-automation/page-objects', data);
}

export function updateUiPageObject(id: number, data: Partial<{ name: string; url: string; element_ids: number[] }>) {
  return request.put<UiPageObject>(`/api/ui-automation/page-objects/${id}`, data);
}

export function deleteUiPageObject(id: number) {
  return request.delete(`/api/ui-automation/page-objects/${id}`);
}

export function generateUiPageObjectCode(id: number) {
  return request.post<{ code: string }>(`/api/ui-automation/page-objects/${id}/generate-code`);
}

// ====== 脚本 CRUD ======

export function getUiScripts(params: { project_id: number; page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<UiTestScript>>('/api/ui-automation/scripts', { params });
}

export function getUiScript(id: number) {
  return request.get<UiTestScript>(`/api/ui-automation/scripts/${id}`);
}

export function createUiScript(data: {
  project_id: number; name: string; page_object_id?: number;
  description?: string; steps?: { step_number: number; action_type: string; element_id?: number; input_value?: string }[];
}) {
  return request.post<UiTestScript>('/api/ui-automation/scripts', data);
}

export function updateUiScript(id: number, data: Partial<{
  name: string; page_object_id?: number; description?: string; steps?: any[];
}>) {
  return request.put<UiTestScript>(`/api/ui-automation/scripts/${id}`, data);
}

export function deleteUiScript(id: number) {
  return request.delete(`/api/ui-automation/scripts/${id}`);
}

export function executeUiScript(id: number, environment_id?: number) {
  return request.post<UiExecuteScriptResult>(
    `/api/ui-automation/scripts/${id}/execute`,
    null, { params: { environment_id } },
  );
}

// ====== 测试用例 ======

export function getUiTestCases(params: {
  project_id: number; priority?: string; status?: string; page?: number; page_size?: number;
}) {
  return request.get<PaginatedResponse<UiTestCase>>('/api/ui-automation/test-cases', { params });
}

export function createUiTestCase(data: { project_id: number; name: string; script_id?: number; priority?: string; status?: string }) {
  return request.post<UiTestCase>('/api/ui-automation/test-cases', data);
}

export function updateUiTestCase(id: number, data: Partial<{ name: string; script_id?: number; priority?: string; status?: string }>) {
  return request.put<UiTestCase>(`/api/ui-automation/test-cases/${id}`, data);
}

export function deleteUiTestCase(id: number) {
  return request.delete(`/api/ui-automation/test-cases/${id}`);
}

// ====== 测试套件 ======

export function getUiTestSuites(params: { project_id: number; page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<UiTestSuite>>('/api/ui-automation/test-suites', { params });
}

export function getUiTestSuite(id: number) {
  return request.get<UiTestSuite & { cases: UiTestCase[] }>(`/api/ui-automation/test-suites/${id}`);
}

export function createUiTestSuite(data: { project_id: number; name: string; description?: string; case_ids?: number[] }) {
  return request.post<UiTestSuite>('/api/ui-automation/test-suites', data);
}

export function updateUiTestSuite(id: number, data: Partial<{ name: string; description?: string; case_ids?: number[] }>) {
  return request.put<UiTestSuite>(`/api/ui-automation/test-suites/${id}`, data);
}

export function deleteUiTestSuite(id: number) {
  return request.delete(`/api/ui-automation/test-suites/${id}`);
}

export function executeUiTestSuite(id: number, environment_id?: number) {
  return request.post<UiExecuteSuiteResult>(
    `/api/ui-automation/test-suites/${id}/execute`,
    null, { params: { environment_id } },
  );
}

// ====== 执行记录 ======

export function getUiExecutions(params?: { suite_id?: number; status?: string; page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<UiTestExecution>>('/api/ui-automation/executions', { params });
}

export function getUiExecution(id: number) {
  return request.get<UiTestExecution>(`/api/ui-automation/executions/${id}`);
}

export function deleteUiExecution(id: number) {
  return request.delete(`/api/ui-automation/executions/${id}`);
}

export function abortUiExecution(id: number) {
  return request.post(`/api/ui-automation/executions/${id}/abort`);
}

// ====== 环境配置 ======

export function getUiEnvironments(project_id?: number) {
  return request.get<UiEnvironment[]>('/api/ui-automation/environments', { params: { project_id } });
}

export function createUiEnvironment(data: Partial<UiEnvironment>) {
  return request.post<UiEnvironment>('/api/ui-automation/environments', data);
}

export function updateUiEnvironment(id: number, data: Partial<UiEnvironment>) {
  return request.put<UiEnvironment>(`/api/ui-automation/environments/${id}`, data);
}

export function deleteUiEnvironment(id: number) {
  return request.delete(`/api/ui-automation/environments/${id}`);
}

// ====== 定时任务 ======

export function getUiScheduledTasks(params?: { status?: string; page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<UiScheduledTask>>('/api/ui-automation/scheduled-tasks', { params });
}

export function createUiScheduledTask(data: Partial<UiScheduledTask>) {
  return request.post<UiScheduledTask>('/api/ui-automation/scheduled-tasks', data);
}

export function deleteUiScheduledTask(id: number) {
  return request.delete(`/api/ui-automation/scheduled-tasks/${id}`);
}

export function pauseUiScheduledTask(id: number) {
  return request.post(`/api/ui-automation/scheduled-tasks/${id}/pause`);
}

export function resumeUiScheduledTask(id: number) {
  return request.post(`/api/ui-automation/scheduled-tasks/${id}/resume`);
}

export function runUiScheduledTaskNow(id: number) {
  return request.post<{ message: string; execution_id: number }>(`/api/ui-automation/scheduled-tasks/${id}/run-now`);
}

// ====== 通知 ======

export function getUiNotifications() {
  return request.get<UiNotificationConfig[]>('/api/ui-automation/notifications');
}

export function createUiNotification(data: Partial<UiNotificationConfig>) {
  return request.post<UiNotificationConfig>('/api/ui-automation/notifications', data);
}

export function updateUiNotification(id: number, data: Partial<UiNotificationConfig>) {
  return request.put<UiNotificationConfig>(`/api/ui-automation/notifications/${id}`, data);
}

export function deleteUiNotification(id: number) {
  return request.delete(`/api/ui-automation/notifications/${id}`);
}

export function testUiNotification(id: number) {
  return request.post(`/api/ui-automation/notifications/${id}/test`);
}

export function getUiNotificationLogs(params?: { page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<UiNotificationLog>>('/api/ui-automation/notification-logs', { params });
}

export function retryUiNotificationLog(id: number) {
  return request.post<{ message: string; success: boolean; new_log_id: number }>(`/api/ui-automation/notification-logs/${id}/retry`);
}
