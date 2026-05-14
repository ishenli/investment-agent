// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import rapide from 'starlight-theme-rapide';

// https://astro.build/config
export default defineConfig({
  image: {
    service: {
      entrypoint: 'astro/assets/services/passthrough',
    },
  },
  site: 'https://ishenli.github.io',
  base: '/investment-agent',
  integrations: [
    starlight({
      title: 'Investment Agent',
      description: 'AI-powered local investment analysis tool',
      plugins: [rapide()],
      sidebar: [
        {
          label: '开始使用',
          items: [
            { label: '首页', link: '/' },
            { label: '快速开始', link: '/quick-start/' },
            { label: '常见问题', link: '/faq/' },
          ],
        },
        {
          label: '核心概念',
          items: [
            { label: '功能特性', link: '/features/' },
            { label: 'AI 引擎', link: '/engines/' },
            { label: 'AI 技能', link: '/skills/' },
            { label: '架构设计', link: '/architecture/' },
            { label: 'Electron 桌面应用', link: '/electron/' },
          ],
        },
        {
          label: '其他',
          items: [
            { label: '更新日志', link: '/changelog/' },
          ],
        },
      ],
    }),
  ],
  vite: {
    resolve: {
      alias: {
        'nanoid/non-secure': '/src/lib/nanoid-compat.ts',
      },
    },
  },
});
