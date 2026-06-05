'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Tabs } from 'antd';
import {
  DashboardOutlined, ProjectOutlined, AimOutlined, FileTextOutlined,
  ThunderboltOutlined, EnvironmentOutlined, ClockCircleOutlined, BellOutlined,
  BugOutlined, AppstoreOutlined, HistoryOutlined, FileProtectOutlined,
} from '@ant-design/icons';

export default function UiAutomationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { key: '/ui-automation', icon: <DashboardOutlined />, label: '仪表盘' },
    { key: '/ui-automation/projects', icon: <ProjectOutlined />, label: '项目' },
    { key: '/ui-automation/elements', icon: <AimOutlined />, label: '元素与页面对象' },
    { key: '/ui-automation/scripts', icon: <FileTextOutlined />, label: '脚本' },
    { key: '/ui-automation/test-cases', icon: <BugOutlined />, label: '测试用例' },
    { key: '/ui-automation/test-suites', icon: <AppstoreOutlined />, label: '测试套件' },
    { key: '/ui-automation/executions', icon: <HistoryOutlined />, label: '执行记录' },
    { key: '/ui-automation/reports', icon: <FileProtectOutlined />, label: '报告' },
    { key: '/ui-automation/environments', icon: <EnvironmentOutlined />, label: '环境配置' },
    { key: '/ui-automation/scheduled-tasks', icon: <ClockCircleOutlined />, label: '定时任务' },
    { key: '/ui-automation/notifications', icon: <BellOutlined />, label: '通知' },
  ];

  const currentTab = '/' + pathname.split('/').filter(Boolean).slice(1).join('/');

  return (
    <div>
      <Tabs
        activeKey={currentTab}
        onChange={(key) => router.push(key)}
        items={tabs}
        style={{ marginBottom: 16 }}
      />
      {children}
    </div>
  );
}
