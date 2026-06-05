/* CI/CD 集成 - API 请求封装 */
import request from '../request';

/* ==================== API Token ==================== */

export interface ApiTokenCreate {
  name: string;
  expires_in_days?: number | null;
}

export interface ApiTokenCreateResponse {
  id: number;
  name: string;
  token: string;
  expires_at: string | null;
}

export interface ApiTokenResponse {
  id: number;
  name: string;
  last_used_at: string | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string | null;
}

export const createApiToken = (data: ApiTokenCreate) =>
  request.post<ApiTokenCreateResponse>('/ci/api-tokens', data);

export const getApiTokens = () =>
  request.get<ApiTokenResponse[]>('/ci/api-tokens');

export const deleteApiToken = (id: number) =>
  request.delete(`/ci/api-tokens/${id}`);

/* ==================== Pipeline ==================== */

export interface PipelineResponse {
  id: number;
  ci_type: string;
  external_pipeline_id: string | null;
  external_project: string | null;
  external_ref: string | null;
  status: string;
  trigger_event: string | null;
  commit_sha: string | null;
  commit_message: string | null;
  author: string | null;
  total_steps: number;
  passed_steps: number;
  failed_steps: number;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  created_at: string | null;
}

export interface PipelineStepResponse {
  id: number;
  pipeline_id: number;
  step_order: number;
  module_type: string;
  module_config: Record<string, any> | null;
  status: string;
  result: Record<string, any> | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string | null;
}

export interface PipelineDetailResponse extends PipelineResponse {
  steps: PipelineStepResponse[];
}

export const getPipelines = (params?: {
  ci_type?: string;
  status?: string;
  page?: number;
  page_size?: number;
}) => request.get<{ count: number; results: PipelineResponse[] }>('/ci/pipelines', { params });

export const getPipeline = (id: number) =>
  request.get<PipelineDetailResponse>(`/ci/pipelines/${id}`);

export const rerunPipeline = (id: number) =>
  request.post(`/ci/pipelines/${id}/rerun`);

/* ==================== Webhook Events ==================== */

export interface WebhookEventResponse {
  id: number;
  ci_type: string;
  event_type: string | null;
  pipeline_id: number | null;
  source_payload: Record<string, any> | null;
  headers: Record<string, any> | null;
  ip_address: string | null;
  received_at: string | null;
}

export const getWebhookEvents = (params?: {
  ci_type?: string;
  page?: number;
  page_size?: number;
}) => request.get<{ count: number; results: WebhookEventResponse[] }>('/ci/webhook-events', { params });

/* ==================== Config Template ==================== */

export interface ConfigTemplateRequest {
  ci_type: string;
  platform_url?: string;
  token_name?: string;
  branch?: string;
  module_configs?: Record<string, any>[];
}

export interface ConfigTemplateResponse {
  ci_type: string;
  filename: string;
  content: string;
}

export const generateConfigTemplate = (data: ConfigTemplateRequest) =>
  request.post<ConfigTemplateResponse>('/ci/config-template', data);

/* ==================== Types ==================== */

export const MODULE_TYPE_OPTIONS = [
  { value: 'api_testing', label: '接口测试' },
  { value: 'ui_auto', label: 'UI 自动化' },
  { value: 'app_auto', label: 'APP 自动化' },
  { value: 'test_mgmt', label: '手工测试' },
];

export const CI_TYPE_OPTIONS = [
  { value: 'gitlab', label: 'GitLab CI' },
  { value: 'github', label: 'GitHub Actions' },
  { value: 'jenkins', label: 'Jenkins' },
];

export const PIPELINE_STATUS_MAP: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: '待执行' },
  running: { color: 'processing', label: '执行中' },
  completed: { color: 'success', label: '已完成' },
  failed: { color: 'error', label: '已失败' },
  aborted: { color: 'warning', label: '已中止' },
};

export const STEP_STATUS_MAP: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: '待执行' },
  running: { color: 'processing', label: '执行中' },
  completed: { color: 'success', label: '通过' },
  failed: { color: 'error', label: '失败' },
  skipped: { color: 'warning', label: '跳过' },
};
