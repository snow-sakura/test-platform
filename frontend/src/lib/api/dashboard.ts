/** 仪表盘 - API 封装 */
import request from '../request';

export interface ModuleStatus {
  configured: boolean;
  count: number;
  label: string;
}

export type ModuleStatusMap = Record<string, ModuleStatus>;

/** 获取所有模块的配置状态 */
export function getModuleStatus() {
  return request.get<ModuleStatusMap>('/api/dashboard/module-status');
}
