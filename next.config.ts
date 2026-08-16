import type { NextConfig } from 'next';
import { createRequire } from 'module';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');
const projectRoot = dirname(fileURLToPath(import.meta.url));

const isElectron = process.env.BUILD_TARGET === 'electron';

const nextConfig: NextConfig = {
  // Configure allowed development origins for cross-origin requests
  outputFileTracingRoot: projectRoot,
  output: isElectron ? 'standalone' : undefined,
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
        pathname: '/v1/create-qr-code/**',
      },
    ],
  },
  // Next.js standalone build will trace runtime dependencies (e.g. files opened via fs).
  // We do NOT want to bundle runtime log files into the standalone build.
  outputFileTracingExcludes:{
    // exclude our runtime logs directory (rotating log files may not exist during build)
    // NOTE: the key must match ALL routes, including 'next-server' and instrumentation.
    // '/*' etc. fail to match 'next-server' — use '*' / '**' which match everything.
    '*': ['**/logs/**', 'logs/**'],
  },
  serverExternalPackages: [
    // @libsql/client uses native bindings, must not be bundled by webpack
    ...(isElectron ? [] : ['@libsql/client']),
    // hermes-agent uses fully-dynamic import() for plugin discovery (import(modulePath))
    // which webpack cannot statically analyse — let Node.js resolve it at runtime instead
    '@investment-agent/hermes-agent',
  ],
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
