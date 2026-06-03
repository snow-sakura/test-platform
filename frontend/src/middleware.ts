import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['zh-cn', 'en'],
  defaultLocale: 'zh-cn',
  localeDetection: true,
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
