'use client';

import { useTranslations } from 'next-intl';
import { RocketOutlined } from '@ant-design/icons';

export default function ComingSoon() {
  const t = useTranslations();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        color: '#999',
      }}
    >
      <RocketOutlined style={{ fontSize: 64, marginBottom: 16 }} />
      <div style={{ fontSize: 20, fontWeight: 500 }}>{t('common.comingSoon')}</div>
    </div>
  );
}
