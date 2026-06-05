'use client';

import { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Tabs } from 'antd';
import { TagsOutlined, FileTextOutlined, AppstoreOutlined, TeamOutlined, PlayCircleOutlined, BarChartOutlined } from '@ant-design/icons';

export default function TestManagementLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const locale = pathname.split('/')[1];
  const basePath = `/${locale}/test-management`;

  const getActiveTab = () => {
    const p = pathname.replace(basePath, '') || '/';
    if (p.startsWith('/cases')) return 'cases';
    if (p.startsWith('/suites')) return 'suites';
    if (p.startsWith('/versions')) return 'versions';
    if (p.startsWith('/reviews')) return 'reviews';
    if (p.startsWith('/executions')) return 'executions';
    if (p.startsWith('/reports')) return 'reports';
    return 'cases';
  };

  return (
    <div>
      <Tabs
        activeKey={getActiveTab()}
        onChange={(key) => router.push(`${basePath}/${key}`)}
        style={{ marginBottom: 16 }}
        items={[
          { key: 'cases', label: <><FileTextOutlined /> 测试用例</> },
          { key: 'suites', label: <><AppstoreOutlined /> 测试套件</> },
          { key: 'versions', label: <><TagsOutlined /> 版本管理</> },
          { key: 'reviews', label: <><TeamOutlined /> 评审管理</> },
          { key: 'executions', label: <><PlayCircleOutlined /> 执行管理</> },
          { key: 'reports', label: <><BarChartOutlined /> 测试报告</> },
        ]}
      />
      {children}
    </div>
  );
}
