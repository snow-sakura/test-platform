/** 权限查询 hook — 封装 permission store，组件挂载时自动加载 */
'use client';

import { useEffect } from 'react';
import { usePermissionStore } from '@/stores/permission-store';
import { useAuthStore } from '@/stores/auth-store';

export function usePermissions() {
  const store = usePermissionStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (isAuthenticated() && !store.loaded && !store.loading) {
      store.fetchPermissions();
    }
  }, [accessToken]);

  return store;
}
