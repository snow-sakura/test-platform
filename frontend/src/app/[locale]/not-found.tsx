'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations();
  const params = useParams();
  const locale = params.locale as string;

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
      <div style={{ fontSize: 64, marginBottom: 16 }}>404</div>
      <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 24 }}>{t('pageNotFound')}</div>
      <Link href={`/${locale}/home`} style={{ color: '#1677ff' }}>
        {t('backToHome')}
      </Link>
    </div>
  );
}
