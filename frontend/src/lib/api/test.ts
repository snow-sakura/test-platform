import request from '../request';

export interface TestPoint {
  id: number;
  project_id: number;
  document_id: number | null;
  title: string;
  description: string | null;
  priority: string;
  category: string | null;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface TestCaseStep {
  step: string;
  expected_result: string;
}

export interface TestCase {
  id: number;
  project_id: number;
  test_point_id: number;
  case_number: string | null;
  title: string;
  precondition: string | null;
  steps: TestCaseStep[] | null;
  expected_result: string | null;
  priority: string;
  case_type: string | null;
  created_at: string;
}

/** AI 提取测试点 */
export function extractTestPoints(projectId: number, documentIds: number[], knowledgeBaseIds?: number[]) {
  return request.post<{ batch_id: number; message: string }>('/api/test-points/extract', {
    project_id: projectId,
    document_ids: documentIds,
    knowledge_base_ids: knowledgeBaseIds || [],
  });
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** 获取项目测试点列表 */
export function getTestPoints(projectId: number) {
  return request.get<PaginatedResponse<TestPoint>>(`/api/test-points/project/${projectId}`);
}

/** 手动创建测试点 */
export function createTestPoint(projectId: number, data: Partial<TestPoint>) {
  return request.post<TestPoint>(`/api/test-points?project_id=${projectId}`, data);
}

/** 更新测试点 */
export function updateTestPoint(id: number, data: Partial<TestPoint>) {
  return request.put<TestPoint>(`/api/test-points/${id}`, data);
}

/** 删除测试点 */
export function deleteTestPoint(id: number) {
  return request.delete(`/api/test-points/${id}`);
}

/** AI 生成测试用例 */
export function generateTestCases(projectId: number, testPointIds: number[], knowledgeBaseIds?: number[]) {
  return request.post<{ batch_id: number; message: string }>('/api/test-cases/generate', {
    project_id: projectId,
    test_point_ids: testPointIds,
    knowledge_base_ids: knowledgeBaseIds || [],
  });
}

/** 获取项目测试用例列表 */
export function getTestCases(projectId: number) {
  return request.get<PaginatedResponse<TestCase>>(`/api/test-cases/project/${projectId}`);
}

/** 获取测试用例详情 */
export function getTestCase(id: number) {
  return request.get<TestCase>(`/api/test-cases/${id}`);
}

/** 手动创建测试用例 */
export function createTestCase(projectId: number, data: Partial<TestCase>) {
  return request.post<TestCase>(`/api/test-cases?project_id=${projectId}`, data);
}

/** 更新测试用例 */
export function updateTestCase(id: number, data: Partial<TestCase>) {
  return request.put<TestCase>(`/api/test-cases/${id}`, data);
}

/** 删除测试用例 */
export function deleteTestCase(id: number) {
  return request.delete(`/api/test-cases/${id}`);
}

/** 导出测试用例 Excel */
export function exportTestCasesExcel(projectId: number) {
  return request.get(`/api/test-cases/export/${projectId}`, {
    responseType: 'blob',
  });
}
