'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Menu, message } from 'antd';
import type { MenuProps } from 'antd';
import {
  HomeOutlined,
  FolderOutlined,
  ThunderboltOutlined,
  ApiOutlined,
  MonitorOutlined,
  DatabaseOutlined,
  MobileOutlined,
  RobotOutlined,
  MessageOutlined,
  SettingOutlined,
  FileTextOutlined,
  ToolOutlined,
  BarChartOutlined,
} from '@ant-design/icons';

export default function Sidebar() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();

  const selectedKey = '/' + pathname.split('/').filter(Boolean).slice(1).join('/');

  const menuItems: MenuProps['items'] = [
    { key: '/home', icon: <HomeOutlined />, label: t('nav.home') },
    { key: '/projects', icon: <FolderOutlined />, label: t('nav.projects') },
    { type: 'divider' } as any,
    { key: '/ai-generation', icon: <ThunderboltOutlined />, label: t('nav.aiGeneration') },
    { key: '/api-testing', icon: <ApiOutlined />, label: t('nav.apiTesting') },
    { key: '/test-management', icon: <FileTextOutlined />, label: t('nav.testManagement') },
    { key: '/ui-automation', icon: <MonitorOutlined />, label: t('nav.uiAutomation') },
    { key: '/app-automation', icon: <MobileOutlined />, label: t('nav.appAutomation') },
    { key: '/performance', icon: <BarChartOutlined />, label: t('nav.performance') || '性能测试' },
    { key: '/ai-smart', icon: <RobotOutlined />, label: t('nav.aiIntelligent') },
    { key: '/ai-evaluator', icon: <MessageOutlined />, label: t('nav.aiReviewer') },
    { key: '/data-factory', icon: <ToolOutlined />, label: t('nav.dataFactory') || '数据工厂' },
    { key: '/settings', icon: <SettingOutlined />, label: t('nav.configuration') },
  ];

  const onClick: MenuProps['onClick'] = (info) => {
    if (info.key.startsWith('/')) {
      router.push(info.key);
    } else {
      message.info(t('common.comingSoon'));
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: 18,
        }}
      >
        TestPlate
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={onClick}
      />
    </div>
  );
}
