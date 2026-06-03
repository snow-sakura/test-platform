'use client';

import { usePathname } from 'next/navigation';
import { Layout } from 'antd';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAppStore } from '@/stores/app-store';

const { Sider, Content } = Layout;

// 不需要布局的页面路径
const NO_LAYOUT_PATHS = ['/login', '/register'];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const pathname = usePathname();

  // 检查是否需要隐藏侧边栏
  const localePath = '/' + pathname.split('/').filter(Boolean).slice(1).join('/');
  const isNoLayout = NO_LAYOUT_PATHS.some((p) => localePath.startsWith(p));

  if (isNoLayout) {
    return <>{children}</>;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={sidebarCollapsed} theme="dark" width={240}>
        <Sidebar />
      </Sider>
      <Layout>
        <Topbar />
        <Content style={{ margin: 24 }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
