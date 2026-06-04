'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Layout, Button, Breadcrumb, Select, Dropdown, Space, Avatar } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAppStore } from '@/stores/app-store';
import { useAuthStore } from '@/stores/auth-store';

const { Header } = Layout;

const localeMap: Record<string, string> = {
  'zh-cn': '中文',
  en: 'English',
};

// 不需要侧边栏和面包屑的路径
const NO_LAYOUT_PATHS = ['/login', '/register'];

export default function Topbar() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // 检查是否在不显示布局的页面
  const localePath = '/' + pathname.split('/').filter(Boolean).slice(1).join('/');
  const isNoLayout = NO_LAYOUT_PATHS.some((p) => localePath.startsWith(p));

  if (isNoLayout) return null;

  // 面包屑路径 → i18n key 映射（URL 段名可能与 i18n key 不同）
  const breadcrumbKeyMap: Record<string, string> = {
    home: 'nav.home',
    projects: 'nav.projects',
    settings: 'nav.configuration',
    profile: 'auth.profile',
  };

  const pathSegments = pathname.split('/').filter(Boolean).slice(1);

  const breadcrumbItems = [
    { title: 'TestPlate' },
    ...pathSegments.map((seg) => {
      const key = breadcrumbKeyMap[seg];
      const label = key ? t(key as any) : seg;
      return { title: label };
    }),
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('auth.profile'),
      onClick: () => router.push('/profile'),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('auth.logout'),
      onClick: async () => {
        await logout();
        router.push('/login');
      },
    },
  ];

  return (
    <Header
      style={{
        background: '#fff',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button
          type="text"
          icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={toggleSidebar}
        />
        <Breadcrumb items={breadcrumbItems} />
      </div>
      <Space>
        <Select
          value={language}
          onChange={(val) => {
            setLanguage(val);
            // 切换到对应语言的 URL 前缀，触发 next-intl middleware 加载对应 messages
            const segments = pathname.split('/').filter(Boolean);
            segments[0] = val;
            router.push('/' + segments.join('/'));
          }}
          style={{ width: 100 }}
          options={Object.entries(localeMap).map(([value, label]) => ({ value, label }))}
        />
        {user ? (
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Button type="text" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Avatar size="small" icon={<UserOutlined />} />
              {user.username}
            </Button>
          </Dropdown>
        ) : (
          <Button type="link" onClick={() => router.push('/login')}>
            {t('auth.login')}
          </Button>
        )}
      </Space>
    </Header>
  );
}
