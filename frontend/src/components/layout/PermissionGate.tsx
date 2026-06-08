'use client';

import { useTranslations } from 'next-intl';
import { usePermissionStore } from '@/stores/permission-store';
import { Result } from 'antd';

interface PermissionGateProps {
  /** 要求的权限 codename（单个） */
  codename?: string;
  /** 要求的权限列表（满足其一即可） */
  anyCodenames?: string[];
  /** 无权限时的行为: hide（默认隐藏）| disabled | forbidden（显示403页面） */
  fallback?: 'hide' | 'disabled' | 'forbidden';
  children: React.ReactNode;
}

export function PermissionGate({
  codename,
  anyCodenames,
  fallback = 'hide',
  children,
}: PermissionGateProps) {
  const t = useTranslations();
  const { hasPermission, hasAnyPermission, loaded } = usePermissionStore();

  // 未加载完成时放行（避免闪烁），登出用户也放行（由路由守卫处理）
  if (!loaded) return <>{children}</>;

  const hasAccess = codename
    ? hasPermission(codename)
    : anyCodenames
      ? hasAnyPermission(anyCodenames)
      : true;

  if (hasAccess) return <>{children}</>;

  switch (fallback) {
    case 'disabled':
      return <span style={{ opacity: 0.4, pointerEvents: 'none', cursor: 'not-allowed' }}>{children}</span>;
    case 'forbidden':
      return (
        <Result
          status="403"
          title="403"
          subTitle={t('common.permissionDenied')}
        />
      );
    default:
      return null;
  }
}
