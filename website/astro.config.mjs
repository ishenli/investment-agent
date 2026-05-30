// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import rapide from 'starlight-theme-rapide';

// https://astro.build/config
export default defineConfig({
  image: {
    service: {
      entrypoint: 'astro/assets/services/noop',
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
            { label: '配置指南', link: '/configuration/' },
            { label: '常见问题', link: '/faq/' },
          ],
        },
        {
          label: '产品功能',
          items: [
            { label: '功能特性总览', link: '/features/' },
            { label: '任务管理', link: '/tasks/' },
            { label: 'Agent 管理', link: '/agent-management/' },
            { label: 'AI 技能与工具', link: '/skills/' },
            { label: '工具权限与安全', link: '/permissions/' },
            { label: 'AI 引擎选择', link: '/engines/' },
          ],
        },
        {
          label: '部署与使用',
          items: [
            { label: '桌面应用', link: '/electron/' },
            { label: '自我部署', link: '/self-hosting/' },
          ],
        },
        {
          label: '开发者文档',
          items: [
            { label: '开发者首页', link: '/developer/' },
            { label: '系统架构', link: '/developer/architecture/' },
            { label: '评测系统', link: '/developer/evaluation/' },
            { label: '引擎开发指南', link: '/developer/engines/' },
            { label: '技能开发', link: '/developer/skills-dev/' },
            { label: 'Electron 开发与打包', link: '/developer/electron-dev/' },
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
