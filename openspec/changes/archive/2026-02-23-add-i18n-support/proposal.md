# Change: 添加国际化(i18n)支持

## Why

项目已安装 i18next 和 react-i18next，且有 35+ 文件使用了 `useTranslation` hook，但缺少初始化配置和翻译文件。设置页面有语言切换 UI 但未实现持久化，用户无法真正切换应用语言。

## What Changes

- 创建 i18n 初始化配置文件，配置 react-i18next
- 创建 4 种语言（zh-CN en-US）的翻译文件
- 在 Zustand store 中添加语言偏好持久化
- 创建 I18nProvider 组件集成到 Provider 树
- 更新设置页面连接 store 实现语言切换持久化

## Impact

- **新增文件**：
  - `src/app/lib/i18n/index.ts` - i18n 核心配置
  - `src/app/lib/i18n/i18next.d.ts` - TypeScript 类型声明
  - `src/locales/**` - 翻译文件目录（静态导入，打包进 ASAR）
  - `src/app/components/I18nProvider.tsx` - i18n Provider 组件

- **修改文件**：
  - `src/types/user/index.ts` - 添加 `SupportedLanguage` 类型
  - `src/app/store/user/slices/preference/initialState.ts` - 添加默认语言
  - `src/app/store/user/slices/preference/action.ts` - 添加 `updateLanguage` action
  - `src/app/providers.tsx` - 集成 I18nProvider
  - `src/app/(pages)/setting/general/page.tsx` - 连接 store

- **影响的功能模块**：
  - 设置页面语言切换功能
  - 所有使用 `useTranslation` 的组件（35+ 文件）