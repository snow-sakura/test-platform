/** 手工测试全生命周期管理 - API 封装 */

import request from '@/lib/request';


// ====== 类型定义 ======

export interface TestCaseStep {
  id: number;
  case_id: number;
  step_number: number;
  action: string;
  expected_result: string;
}

export interface TestCaseAttachment {
  id: number;
  case_id: number;
  filename: string;
  file_path: string;
  file_size: number;
  uploaded_by: number;
  uploaded_at: string;
}

export interface TestCaseComment {
  id: number;
  case_id: number;
  author_id: number;
  content: string;
  created_at: string;
}

export interface TestCase {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  preconditions?: string;
  priority: string;
  status: string;
  case_type?: string;
  author_id: number;
  created_at: string;
  updated_at: string;
}

export interface TestCaseListItem extends TestCase {
  step_count: number;
  comment_count: number;
}

export interface TestCaseDetail extends TestCase {
  steps: TestCaseStep[];
  comments: TestCaseComment[];
  attachments: TestCaseAttachment[];
}

export interface TestCaseCreateData {
  title: string;
  description?: string;
  preconditions?: string;
  priority?: string;
  status?: string;
  case_type?: string;
  steps?: { step_number: number; action: string; expected_result: string }[];
}

export interface TestSuite {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  author_id: number;
  case_count: number;
  created_at: string;
  updated_at: string;
}

export interface TestVersion {
  id: number;
  name: string;
  description?: string;
  is_baseline: boolean;
  created_by: number;
  created_at: string;
}

export interface TestReview {
  id: number;
  title: string;
  description?: string;
  creator_id: number;
  status: string;
  priority: string;
  deadline?: string;
  created_at: string;
  updated_at: string;
}

export interface TestPlan {
  id: number;
  name: string;
  description?: string;
  project_id: number;
  version_id?: number;
  creator_id: number;
  is_active: boolean;
  run_count: number;
  created_at: string;
  updated_at: string;
}

export interface RunCaseItem {
  id: number;
  run_id: number;
  case_id: number;
  status: string;
  actual_result?: string;
  comments?: string;
  defects?: string;
  elapsed_time?: number;
  executed_by?: number;
  executed_at?: string;
}

export interface TestRun {
  id: number;
  plan_id: number;
  name: string;
  assignee_id?: number;
  status: string;
  total_cases: number;
  passed: number;
  failed: number;
  blocked: number;
  untested: number;
  run_cases?: RunCaseItem[];
  created_at: string;
  updated_at: string;
}

export interface TestReport {
  id: number;
  project_id: number;
  name: string;
  report_type: string;
  run_id?: number;
  summary?: string;
  content?: Record<string, unknown>;
  created_by: number;
  created_at: string;
}

export interface DashboardStats {
  total_cases: number;
  total_suites: number;
  total_plans: number;
  total_runs: number;
  total_reviews: number;
  my_pending_reviews: number;
  pass_rate: number;
  today_executions: number;
}

export interface PaginatedResponse<T> {
  count: number;
  results: T[];
}


// ====== 仪表盘 ======

export function getTestManagementDashboardStats(projectId?: number) {
  return request.get<DashboardStats>('/api/test-management/dashboard/stats', {
    params: { project_id: projectId },
  });
}

/** 每日执行趋势 */
export function getExecutionTrend(params?: { project_id?: number; days?: number }) {
  return request.get<{ data: { date: string; total: number; passed: number; failed: number }[] }>(
    '/api/test-management/dashboard/execution-trend', { params }
  );
}

/** 执行状态分布 */
export function getStatusDistribution(params?: { project_id?: number }) {
  return request.get<Record<string, number>>('/api/test-management/dashboard/status-distribution', { params });
}

/** 失败 TOP10 */
export function getFailedTop10(params?: { project_id?: number }) {
  return request.get<{ data: { case_id: number; title: string; fail_count: number }[] }>(
    '/api/test-management/dashboard/failed-top10', { params }
  );
}

/** 执行汇总统计 */
export function getExecutionSummary(params?: { project_id?: number }) {
  return request.get<{ total: number; passed: number; failed: number; blocked: number; untested: number }>(
    '/api/test-management/dashboard/execution-summary', { params }
  );
}


// ====== 测试用例 CRUD ======

export function getCases(params: {
  project_id: number;
  status?: string;
  priority?: string;
  case_type?: string;
  search?: string;
  page?: number;
  page_size?: number;
}) {
  return request.get<PaginatedResponse<TestCaseListItem>>('/api/test-management/cases', { params });
}

export function getCase(caseId: number) {
  return request.get<TestCaseDetail>(`/api/test-management/cases/${caseId}`);
}

export function createCase(projectId: number, data: TestCaseCreateData) {
  return request.post<TestCaseDetail>('/api/test-management/cases', data, {
    params: { project_id: projectId },
  });
}

export function updateCase(caseId: number, data: Partial<TestCaseCreateData>) {
  return request.put<TestCaseDetail>(`/api/test-management/cases/${caseId}`, data);
}

export function deleteCase(caseId: number) {
  return request.delete(`/api/test-management/cases/${caseId}`);
}

export function batchDeleteCases(ids: number[]) {
  return request.post('/api/test-management/cases/batch-delete', ids);
}

/** 导出测试用例为 Excel（下载文件） */
export function exportCasesExcel(params: {
  project_id: number;
  status?: string;
  priority?: string;
}) {
  return request.get('/api/test-management/cases/export', {
    params,
    responseType: 'blob',
  });
}

