# 实现计划：国际化(i18n)支持

**分支**：`ishenli/i18n-setup` | **日期**：2026-02-22
**输入**：国际化功能需求

## 概要

使用 react-i18next 实现应用的国际化支持，支持 2 种语言（zh-CN en-US），并通过 Zustand store 持久化用户的语言偏好。

## 技术上下文

**语言/版本**：TypeScript 5.9 / Node.js >= 20
**主要依赖**：Next.js 16, React 19, i18next 25.8, react-i18next 16.5
**存储**：LocalStorage (LOBE_PREFERENCE key)
**测试**：Vitest
**目标平台**：桌面 Web (Electron + Web)
**项目类型**：Next.js App Router (SSR + Client)
**性能目标**：语言切换即时生效，无闪烁
**约束条件**：SSR 兼容，禁用 suspense 模式

## 规范检查

- [x] 符合项目 TypeScript 严格模式
- [x] 遵循 Zustand store 切片架构模式
- [x] OpenSpec delta 格式正确

## 项目结构

### 文档（此功能）

```text
openspec/changes/add-i18n-support/
├── proposal.md              # 变更提案
├── plan.md                  # 此文件
├── tasks.md                 # 任务清单
└── specs/
    └── i18n/                # i18n capability
        └── spec.md          # Delta 变更
```

### 源代码（项目根目录）

```text
src/
├── locales/                    # 翻译文件目录（静态导入，打包进 ASAR）
│   ├── index.ts               # 翻译资源统一导出
│   └── resources/
│       ├── zh-CN/
│       │   ├── common.json
│       │   ├── chat.json
│       │   └── ...
│       ├── en-US/
│       └── ja-JP/
├── app/
│   ├── lib/
│   │   └── i18n/              # i18n 配置
│   │       ├── index.ts       # 核心初始化
│   │       └── i18next.d.ts   # 类型声明
│   ├── components/
│   │   └── I18nProvider.tsx   # Provider 组件
│   ├── store/user/slices/preference/
│   │   ├── initialState.ts    # 默认语言
│   │   └── action.ts          # updateLanguage action
│   └── providers.tsx          # 集成 I18nProvider
└── types/
    └── user/index.ts          # SupportedLanguage 类型
```

**Electron 打包说明**：
- 翻译文件使用静态导入（import），随代码一起打包进 ASAR
- 无需运行时文件读取，避免 Electron 文件系统兼容问题
- SSR 和客户端渲染使用相同的翻译资源，避免水合不匹配

## 需求拆分

### User Stories (按优先级排序)

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P1 | 用户可以在设置页面切换应用语言，刷新后保持选择 | 切换语言后刷新页面，语言不变 |
| P2 | 应用所有文本正确显示选中语言的翻译 | 切换语言后所有 UI 文本更新 |
| P3 | 应用自动检测浏览器语言作为默认值 | 首次访问使用浏览器语言 |

## 技术架构

### 数据流
```
[用户选择语言] → [updateLanguage action] → [i18n.changeLanguage()]
                        ↓
              [updatePreference] → [localStorage] → [持久化]
```

### 状态管理
- **服务端**: 默认 zh-CN
- **客户端**: Zustand store (preference.language)
- **缓存策略**: LocalStorage (LOBE_PREFERENCE)

### 翻译命名空间

| 命名空间 | 用途 | 使用文件数 |
|---------|------|-----------|
| common | 通用文本 | 5+ |
| chat | 对话功能 | 12+ |
| tool | 工具功能 | 4+ |
| setting | 设置页面 | 1+ |
| plugin | 插件功能 | 1+ |
| topic | 话题管理 | 2+ |
| portal | Portal 功能 | 3+ |
| components | 共享组件 | 1+ |

## 复杂性跟踪

无违规，方案简洁。

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| SSR 水合不匹配 | 高 | 禁用 suspense，客户端初始化语言 |
| 翻译键缺失 | 中 | 使用 fallback 机制 |
| 翻译文件过大 | 低 | 按命名空间拆分 |

## 性能考虑

- 翻译文件静态导入，无运行时加载开销
- 语言切换即时生效，无需页面刷新

## 安全考虑

- 翻译内容为静态 JSON，无安全风险
- localStorage 存储语言偏好，无敏感数据

## 测试策略

- **单元测试**: i18n 初始化、语言切换逻辑
- **集成测试**: 设置页面语言切换流程
- **端到端测试**: 完整语言切换和持久化验证