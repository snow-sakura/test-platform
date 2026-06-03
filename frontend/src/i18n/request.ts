import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale) {
    locale = 'zh-cn';
  }
  const supported = ['zh-cn', 'en'];
  if (!supported.includes(locale)) {
    const base = locale.split('-')[0];
    locale = base === 'zh' ? 'zh-cn' : 'en';
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
