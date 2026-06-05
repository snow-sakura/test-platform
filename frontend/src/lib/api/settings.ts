/** 系统设置 API 封装 */
import request from '@/lib/request';

export interface SystemSetting {
  id: number;
  key: string;
  value: string | null;
  description: string | null;
  updated_at: string | null;
}

export interface ConfigStatus {
  [module: string]: {
    configured: boolean;
    key: string;
    label: string;
  };
}

export function getSettings() {
  return request.get<SystemSetting[]>('/api/settings');
}

export function upsertSetting(data: { key: string; value: string; description?: string }) {
  return request.post<SystemSetting>('/api/settings', data);
}

export function getSetting(key: string) {
  return request.get<SystemSetting>(`/api/settings/${key}`);
}

export function updateSetting(key: string, data: { value: string }) {
  return request.put<SystemSetting>(`/api/settings/${key}`, data);
}

/** 获取各模块配置状态 */
export function getConfigStatus() {
  return request.get<ConfigStatus>('/api/settings/status');
}
