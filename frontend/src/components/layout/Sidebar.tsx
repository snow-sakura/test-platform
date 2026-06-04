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
    { key: 'ai_generation', icon: <ThunderboltOutlined />, label: t('nav.aiGeneration') },
    { key: '/api-testing', icon: <ApiOutlined />, label: t('nav.apiTesting') },
    { key: 'ui_auto', icon: <MonitorOutlined />, label: t('nav.uiAutomation'), disabled: true },
    { key: 'data_factory', icon: <DatabaseOutlined />, label: t('nav.dataFactory'), disabled: true },
    { key: 'app_auto', icon: <MobileOutlined />, label: t('nav.appAutomation'), disabled: true },
    { key: 'ai_intel', icon: <RobotOutlined />, label: t('nav.aiIntelligent'), disabled: true },
    { key: 'ai_review', icon: <MessageOutlined />, label: t('nav.aiReviewer'), disabled: true },
    { key: '/settings', icon: <SettingOutlined />, label: t('nav.configuration') },
  ];

  const onClick: MenuProps['onClick'] = (info) => {
    if (info.key.startsWith('/')) {
      router.push(info.key);
    } else if (info.key === 'ai_generation') {
      router.push('/projects');
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
