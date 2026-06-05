'use client';

import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { Tabs } from 'antd';
import { useMemo } from 'react';

export default function CiCdLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();

  const tabItems = useMemo(() => [
    { key: '/ci-cd', label: t('ciCd.pipelines') },
    { key: '/ci-cd/tokens', label: t('ciCd.tokens') },
    { key: '/ci-cd/config', label: t('ciCd.config') },
    { key: '/ci-cd/webhook-events', label: t('ciCd.webhookEvents') },
  ], [t]);

  const localePath = '/' + pathname.split('/').filter(Boolean).slice(1).join('/');
  const activeKey = tabItems.find(item =>
    item.key === localePath || (item.key !== '/ci-cd' && localePath.startsWith(item.key)),
  )?.key || '/ci-cd';

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 16 }}>{t('ciCd.title')}</h2>
      <Tabs
        activeKey={activeKey}
        onChange={(key) => router.push(key)}
        items={tabItems}
      />
      {children}
    </div>
  );
}
