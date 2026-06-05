'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Tabs } from 'antd';
import {
  DashboardOutlined, FileTextOutlined, UnorderedListOutlined,
  RobotOutlined, EditOutlined, SettingOutlined,
} from '@ant-design/icons';

export default function AiGenerationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { key: '/ai-generation/requirement-analysis', icon: <DashboardOutlined />, label: '需求导入与分析' },
    { key: '/ai-generation/generated-cases', icon: <UnorderedListOutlined />, label: '生成任务列表' },
    { key: '/ai-generation/ai-model-config', icon: <RobotOutlined />, label: '模型配置' },
    { key: '/ai-generation/prompt-config', icon: <EditOutlined />, label: '提示词配置' },
    { key: '/ai-generation/generation-config', icon: <SettingOutlined />, label: '生成行为配置' },
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
