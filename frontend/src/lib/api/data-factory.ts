/** 数据工厂 - API 封装 */
import request from '../request';


export interface ToolParam {
  name: string;
  label: string;
  type: string;
  required: boolean;
  default: unknown;
  placeholder: string;
  options?: { label: string; value: string }[];
}

export interface ToolInfo {
  name: string;
  label: string;
  description: string;
  category: string;
  params: ToolParam[];
}

export interface ToolCategory {
  name: string;
  label: string;
  icon: string;
  tools: ToolInfo[];
}

export interface DataFactoryRecord {
  id: number;
  user_id: number | null;
  tool_name: string;
  tool_category: string;
  input_data: Record<string, unknown> | null;
  output_data: string | null;
  tags: string | null;
  created_at: string | null;
}

export interface UsageStats {
  total_executions: number;
  today_executions: number;
  tool_count: number;
  category_count: number;
  top_tools: { tool_name: string; count: number }[];
}

export interface VariableFunction {
  name: string;
  label: string;
  description: string;
  category: string;
  example: string;
}

export interface PaginatedResponse<T> {
  count: number;
  results: T[];
}


export function getDataFactoryCategories() {
  return request.get<ToolCategory[]>('/api/data-factory/categories');
}

export function executeTool(data: { tool_name: string; params?: Record<string, unknown>; tags?: string }) {
  return request.post<{ tool_name: string; output: string }>('/api/data-factory/execute', data);
}

export function batchExecuteTool(data: { tool_name: string; params?: Record<string, unknown>; count?: number; tags?: string }) {
  return request.post<{ tool_name: string; count: number; results: { index: number; output?: string; error?: string }[] }>('/api/data-factory/batch-execute', data);
}

export function getDataFactoryRecords(params?: { tag?: string; tool_name?: string; tool_category?: string; page?: number; page_size?: number }) {
  return request.get<PaginatedResponse<DataFactoryRecord>>('/api/data-factory/records', { params });
}

export function deleteDataFactoryRecord(id: number) {
  return request.delete(`/api/data-factory/records/${id}`);
}

export function getDataFactoryStats() {
  return request.get<UsageStats>('/api/data-factory/stats');
}

export function getVariableFunctions() {
  return request.get<VariableFunction[]>('/api/data-factory/variable-functions');
}

export function resolveVariables(text: string) {
  return request.post<{ original: string; resolved: string }>('/api/data-factory/resolve-variables', null, { params: { text } });
}

/** 下载生成的文件（条形码/二维码图片等） */
export function downloadStaticFile(data: { tool_name: string; params?: Record<string, unknown> }) {
  return request.post('/api/data-factory/download-static-file', data, {
    responseType: 'blob',
  });
}
