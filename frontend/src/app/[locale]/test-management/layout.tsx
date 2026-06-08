'use client';

import { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Tabs } from 'antd';
import { TagsOutlined, FileTextOutlined, AppstoreOutlined, TeamOutlined, PlayCircleOutlined, BarChartOutlined, SnippetsOutlined, FileProtectOutlined } from '@ant-design/icons';

export default function TestManagementLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations();

  const locale = pathname.split('/')[1];
  const basePath = `/${locale}/test-management`;

  const getActiveTab = () => {
    const p = pathname.replace(basePath, '') || '/';
    if (p.startsWith('/cases')) return 'cases';
    if (p.startsWith('/suites')) return 'suites';
    if (p.startsWith('/versions')) return 'versions';
    if (p.startsWith('/reviews')) return 'reviews';
    if (p.startsWith('/review-templates')) return 'review-templates';
    if (p.startsWith('/executions')) return 'executions';
    if (p.startsWith('/report-templates')) return 'report-templates';
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
          { key: 'cases', label: <><FileTextOutlined /> {t('testManagement.cases')}</> },
          { key: 'suites', label: <><AppstoreOutlined /> {t('testManagement.suites')}</> },
          { key: 'versions', label: <><TagsOutlined /> {t('testManagement.versions')}</> },
          { key: 'reviews', label: <><TeamOutlined /> {t('testManagement.reviews')}</> },
          { key: 'review-templates', label: <><SnippetsOutlined /> {t('testManagement.reviewTemplates')}</> },
          { key: 'executions', label: <><PlayCircleOutlined /> {t('testManagement.executions')}</> },
          { key: 'report-templates', label: <><FileProtectOutlined /> {t('testManagement.reportTemplates')}</> },
          { key: 'reports', label: <><BarChartOutlined /> {t('testManagement.reports')}</> },
        ]}
      />
      {children}
    </div>
  );
}
