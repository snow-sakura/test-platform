/** 统一通知管理 - API 封装 */
import request from '../request';

export interface NotificationConfig {
  id: number;
  name: string;
  config_type: string;
  webhook_bots?: WebhookBot[];
  is_default: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WebhookBot {
  name: string;
  url: string;
  enabled: boolean;
}

export interface NotificationConfigCreate {
  name: string;
  config_type?: string;
  webhook_bots?: WebhookBot[];
  is_default?: boolean;
  is_active?: boolean;
}

export interface NotificationConfigUpdate {
  name?: string;
  config_type?: string;
  webhook_bots?: WebhookBot[];
  is_default?: boolean;
  is_active?: boolean;
}

export function listNotificationConfigs() {
  return request.get<NotificationConfig[]>('/api/notification-configs/configs');
}

export function createNotificationConfig(data: NotificationConfigCreate) {
  return request.post<NotificationConfig>('/api/notification-configs/configs', data);
}

export function getNotificationConfig(id: number) {
  return request.get<NotificationConfig>(`/api/notification-configs/configs/${id}`);
}

export function updateNotificationConfig(id: number, data: NotificationConfigUpdate) {
  return request.put<NotificationConfig>(`/api/notification-configs/configs/${id}`, data);
}

export function deleteNotificationConfig(id: number) {
  return request.delete<void>(`/api/notification-configs/configs/${id}`);
}

export function setDefaultNotificationConfig(id: number) {
  return request.post<NotificationConfig>(`/api/notification-configs/configs/${id}/set-default`);
}

export function getActiveNotificationConfigs() {
  return request.get<NotificationConfig[]>('/api/notification-configs/configs/active');
}
