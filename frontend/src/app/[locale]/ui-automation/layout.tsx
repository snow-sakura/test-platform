'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations();

  const tabs = [
    { key: '/ui-automation', icon: <DashboardOutlined />, label: t('uiAutomation.dashboard') },
    { key: '/ui-automation/projects', icon: <ProjectOutlined />, label: t('uiAutomation.projects') },
    { key: '/ui-automation/elements', icon: <AimOutlined />, label: t('uiAutomation.elements') },
    { key: '/ui-automation/scripts', icon: <FileTextOutlined />, label: t('uiAutomation.scripts') },
    { key: '/ui-automation/test-cases', icon: <BugOutlined />, label: t('uiAutomation.testCases') },
    { key: '/ui-automation/test-suites', icon: <AppstoreOutlined />, label: t('uiAutomation.testSuites') },
    { key: '/ui-automation/executions', icon: <HistoryOutlined />, label: t('uiAutomation.executions') },
    { key: '/ui-automation/reports', icon: <FileProtectOutlined />, label: t('uiAutomation.reports') },
    { key: '/ui-automation/environments', icon: <EnvironmentOutlined />, label: t('uiAutomation.environments') },
    { key: '/ui-automation/scheduled-tasks', icon: <ClockCircleOutlined />, label: t('uiAutomation.scheduledTasks') },
    { key: '/ui-automation/notifications', icon: <BellOutlined />, label: t('uiAutomation.notifications') },
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
