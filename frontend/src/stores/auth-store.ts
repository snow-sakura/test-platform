/** 用户认证状态管理 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/lib/api/auth';
import * as authApi from '@/lib/api/auth';
import { usePermissionStore } from './permission-store';

interface AuthState {
  user: User | null;
  accessToken: string;
  refreshToken: string;
  isLoading: boolean;

  /** 登录 */
  login: (username: string, password: string) => Promise<void>;
  /** 注册 */
  register: (data: authApi.RegisterRequest) => Promise<void>;
  /** 登出 */
  logout: () => Promise<void>;
  /** 刷新令牌 */
  refreshAuth: () => Promise<boolean>;
  /** 更新个人资料 */
  updateProfile: (data: authApi.UserUpdateRequest) => Promise<void>;
  /** 从 localStorage 恢复 session */
  restoreSession: () => void;
  /** 是否已登录 */
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: '',
      refreshToken: '',
      isLoading: false,

      login: async (username, password) => {
        const res = await authApi.login({ username, password });
        set({
          user: res.user,
          accessToken: res.access_token,
          refreshToken: res.refresh_token,
        });
        usePermissionStore.getState().fetchPermissions();
      },

      register: async (data) => {
        const res = await authApi.register(data);
        set({
          user: res.user,
          accessToken: res.access_token,
          refreshToken: res.refresh_token,
        });
        usePermissionStore.getState().fetchPermissions();
      },

      logout: async () => {
        const { refreshToken: rt } = get();
        try {
          if (rt) {
            await authApi.logout(rt);
          }
        } catch {
          // 登出失败不影响清除本地状态
        }
        set({ user: null, accessToken: '', refreshToken: '' });
        usePermissionStore.getState().reset();
      },

      refreshAuth: async () => {
        const { refreshToken: rt } = get();
        if (!rt) return false;
        try {
          const res = await authApi.refreshToken(rt);
          set({
            user: res.user,
            accessToken: res.access_token,
            refreshToken: res.refresh_token,
          });
          return true;
        } catch {
          set({ user: null, accessToken: '', refreshToken: '' });
          return false;
        }
      },

      updateProfile: async (data) => {
        const updated = await authApi.updateProfile(data);
        set({ user: updated });
      },

      restoreSession: () => {
        // persist 中间件自动恢复，无需额外操作
      },

      isAuthenticated: () => {
        return !!get().accessToken;
      },
    }),
    {
      name: 'auth-store',
      // 不同步 accessToken 到 localStorage（仅 memory 保存），refreshToken 持久化
      partialize: (state) => ({
        user: state.user,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
