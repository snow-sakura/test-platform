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
  DeploymentUnitOutlined,
} from '@ant-design/icons';
import { usePermissions } from '@/hooks/usePermissions';

/** 各菜单项对应的访问权限（满足其一即可显示） */
const MENU_PERMISSIONS: Record<string, string[]> = {
  '/home': ['dashboard.view'],
  '/projects': ['project.view'],
  '/ai-generation': ['requirement_analysis.view'],
  '/api-testing': ['api_testing.view'],
  '/test-management': ['test_mgmt.view'],
  '/ui-automation': ['ui_auto.view'],
  '/app-automation': ['app_auto.view'],
  '/performance': ['performance.view'],
  '/ai-smart': ['ai_smart.view'],
  '/ai-evaluator': ['ai_eval.view'],
  '/data-factory': ['data_factory.view'],
  '/ci-cd': ['ci_cd.view'],
  '/settings': ['settings.view'],
};

export default function Sidebar() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { hasAnyPermission } = usePermissions();

  const selectedKey = '/' + pathname.split('/').filter(Boolean).slice(1).join('/');

  const allMenuItems: MenuProps['items'] = [
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
    { key: '/ci-cd', icon: <DeploymentUnitOutlined />, label: t('nav.ciCd') || 'CI/CD' },
    { key: '/settings', icon: <SettingOutlined />, label: t('nav.configuration') },
  ];

  // 根据权限过滤菜单：无权限菜单项隐藏，连续分隔符合并为一个
  const menuItems = allMenuItems.filter((item) => {
    if (!item || 'type' in (item as any)) return true; // 分隔符保留（后续清理）
    const key = (item as any).key as string;
    const requiredPerms = MENU_PERMISSIONS[key];
    if (!requiredPerms) return true; // 无权限要求则显示
    return hasAnyPermission(requiredPerms);
  // 清理：去掉首尾分隔符和连续分隔符
  }).filter((item, index, arr) => {
    if (!item || 'type' in (item as any)) {
      if (index === 0 || index === arr.length - 1) return false;
      const prev = arr[index - 1];
      if (prev && 'type' in (prev as any)) return false;
    }
    return true;
  });

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
