/** AI 用例生成模块 - API 封装 */
import request from '../request';

// ====== 类型定义 ======

export interface ConfigStatusItem {
  configured: boolean;
  active: boolean;
  label: string;
}

export interface ConfigStatusResponse {
  writer_model: ConfigStatusItem;
  reviewer_model: ConfigStatusItem;
  writer_prompt: ConfigStatusItem;
  reviewer_prompt: ConfigStatusItem;
  generation_config: ConfigStatusItem;
}

export interface AIModelConfig {
  id: number;
  name: string;
  model_type: string;
  role: string;
  api_base: string;
  api_key: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AIModelConfigCreate {
  name: string;
  model_type: string;
  role?: string;
  api_base: string;
  api_key: string;
  model_name: string;
  temperature?: number;
  max_tokens?: number;
  is_active?: boolean;
}

export interface AIModelConfigUpdate {
  name?: string;
  model_type?: string;
  role?: string;
  api_base?: string;
  api_key?: string;
  model_name?: string;
  temperature?: number;
  max_tokens?: number;
  is_active?: boolean;
}

export interface PromptConfig {
  id: number;
  name: string;
  prompt_type: string;
  content: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PromptConfigCreate {
  name: string;
  prompt_type: string;
  content: string;
  is_active?: boolean;
}

export interface PromptConfigUpdate {
  name?: string;
  prompt_type?: string;
  content?: string;
  is_active?: boolean;
}

export interface GenerationConfig {
  id: number;
  name: string;
  test_level: string;
  test_priority: string;
  test_case_count: number;
  auto_review: boolean;
  review_timeout: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GenerationConfigCreate {
  name: string;
  test_level?: string;
  test_priority?: string;
  test_case_count?: number;
  auto_review?: boolean;
  review_timeout?: number;
  is_active?: boolean;
}

export interface GenerationConfigUpdate {
  name?: string;
  test_level?: string;
  test_priority?: string;
  test_case_count?: number;
  auto_review?: boolean;
  review_timeout?: number;
  is_active?: boolean;
}

export interface RequirementDocument {
  id: number;
  title: string;
  file?: string;
  content?: string;
  file_type?: string;
  uploader_id?: number;
  created_at?: string;
}

export interface RequirementAnalysis {
  id: number;
  document_id?: number;
  analysis_text?: string;
  status: string;
  result?: any;
  created_at?: string;
  updated_at?: string;
}

export interface BusinessRequirement {
  id: number;
  analysis_id: number;
  title: string;
  description?: string;
  priority: string;
  category?: string;
  created_at?: string;
}

export interface TaskItem {
  id: number;
  task_id: string;
  source_type: string;
  source_id?: number;
  status: string;
  mode: string;
  progress: number;
  error_message?: string;
  is_saved_to_records: boolean;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
}

export interface TaskDetail extends TaskItem {
  generated_content?: string;
  review_feedback?: string;
  final_test_cases?: string;
  stream_buffer?: string;
}

export interface TaskCreatePayload {
  source_type?: string;
  source_id?: number;
  mode?: string;
  requirement_ids?: number[];
}

export interface TaskGenerateRequest {
  writer_config_id: number;
  writer_prompt_id?: number;
  generation_config_id?: number;
  reviewer_config_id?: number;
  reviewer_prompt_id?: number;
}

export interface GeneratedTestCase {
  id: number;
  requirement_id?: number;
  task_id?: number;
  title: string;
  scenario?: string;
  preconditions?: string;
  steps?: string;
  expected_result?: string;
  priority: string;
  status: string;
  created_at?: string;
}

export interface BatchStatusUpdate {
  ids: number[];
  status: string;
}

export interface PaginatedResponse<T> {
  count: number;
  results: T[];
  next?: string | null;
  previous?: string | null;
}

// ====== 配置状态 ======

export function getConfigStatus() {
  return request.get<ConfigStatusResponse>('/api/requirement-analysis/config/status');
}

// ====== AI 模型配置 ======

export function listModelConfigs() {
  return request.get<AIModelConfig[]>('/api/requirement-analysis/model-configs');
}

export function createModelConfig(data: AIModelConfigCreate) {
  return request.post<AIModelConfig>('/api/requirement-analysis/model-configs', data);
}

export function updateModelConfig(id: number, data: AIModelConfigUpdate) {
  return request.put<AIModelConfig>(`/api/requirement-analysis/model-configs/${id}`, data);
}

export function deleteModelConfig(id: number) {
  return request.delete<void>(`/api/requirement-analysis/model-configs/${id}`);
}

export function testModelConfig(id: number) {
  return request.post<{ success: boolean; message: string }>(`/api/requirement-analysis/model-configs/${id}/test-connection`);
}

// ====== 提示词配置 ======

export function listPromptConfigs() {
  return request.get<PromptConfig[]>('/api/requirement-analysis/prompt-configs');
}

export function createPromptConfig(data: PromptConfigCreate) {
  return request.post<PromptConfig>('/api/requirement-analysis/prompt-configs', data);
}

export function updatePromptConfig(id: number, data: PromptConfigUpdate) {
  return request.put<PromptConfig>(`/api/requirement-analysis/prompt-configs/${id}`, data);
}

export function deletePromptConfig(id: number) {
  return request.delete<void>(`/api/requirement-analysis/prompt-configs/${id}`);
}

export function loadDefaultPrompt(id: number) {
  return request.get<PromptConfig>(`/api/requirement-analysis/prompt-configs/${id}/load-defaults`);
}

// ====== 生成行为配置 ======

export function listGenerationConfigs() {
  return request.get<GenerationConfig[]>('/api/requirement-analysis/generation-configs');
}

export function createGenerationConfig(data: GenerationConfigCreate) {
  return request.post<GenerationConfig>('/api/requirement-analysis/generation-configs', data);
}

export function updateGenerationConfig(id: number, data: GenerationConfigUpdate) {
  return request.put<GenerationConfig>(`/api/requirement-analysis/generation-configs/${id}`, data);
}

export function deleteGenerationConfig(id: number) {
  return request.delete<void>(`/api/requirement-analysis/generation-configs/${id}`);
}

// ====== 文档管理 ======

export function uploadDocument(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return request.post<RequirementDocument>('/api/requirement-analysis/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function listDocuments(page = 1, pageSize = 20) {
  return request.get<PaginatedResponse<RequirementDocument>>('/api/requirement-analysis/documents', {
    params: { page, page_size: pageSize },
  });
}

export function getDocument(id: number) {
  return request.get<RequirementDocument>(`/api/requirement-analysis/documents/${id}`);
}

export function deleteDocument(id: number) {
  return request.delete<void>(`/api/requirement-analysis/documents/${id}`);
}

// ====== 分析管理 ======

export function analyzeDocument(docId: number) {
  return request.post<RequirementAnalysis>(`/api/requirement-analysis/documents/${docId}/analyze`);
}

export function analyzeText(text: string) {
  return request.post<RequirementAnalysis>('/api/requirement-analysis/analyze-text', { text });
}

export function listAnalyses(page = 1, pageSize = 20) {
  return request.get<PaginatedResponse<RequirementAnalysis>>('/api/requirement-analysis/analyses', {
    params: { page, page_size: pageSize },
  });
}

// ====== 业务需求 ======

export function getAnalysisRequirements(analysisId: number) {
  return request.get<BusinessRequirement[]>(`/api/requirement-analysis/analyses/${analysisId}/requirements`);
}

// ====== 业务需求 ======

export function listRequirements(page = 1, pageSize = 20, analysisId?: number) {
  const params: Record<string, any> = { page, page_size: pageSize };
  if (analysisId) params.analysis_id = analysisId;
  return request.get<PaginatedResponse<BusinessRequirement>>(
    '/api/requirement-analysis/requirements', { params },
  );
}

export function updateRequirement(id: number, data: { title?: string; description?: string; priority?: string; category?: string }) {
  return request.put<BusinessRequirement>(`/api/requirement-analysis/requirements/${id}`, data);
}

export function deleteRequirement(id: number) {
  return request.delete<void>(`/api/requirement-analysis/requirements/${id}`);
}

export function generateCasesFromRequirement(id: number) {
  return request.post<{ analysis_id: number; task_id: string }>(
    `/api/requirement-analysis/requirements/${id}/generate-test-cases`,
  );
}

// ====== 生成用例管理 ======

export function listGeneratedCases(params?: {
  page?: number;
  page_size?: number;
  requirement_id?: number;
  task_id?: number;
  status?: string;
}) {
  return request.get<PaginatedResponse<GeneratedTestCase>>(
    '/api/requirement-analysis/generated-cases', { params },
  );
}

export function getGeneratedCase(id: number) {
  return request.get<GeneratedTestCase>(`/api/requirement-analysis/generated-cases/${id}`);
}

export function updateGeneratedCase(id: number, data: Partial<GeneratedTestCase>) {
  return request.put<GeneratedTestCase>(`/api/requirement-analysis/generated-cases/${id}`, data);
}

export function deleteGeneratedCase(id: number) {
  return request.delete<void>(`/api/requirement-analysis/generated-cases/${id}`);
}

export function batchUpdateCaseStatus(ids: number[], status: string) {
  return request.post<{ message: string; updated_count: number }>(
    '/api/requirement-analysis/generated-cases/batch-status', { ids, status },
  );
}

// ====== 任务管理 ======

export function createTask(data: TaskCreatePayload) {
  return request.post<TaskItem>('/api/requirement-analysis/tasks', data);
}

export function listTasks(page = 1, pageSize = 20, status?: string) {
  const params: Record<string, any> = { page, page_size: pageSize };
  if (status) params.status = status;
  return request.get<PaginatedResponse<TaskItem>>('/api/requirement-analysis/tasks', { params });
}

export function getTask(taskId: string) {
  return request.get<TaskDetail>(`/api/requirement-analysis/tasks/${taskId}`);
}

export function startGeneration(taskId: string, data: TaskGenerateRequest) {
  return request.post<{ message: string; task_id: string }>(`/api/requirement-analysis/tasks/${taskId}/generate`, data);
}

export function cancelTask(taskId: string) {
  return request.post<{ message: string }>(`/api/requirement-analysis/tasks/${taskId}/cancel`);
}

export function saveTaskToLibrary(taskId: string) {
  return request.post<{ message: string; saved_count: number }>(`/api/requirement-analysis/tasks/${taskId}/save-to-library`);
}

export function getTaskStatistics(taskId: string) {
  return request.get<Record<string, any>>(`/api/requirement-analysis/tasks/${taskId}/statistics`);
}
