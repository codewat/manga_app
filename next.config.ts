import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow MangaDex image domains if next/image is used
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
