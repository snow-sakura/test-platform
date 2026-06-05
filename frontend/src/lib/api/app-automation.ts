/** APP 自动化测试模块 - API 封装 */
import request from '../request';


// ====== 类型定义 ======

export interface AppProject {
  id: number;
  name: string;
  description: string | null;
  platform: string;
  status: string;
  device_count: number;
  element_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface AppConfig {
  id: number;
  name: string;
  adb_path: string;
  device_timeout: number;
  screenshot_dir: string;
  created_at: string | null;
}

export interface Device {
  id: number;
  project_id: number | null;
  device_id: string;
  name: string;
  platform: string;
  platform_version: string | null;
  device_type: string;
  status: string;
  resolution: string | null;
  ip_address: string | null;
  connected_at: string | null;
  last_seen: string | null;
  created_at: string | null;
}

export interface AppPackage {
  id: number;
  project_id: number;
  package_name: string;
  app_name: string;
  main_activity: string | null;
  version: string | null;
  description: string | null;
  created_at: string | null;
}

export interface AppImageCategory {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  element_count: number;
  created_at: string | null;
}

export interface AppElement {
  id: number;
  project_id: number;
  name: string;
  element_type: string;
  image_path: string | null;
  coordinates: Record<string, number> | null;
  threshold: number | null;
  image_category_id: number | null;
  description: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface SceneStep {
  action: string;
  element_id?: number;
  params?: Record<string, unknown>;
}

export interface AppTestCase {
  id: number;
  project_id: number;
  name: string;
  package_id: number | null;
  device_id: number | null;
  scene_data: SceneStep[] | null;
  description: string | null;
  priority: string;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface AppTestSuite {
  id: number;
  project_id: number;
  name: string;
  description: string | null;
  case_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface AppTestExecution {
  id: number;
  test_case_id: number | null;
  suite_id: number | null;
  device_id: number | null;
  status: string;
  result: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  screenshots: { id: number; image_path: string }[];
  created_at: string | null;
}

export interface AppComponent {
  id: number;
  project_id: number;
  name: string;
  component_type: string;
  config: Record<string, unknown> | null;
  icon: string | null;
  description: string | null;
  is_public: boolean;
  created_at: string | null;
}

export interface AppScheduledTask {
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

export interface AppNotificationLog {
  id: number;
  config_id: number;
  event_type: string;
  status: string;
  message: string | null;
  response: string | null;
  sent_at: string | null;
}

export interface AppDashboardStats {
  project_count: number;
  device_count: number;
  element_count: number;
  case_count: number;
  today_executions: number;
  pass_rate: number;
  available_devices: number;
}

export interface ExecuteSceneResult {
  passed: boolean;
  duration_ms: number;
  steps: { action: string; success: boolean; error: string | null }[];
  screenshots: string[];
  error: string | null;
}

export interface PaginatedResponse<T> {
  count: number;
  results: T[];
}


// ====== 仪表盘 ======

export function getAppDashboardStats() {
  return request.get<AppDashboardStats>('/api/app-automation/dashboard/stats');
}

// ====== 项目 ======

export function getAppProjects(params?: { search?: string; status?: string; page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<AppProject>>('/api/app-automation/projects', { params });
}

export function getAppProject(id: number) {
  return request.get<AppProject>(`/api/app-automation/projects/${id}`);
}

export function createAppProject(data: Partial<AppProject>) {
  return request.post<AppProject>('/api/app-automation/projects', data);
}

export function updateAppProject(id: number, data: Partial<AppProject>) {
  return request.put<AppProject>(`/api/app-automation/projects/${id}`, data);
}

export function deleteAppProject(id: number) {
  return request.delete(`/api/app-automation/projects/${id}`);
}

// ====== 配置 ======

export function getAppConfigs() {
  return request.get<AppConfig[]>('/api/app-automation/configs');
}

export function createAppConfig(data: Partial<AppConfig>) {
  return request.post<AppConfig>('/api/app-automation/configs', data);
}

export function updateAppConfig(id: number, data: Partial<AppConfig>) {
  return request.put<AppConfig>(`/api/app-automation/configs/${id}`, data);
}

export function deleteAppConfig(id: number) {
  return request.delete(`/api/app-automation/configs/${id}`);
}

// ====== 设备 ======

export function getDevices(params?: { project_id?: number; status?: string; page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<Device>>('/api/app-automation/devices', { params });
}

export function getDevice(id: number) {
  return request.get<Device>(`/api/app-automation/devices/${id}`);
}

export function createDevice(data: Partial<Device>) {
  return request.post<Device>('/api/app-automation/devices', data);
}

export function updateDevice(id: number, data: Partial<Device>) {
  return request.put<Device>(`/api/app-automation/devices/${id}`, data);
}

export function deleteDevice(id: number) {
  return request.delete(`/api/app-automation/devices/${id}`);
}

export function discoverDevices() {
  return request.post<Device[]>('/api/app-automation/devices/discover');
}

// ====== 应用包 ======

export function getAppPackages(projectId: number) {
  return request.get<AppPackage[]>('/api/app-automation/packages', { params: { project_id: projectId } });
}

export function createAppPackage(data: Partial<AppPackage>) {
  return request.post<AppPackage>('/api/app-automation/packages', data);
}

export function updateAppPackage(id: number, data: Partial<AppPackage>) {
  return request.put<AppPackage>(`/api/app-automation/packages/${id}`, data);
}

export function deleteAppPackage(id: number) {
  return request.delete(`/api/app-automation/packages/${id}`);
}

// ====== 元素分类 ======

export function getAppImageCategories(projectId: number) {
  return request.get<AppImageCategory[]>('/api/app-automation/image-categories', { params: { project_id: projectId } });
}

export function createAppImageCategory(data: { project_id: number; name: string; description?: string }) {
  return request.post<AppImageCategory>('/api/app-automation/image-categories', data);
}

export function updateAppImageCategory(id: number, data: { name?: string; description?: string }) {
  return request.put<AppImageCategory>(`/api/app-automation/image-categories/${id}`, data);
}

export function deleteAppImageCategory(id: number) {
  return request.delete(`/api/app-automation/image-categories/${id}`);
}

// ====== 元素 ======

export function getAppElements(params: {
  project_id: number; category_id?: number; search?: string; page?: number; page_size?: number;
}) {
  return request.get<PaginatedResponse<AppElement>>('/api/app-automation/elements', { params });
}

export function createAppElement(data: Partial<AppElement>) {
  return request.post<AppElement>('/api/app-automation/elements', data);
}

export function updateAppElement(id: number, data: Partial<AppElement>) {
  return request.put<AppElement>(`/api/app-automation/elements/${id}`, data);
}

export function deleteAppElement(id: number) {
  return request.delete(`/api/app-automation/elements/${id}`);
}

// ====== 测试用例 ======

export function getAppTestCases(params: {
  project_id: number; priority?: string; status?: string; page?: number; page_size?: number;
}) {
  return request.get<PaginatedResponse<AppTestCase>>('/api/app-automation/test-cases', { params });
}

export function getAppTestCase(id: number) {
  return request.get<AppTestCase>(`/api/app-automation/test-cases/${id}`);
}

export function createAppTestCase(data: Partial<AppTestCase>) {
  return request.post<AppTestCase>('/api/app-automation/test-cases', data);
}

export function updateAppTestCase(id: number, data: Partial<AppTestCase>) {
  return request.put<AppTestCase>(`/api/app-automation/test-cases/${id}`, data);
}

export function deleteAppTestCase(id: number) {
  return request.delete(`/api/app-automation/test-cases/${id}`);
}

export function executeAppTestCase(id: number, device_id?: number) {
  return request.post<ExecuteSceneResult>(
    `/api/app-automation/test-cases/${id}/execute`,
    null, { params: { device_id } },
  );
}

// ====== 测试套件 ======

export function getAppTestSuites(params: { project_id: number; page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<AppTestSuite>>('/api/app-automation/test-suites', { params });
}

export function getAppTestSuite(id: number) {
  return request.get<AppTestSuite & { cases: AppTestCase[] }>(`/api/app-automation/test-suites/${id}`);
}

export function createAppTestSuite(data: { project_id: number; name: string; description?: string; case_ids?: number[] }) {
  return request.post<AppTestSuite>('/api/app-automation/test-suites', data);
}

export function deleteAppTestSuite(id: number) {
  return request.delete(`/api/app-automation/test-suites/${id}`);
}

export function executeAppTestSuite(id: number) {
  return request.post(`/api/app-automation/test-suites/${id}/execute`);
}

// ====== 执行记录 ======

export function getAppExecutions(params?: { suite_id?: number; status?: string; page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<AppTestExecution>>('/api/app-automation/executions', { params });
}

export function getAppExecution(id: number) {
  return request.get<AppTestExecution>(`/api/app-automation/executions/${id}`);
}

// ====== 组件库 ======

export function getAppComponents(projectId: number) {
  return request.get<AppComponent[]>('/api/app-automation/components', { params: { project_id: projectId } });
}

export function createAppComponent(data: Partial<AppComponent>) {
  return request.post<AppComponent>('/api/app-automation/components', data);
}

export function updateAppComponent(id: number, data: Partial<AppComponent>) {
  return request.put<AppComponent>(`/api/app-automation/components/${id}`, data);
}

export function deleteAppComponent(id: number) {
  return request.delete(`/api/app-automation/components/${id}`);
}

// ====== 定时任务 ======

export function getAppScheduledTasks(params?: { status?: string; page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<AppScheduledTask>>('/api/app-automation/scheduled-tasks', { params });
}

export function createAppScheduledTask(data: Partial<AppScheduledTask>) {
  return request.post<AppScheduledTask>('/api/app-automation/scheduled-tasks', data);
}

export function deleteAppScheduledTask(id: number) {
  return request.delete(`/api/app-automation/scheduled-tasks/${id}`);
}

export function pauseAppScheduledTask(id: number) {
  return request.post(`/api/app-automation/scheduled-tasks/${id}/pause`);
}

export function resumeAppScheduledTask(id: number) {
  return request.post(`/api/app-automation/scheduled-tasks/${id}/resume`);
}

// ====== 通知日志 ======

export function getAppNotificationLogs(params?: { page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<AppNotificationLog>>('/api/app-automation/notification-logs', { params });
}

export function retryAppNotificationLog(id: number) {
  return request.post(`/api/app-automation/notification-logs/${id}/retry`);
}

// ====== 新增 API：设备操作 ======

export function screenshotDevice(id: number) {
  return request.post<{ success: boolean; file_path: string }>(`/api/app-automation/devices/${id}/screenshot`);
}

export function lockDevice(id: number) {
  return request.post<{ success: boolean }>(`/api/app-automation/devices/${id}/lock`);
}

export function unlockDevice(id: number) {
  return request.post<{ success: boolean }>(`/api/app-automation/devices/${id}/unlock`);
}

export function connectDevice(id: number) {
  return request.post<{ success: boolean }>(`/api/app-automation/devices/${id}/connect`);
}

export function disconnectDevice(id: number) {
  return request.post<{ success: boolean }>(`/api/app-automation/devices/${id}/disconnect`);
}

// ====== 新增 API：定时任务立即执行 ======

export function runAppScheduledTaskNow(id: number) {
  return request.post(`/api/app-automation/scheduled-tasks/${id}/run-now`);
}

// ====== 新增 API：组件导入导出 ======

export function exportAppComponent(id: number) {
  return request.get<any>(`/api/app-automation/components/${id}/export`);
}

export function importAppComponent(data: Partial<AppComponent>) {
  return request.post<AppComponent>('/api/app-automation/components/import', data);
}

// ====== 新增 API：元素图片上传 ======

export function uploadAppElementImage(elementId: number, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<{ success: boolean; image_path: string }>(
    `/api/app-automation/elements/${elementId}/upload-image`, formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
}
