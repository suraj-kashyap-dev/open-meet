import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['@open-meet/ui'],
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
  experimental: {
    typedRoutes: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

export default withNextIntl(nextConfig);
