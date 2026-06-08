'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Tabs } from 'antd';
import {
  DashboardOutlined, FileTextOutlined, UnorderedListOutlined,
  RobotOutlined, EditOutlined, SettingOutlined,
} from '@ant-design/icons';
import { useTranslations } from 'next-intl';

export default function AiGenerationLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('aiGeneration');
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { key: '/ai-generation/requirement-analysis', icon: <DashboardOutlined />, label: t('layout.requirementAnalysis') },
    { key: '/ai-generation/generated-cases', icon: <UnorderedListOutlined />, label: t('layout.taskList') },
    { key: '/ai-generation/ai-model-config', icon: <RobotOutlined />, label: t('layout.modelConfig') },
    { key: '/ai-generation/prompt-config', icon: <EditOutlined />, label: t('layout.promptConfig') },
    { key: '/ai-generation/generation-config', icon: <SettingOutlined />, label: t('layout.generationConfig') },
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
