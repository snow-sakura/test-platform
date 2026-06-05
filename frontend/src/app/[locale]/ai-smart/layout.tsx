'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Tabs } from 'antd';
import {
  DashboardOutlined, ExperimentOutlined, FileTextOutlined, PlayCircleOutlined,
} from '@ant-design/icons';

export default function AISmartLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { key: '/ai-smart', icon: <DashboardOutlined />, label: 'AI 执行' },
    { key: '/ai-smart/cases', icon: <ExperimentOutlined />, label: 'AI 用例' },
    { key: '/ai-smart/executions', icon: <PlayCircleOutlined />, label: '执行记录' },
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
