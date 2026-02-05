import { defineConfig } from 'vitest/config';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/drizzle': path.resolve(__dirname, './drizzle'),
      '@chat': path.resolve(__dirname, './src/app/(pages)/chat'),
      '@renderer': path.resolve(__dirname, './src/app'),
      '@server': path.resolve(__dirname, './src/server'),
      '@typings': path.resolve(__dirname, './src/types'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@drizzle': path.resolve(__dirname, './drizzle'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*',
    ],
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/drizzle': path.resolve(__dirname, './drizzle'),
      '@chat': path.resolve(__dirname, './src/app/(pages)/chat'),
      '@renderer': path.resolve(__dirname, './src/app'),
      '@server': path.resolve(__dirname, './src/server'),
      '@typings': path.resolve(__dirname, './src/types'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@drizzle': path.resolve(__dirname, './drizzle'),
    },
  },
});