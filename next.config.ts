import type { NextConfig } from 'next';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const isElectron = process.env.BUILD_TARGET === 'electron';

const nextConfig: NextConfig = {
  // Configure allowed development origins for cross-origin requests
  output: isElectron ? 'standalone' : undefined,
  serverExternalPackages: ['better-sqlite3'],
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
  },
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
