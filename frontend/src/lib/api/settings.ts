/** 系统设置 API 封装 */
import request from '@/lib/request';

export interface SystemSetting {
  id: number;
  key: string;
  value: string | null;
  description: string | null;
  updated_at: string | null;
}

export function getSettings(): Promise<{ data: SystemSetting[] }> {
  return request.get('/api/settings');
}

export function upsertSetting(data: { key: string; value: string; description?: string }): Promise<{ data: SystemSetting }> {
  return request.post('/api/settings', data);
}

export function getSetting(key: string): Promise<{ data: SystemSetting }> {
  return request.get(`/api/settings/${key}`);
}

export function updateSetting(key: string, data: { value: string }): Promise<{ data: SystemSetting }> {
  return request.put(`/api/settings/${key}`, data);
}
