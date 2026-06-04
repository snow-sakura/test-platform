'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Menu } from 'antd';
import {
  DashboardOutlined, ApiOutlined, FolderOpenOutlined,
  ThunderboltOutlined, HistoryOutlined, EnvironmentOutlined,
  ClockCircleOutlined, BellOutlined,
} from '@ant-design/icons';
import { useTranslations } from 'next-intl';

/** 接口测试模块二级水平导航布局 */
export default function ApiTestingLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();

  // 从路径中提取当前子路由
  const locale = pathname.split('/')[1] || 'zh-cn';
  const currentPath = '/' + pathname.split('/').slice(2).join('/');

  const menuItems = [
    { key: '/api-testing', icon: <DashboardOutlined />, label: '仪表盘' },
    { key: '/api-testing/projects', icon: <ApiOutlined />, label: 'API项目' },
    { key: '/api-testing/interfaces', icon: <FolderOpenOutlined />, label: '接口管理' },
    { key: '/api-testing/automation', icon: <ThunderboltOutlined />, label: '自动化' },
    { key: '/api-testing/environments', icon: <EnvironmentOutlined />, label: '环境管理' },
    { key: '/api-testing/history', icon: <HistoryOutlined />, label: '请求历史' },
    { key: '/api-testing/scheduled-tasks', icon: <ClockCircleOutlined />, label: '定时任务' },
    { key: '/api-testing/notifications', icon: <BellOutlined />, label: '通知管理' },
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
