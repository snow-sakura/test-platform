import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  locales: ['zh-cn', 'en'],
  defaultLocale: 'zh-cn',
  localePrefix: 'always',
});

export const config = {
  matcher: ['/', '/((?!api|_next|_vercel|.*\\..*).*)'],
};
