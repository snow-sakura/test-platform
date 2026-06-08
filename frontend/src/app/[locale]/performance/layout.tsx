'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { Tabs } from 'antd';
import { useMemo } from 'react';

export default function PerformanceLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();

  const tabItems = useMemo(() => [
    { key: '/performance', label: t('performance.layout.scenes') },
    { key: '/performance/executions', label: t('performance.layout.executions') },
    { key: '/performance/reports', label: t('performance.layout.reports') },
  ], []);

  const localePath = '/' + pathname.split('/').filter(Boolean).slice(1).join('/');
  const activeKey = tabItems.find(item =>
    item.key === localePath || (item.key !== '/performance' && localePath.startsWith(item.key)),
  )?.key || '/performance';

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 16 }}>{t('performance.title')}</h2>
      <Tabs
        activeKey={activeKey}
        onChange={(key) => router.push(key)}
        items={tabItems}
      />
      {children}
    </div>
  );
}
