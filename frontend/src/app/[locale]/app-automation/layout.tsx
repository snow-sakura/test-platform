'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Tabs } from 'antd';
import {
  DashboardOutlined, ProjectOutlined, MobileOutlined, AimOutlined,
  FileTextOutlined, AppstoreOutlined, PlayCircleOutlined, ClockCircleOutlined,
  FileProtectOutlined, BellOutlined, SettingOutlined, DropboxOutlined,
} from '@ant-design/icons';

export default function AppAutomationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { key: '/app-automation', icon: <DashboardOutlined />, label: '仪表盘' },
    { key: '/app-automation/projects', icon: <ProjectOutlined />, label: '项目' },
    { key: '/app-automation/devices', icon: <MobileOutlined />, label: '设备管理' },
    { key: '/app-automation/packages', icon: <DropboxOutlined />, label: '包管理' },
    { key: '/app-automation/elements', icon: <AimOutlined />, label: '元素管理' },
    { key: '/app-automation/scenes', icon: <FileTextOutlined />, label: '场景编排' },
    { key: '/app-automation/suites', icon: <AppstoreOutlined />, label: '测试套件' },
    { key: '/app-automation/executions', icon: <PlayCircleOutlined />, label: '执行记录' },
    { key: '/app-automation/scheduled-tasks', icon: <ClockCircleOutlined />, label: '定时任务' },
    { key: '/app-automation/reports', icon: <FileProtectOutlined />, label: '报告' },
    { key: '/app-automation/notifications', icon: <BellOutlined />, label: '通知管理' },
    { key: '/app-automation/config', icon: <SettingOutlined />, label: '环境配置' },
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
