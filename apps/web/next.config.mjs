/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next 15.1+ overlays a "static route" indicator in dev that can interfere
  // with Playwright clicks and delay the `load` event. Keep dev UI quiet.
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

export default nextConfig;
