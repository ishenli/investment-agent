import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Configure allowed development origins for cross-origin requests

  rewrites: async () => {
    return [
      // {
      //   source: '/stock',
      //   destination: '/pages/stock',
      // },
      // {
      //   source: '/stock/:path*',
      //   destination: '/pages/stock/:path*',
      // },
      // {
      //   source: '/dashboard',
      //   destination: '/pages/dashboard',
      // },
      // {
      //   source: '/account',
      //   destination: '/pages/account',
      // },
    ];
  },
};

export default nextConfig;
