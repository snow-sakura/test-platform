'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Menu } from 'antd';
import {
  DashboardOutlined, ApiOutlined, FolderOpenOutlined,
  ThunderboltOutlined, HistoryOutlined, EnvironmentOutlined,
  ClockCircleOutlined, BellOutlined,
} from '@ant-design/icons';
import { useTranslations } from 'next-intl';

/** Horizontal sub-navigation for API testing module */
export default function ApiTestingLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('apiTesting');
  const pathname = usePathname();
  const router = useRouter();

  // Extract current sub-route from path
  const locale = pathname.split('/')[1] || 'zh-cn';
  const currentPath = '/' + pathname.split('/').slice(2).join('/');

  const menuItems = [
    { key: '/api-testing', icon: <DashboardOutlined />, label: t('dashboard') },
    { key: '/api-testing/projects', icon: <ApiOutlined />, label: t('projects') },
    { key: '/api-testing/interfaces', icon: <FolderOpenOutlined />, label: t('interfaces') },
    { key: '/api-testing/automation', icon: <ThunderboltOutlined />, label: t('automation') },
    { key: '/api-testing/environments', icon: <EnvironmentOutlined />, label: t('environments') },
    { key: '/api-testing/history', icon: <HistoryOutlined />, label: t('history') },
    { key: '/api-testing/scheduled-tasks', icon: <ClockCircleOutlined />, label: t('scheduledTasks') },
    { key: '/api-testing/notifications', icon: <BellOutlined />, label: t('notifications') },
  ];

  const selectedKey = menuItems.find((item) => currentPath.startsWith(item.key))?.key || '/api-testing';

  return (
    <div>
      <Menu
        mode="horizontal"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={({ key }) => router.push(`/${locale}${key}`)}
        style={{ marginBottom: 16, borderBottom: '1px solid #f0f0f0' }}
      />
      <div style={{ padding: '0 4px' }}>
        {children}
      </div>
    </div>
  );
}