/** 从 Excel 导入测试用例 */
export function importCasesExcel(projectId: number, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post('/api/test-management/cases/import', formData, {
    params: { project_id: projectId },
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}


// ====== 评论 ======

export function getCaseComments(caseId: number) {
  return request.get<TestCaseComment[]>(`/api/test-management/cases/${caseId}/comments`);
}

export function createCaseComment(caseId: number, content: string) {
  return request.post<TestCaseComment>(`/api/test-management/cases/${caseId}/comments`, { content });
}

export function deleteCaseComment(caseId: number, commentId: number) {
  return request.delete(`/api/test-management/cases/${caseId}/comments/${commentId}`);
}


// ====== 附件 ======

export function uploadCaseAttachment(caseId: number, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<TestCaseAttachment>(
    `/api/test-management/cases/${caseId}/attachments`, formData,
  );
}

export function deleteCaseAttachment(caseId: number, attachmentId: number) {
  return request.delete(`/api/test-management/cases/${caseId}/attachments/${attachmentId}`);
}


// ====== 测试套件 ======

export function getSuites(projectId: number, page = 1, pageSize = 20) {
  return request.get<PaginatedResponse<TestSuite>>('/api/test-management/suites', {
    params: { project_id: projectId, page, page_size: pageSize },
  });
}

export function getSuite(suiteId: number) {
  return request.get<TestSuite & { cases: TestCaseListItem[] }>(`/api/test-management/suites/${suiteId}`);
}

export function createSuite(projectId: number, data: { name: string; description?: string; case_ids?: number[] }) {
  return request.post<TestSuite>('/api/test-management/suites', data, {
    params: { project_id: projectId },
  });
}

export function updateSuite(suiteId: number, data: { name?: string; description?: string; case_ids?: number[] }) {
  return request.put<TestSuite>(`/api/test-management/suites/${suiteId}`, data);
}

export function deleteSuite(suiteId: number) {
  return request.delete(`/api/test-management/suites/${suiteId}`);
}


// ====== 版本管理 ======

export function getVersions(params?: { project_id?: number; page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<TestVersion>>('/api/test-management/versions', { params });
}

export function createVersion(data: {
  name: string; description?: string; is_baseline?: boolean; project_ids?: number[];
}) {
  return request.post<TestVersion>('/api/test-management/versions', data);
}

export function updateVersion(versionId: number, data: Partial<{ name: string; description: string; is_baseline: boolean }>) {
  return request.put<TestVersion>(`/api/test-management/versions/${versionId}`, data);
}

export function deleteVersion(versionId: number) {
  return request.delete(`/api/test-management/versions/${versionId}`);
}


// ====== 评审管理 ======

export function getReviews(params?: { project_id?: number; status?: string; page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<TestReview>>('/api/test-management/reviews', { params });
}

export function getMyReviewTasks() {
  return request.get<TestReview[]>('/api/test-management/reviews/my-tasks');
}

export function getReview(reviewId: number) {
  return request.get<TestReview & { cases: TestCaseListItem[]; assignments: any[] }>(
    `/api/test-management/reviews/${reviewId}`,
  );
}

export function createReview(data: {
  title: string; description?: string; priority?: string;
  project_ids?: number[]; case_ids?: number[]; reviewer_ids?: number[];
}) {
  return request.post<TestReview>('/api/test-management/reviews', data);
}

export function submitReview(reviewId: number, data: { comment?: string; checklist_results?: any }) {
  return request.post(`/api/test-management/reviews/${reviewId}/submit`, data);
}


// ====== 执行管理 ======

export function getPlans(projectId: number, params?: { page?: number; page_size?: number; search?: string }) {
  return request.get<PaginatedResponse<TestPlan>>('/api/test-management/plans', {
    params: { project_id: projectId, ...params },
  });
}

export function getPlan(planId: number) {
  return request.get<TestPlan>(`/api/test-management/plans/${planId}`);
}

export function createPlan(projectId: number, data: {
  name: string; description?: string; version_id?: number; case_ids?: number[]; assignee_ids?: number[];
}) {
  return request.post<TestPlan>('/api/test-management/plans', { ...data, project_id: projectId });
}

export function updatePlan(planId: number, data: { name?: string; description?: string; is_active?: boolean }) {
  return request.put<TestPlan>(`/api/test-management/plans/${planId}`, data);
}

export function deletePlan(planId: number) {
  return request.delete(`/api/test-management/plans/${planId}`);
}

export function getRuns(params: {
  plan_id?: number; status?: string; page?: number; page_size?: number;
}) {
  return request.get<PaginatedResponse<TestRun>>('/api/test-management/runs', { params });
}

export function getRun(runId: number) {
  return request.get<TestRun>(`/api/test-management/runs/${runId}`);
}

export function updateRunCaseStatus(runId: number, runCaseId: number, data: {
  status: string; actual_result?: string; comments?: string; elapsed_time?: number;
}) {
  return request.put(`/api/test-management/runs/${runId}/cases/${runCaseId}`, data);
}


// ====== 报告管理 ======

export function getReports(projectId: number, page = 1, pageSize = 20) {
  return request.get<PaginatedResponse<TestReport>>('/api/test-management/reports', {
    params: { project_id: projectId, page, page_size: pageSize },
  });
}

export function createReport(projectId: number, data: {
  name: string; report_type?: string; run_id?: number; summary?: string;
}) {
  return request.post<TestReport>('/api/test-management/reports', data, {
    params: { project_id: projectId },
  });
}

export function deleteReport(reportId: number) {
  return request.delete(`/api/test-management/reports/${reportId}`);
}
