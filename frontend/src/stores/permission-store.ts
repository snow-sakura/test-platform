/** 用户权限状态管理 */
import { create } from 'zustand';
import { getMyPermissions } from '@/lib/api/rbac';

interface PermissionState {
  /** 权限 codename 列表 */
  permissions: string[];
  /** 是否超级用户 */
  isSuperuser: boolean;
  /** 是否已加载 */
  loaded: boolean;
  /** 正在加载 */
  loading: boolean;

  /** 从后端加载当前用户权限 */
  fetchPermissions: () => Promise<void>;
  /** 检查是否拥有指定权限 */
  hasPermission: (codename: string) => boolean;
  /** 检查是否拥有任意一个权限 */
  hasAnyPermission: (codenames: string[]) => boolean;
  /** 检查是否拥有全部权限 */
  hasAllPermissions: (codenames: string[]) => boolean;
  /** 重置（登出时调用） */
  reset: () => void;
}

export const usePermissionStore = create<PermissionState>()((set, get) => ({
  permissions: [],
  isSuperuser: false,
  loaded: false,
  loading: false,

  fetchPermissions: async () => {
    set({ loading: true });
    try {
      const res = await getMyPermissions();
      set({
        permissions: res.data.permissions,
        isSuperuser: res.data.is_superuser,
        loaded: true,
        loading: false,
      });
    } catch {
      set({ permissions: [], isSuperuser: false, loaded: false, loading: false });
    }
  },

  hasPermission: (codename: string) => {
    const { isSuperuser, permissions } = get();
    return isSuperuser || permissions.includes(codename);
  },

  hasAnyPermission: (codenames: string[]) => {
    const { isSuperuser, permissions } = get();
    if (isSuperuser) return true;
    return codenames.some((c) => permissions.includes(c));
  },

  hasAllPermissions: (codenames: string[]) => {
    const { isSuperuser, permissions } = get();
    if (isSuperuser) return true;
    return codenames.every((c) => permissions.includes(c));
  },

  reset: () => {
    set({ permissions: [], isSuperuser: false, loaded: false, loading: false });
  },
}));
