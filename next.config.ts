import type { NextConfig } from 'next';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

const isElectron = process.env.BUILD_TARGET === 'electron';

const nextConfig: NextConfig = {
  // Configure allowed development origins for cross-origin requests
  output: isElectron ? 'standalone' : undefined,
  // Next.js standalone build will trace runtime dependencies (e.g. files opened via fs).
  // We do NOT want to bundle runtime log files into the standalone build.
  outputFileTracingExcludes:{
    // exclude our runtime logs directory (rotating log files may not exist during build)
    'api/**': ['**/logs/**'],
  },
  serverExternalPackages: isElectron ? undefined : ['@libsql/client'],
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
