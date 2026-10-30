import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@consumet/extensions', 'got-scraping'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'uploads.mangadex.org',
      },
      {
        protocol: 'https',
        hostname: '*.mangadex.network',
      },
    ],
  },
};

export default nextConfig;
