'use client';

import { useTranslations } from 'next-intl';
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
  const t = useTranslations();

  const tabs = [
    { key: '/app-automation', icon: <DashboardOutlined />, label: t('appAutomation.dashboard') },
    { key: '/app-automation/projects', icon: <ProjectOutlined />, label: t('appAutomation.projects') },
    { key: '/app-automation/devices', icon: <MobileOutlined />, label: t('appAutomation.devices') },
    { key: '/app-automation/packages', icon: <DropboxOutlined />, label: t('appAutomation.packages') },
    { key: '/app-automation/elements', icon: <AimOutlined />, label: t('appAutomation.elements') },
    { key: '/app-automation/scenes', icon: <FileTextOutlined />, label: t('appAutomation.scenes') },
    { key: '/app-automation/suites', icon: <AppstoreOutlined />, label: t('appAutomation.suites') },
    { key: '/app-automation/executions', icon: <PlayCircleOutlined />, label: t('appAutomation.executions') },
    { key: '/app-automation/scheduled-tasks', icon: <ClockCircleOutlined />, label: t('appAutomation.scheduledTasks') },
    { key: '/app-automation/reports', icon: <FileProtectOutlined />, label: t('appAutomation.reports') },
    { key: '/app-automation/notifications', icon: <BellOutlined />, label: t('appAutomation.notifications') },
    { key: '/app-automation/config', icon: <SettingOutlined />, label: t('appAutomation.environments') },
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
