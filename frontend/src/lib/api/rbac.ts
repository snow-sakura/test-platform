/** RBAC 权限系统 - API 封装 */
import request from '../request';

export interface Permission {
  id: number;
  codename: string;
  name: string;
  module: string;
  description?: string;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  is_system: boolean;
  created_at?: string;
  permission_ids: number[];
  user_count: number;
}

export interface UserWithRoles {
  id: number;
  username: string;
  email?: string;
  is_superuser: boolean;
  role_ids: number[];
  role_names: string[];
}

/** 获取所有权限定义 */
export function listPermissions() {
  return request.get<Permission[]>('/api/rbac/permissions');
}

/** 获取所有角色 */
export function listRoles() {
  return request.get<Role[]>('/api/rbac/roles');
}

/** 创建角色 */
export function createRole(data: { name: string; description?: string; permission_ids?: number[] }) {
  return request.post<Role>('/api/rbac/roles', data);
}

/** 更新角色 */
export function updateRole(id: number, data: { name?: string; description?: string; permission_ids?: number[] }) {
  return request.put<Role>(`/api/rbac/roles/${id}`, data);
}

/** 删除角色 */
export function deleteRole(id: number) {
  return request.delete<void>(`/api/rbac/roles/${id}`);
}

/** 获取用户列表（含角色信息） */
export function listUsersWithRoles() {
  return request.get<UserWithRoles[]>('/api/rbac/users');
}

/** 分配用户角色 */
export function assignUserRoles(userId: number, roleIds: number[]) {
  return request.put<{ message: string }>(`/api/rbac/users/${userId}/roles`, { user_id: userId, role_ids: roleIds });
}

/** 获取当前用户权限 */
export function getMyPermissions() {
  return request.get<{ user_id: number; username: string; is_superuser: boolean; permissions: string[] }>(
    '/api/rbac/my-permissions',
  );
}
