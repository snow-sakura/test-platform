import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import AppLayout from '@/components/layout/AppLayout';
import '../globals.css';

const antdLocales: Record<string, any> = {
  'zh-cn': zhCN,
  en: enUS,
};

export const metadata: Metadata = {
  title: 'TestHub',
  description: 'AI 驱动的全栈测试管理平台',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body style={{ margin: 0 }}>
        <NextIntlClientProvider messages={messages}>
          <ConfigProvider locale={antdLocales[locale] || enUS}>
            <AppLayout>{children}</AppLayout>
          </ConfigProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
