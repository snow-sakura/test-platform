'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { Tabs } from 'antd';
import {
  DashboardOutlined, ExperimentOutlined, FileTextOutlined, PlayCircleOutlined,
} from '@ant-design/icons';

export default function AISmartLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { key: '/ai-smart', icon: <DashboardOutlined />, label: t('aiSmart.layout.execution') },
    { key: '/ai-smart/cases', icon: <ExperimentOutlined />, label: t('aiSmart.layout.cases') },
    { key: '/ai-smart/executions', icon: <PlayCircleOutlined />, label: t('aiSmart.layout.executions') },
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
