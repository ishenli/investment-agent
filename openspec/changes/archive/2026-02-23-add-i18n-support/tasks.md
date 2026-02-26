# 任务：国际化(i18n)支持

**输入**：来自 plan.md 的设计文档
**前置条件**：plan.md（必需）
**参考**：[项目规范](file://openspec/project.md)

**测试**：
- 类型检查：`pnpm run types:check`
- 单元测试：`pnpm test`

**组织方式**：任务按 User Stories 分组，支持增量交付和独立验证。

## 格式说明

`[ID] [P?] [US?] 描述`
- **[P]**：可并行（不同文件，无依赖）
- **[US?]**：所属用户故事（P1, P2, P3...）

## 路径约定

| 类型 | 路径 |
|------|------|
| i18n 配置 | `src/app/lib/i18n/index.ts` |
| 类型定义 | `src/types/user/index.ts` |
| Store | `src/app/store/user/slices/preference/` |
| Components | `src/app/components/I18nProvider.tsx` |
| 翻译文件 | `src/locales/resources/[lang]/[namespace].json` |
| 翻译导出 | `src/locales/index.ts` |

---

## 第0阶段：准备（设计与验证）

- [x] T00 创建变更目录结构 `openspec/changes/add-i18n-support/`
- [x] T01 编写 proposal.md 描述变更意图和影响
- [x] T02 编写 spec delta 规范变更
- [x] T03 运行 `openspec validate add-i18n-support --strict` 验证

---

## 第1阶段：设置（基础设施）

**目的**：类型定义和 i18n 核心配置

- [x] T04 [P] 在 `src/types/user/index.ts` 中添加 `SupportedLanguage` 类型
- [x] T05 [P] 使用现有的 `src/app/lib/i18n/index.ts` i18n 核心配置
- [x] T06 [P] 使用现有的 `src/app/lib/i18n/i18next.d.ts` 类型声明

---

## 第2阶段：翻译文件

**目的**：创建所有语言的翻译文件

- [x] T07 创建 `public/locales/zh-CN/` 目录及其翻译文件
- [x] T09 [P] 创建 `public/locales/en-US/` 目录及其翻译文件
- [x] T11 创建 `src/app/const/languages.ts` 语言常量文件

---

## 第3阶段：Store 集成

**目的**：在 Zustand store 中添加语言持久化

- [x] T12 更新 `src/app/store/user/slices/preference/initialState.ts` 添加默认语言
- [x] T13 通过现有 `updatePreference` action 实现语言更新

---

## 第4阶段：User Story 1 - 语言切换持久化 (优先级：P1) 🎯 MVP

**目标**：用户可以在设置页面切换语言，刷新后保持选择
**独立测试**：切换语言后刷新页面，验证语言保持不变

### 实现

- [x] T14 创建 `src/app/components/I18nProvider.tsx` Provider 组件
- [x] T15 更新 `src/app/providers.tsx` 集成 I18nProvider
- [x] T16 更新 `src/app/(pages)/setting/general/page.tsx` 连接 store
- [x] T17 验证语言切换功能正常工作

**检查点**：P1 功能完整可用

---

## 第5阶段：User Story 2 - UI 文本翻译 (优先级：P2)

**目标**：应用所有文本正确显示选中语言的翻译
**独立测试**：切换语言后检查各页面文本是否更新

### 实现

- [x] T18 审查现有使用 `useTranslation` 的组件
- [x] T19 补充缺失的翻译键
- [x] T20 验证所有命名空间翻译完整

---

## 第6阶段：完善与质量保证

**目的**：跨用户的改进和质量检查

- [x] T21 运行 `pnpm run lint` 并修复问题
- [x] T22 运行 `pnpm run types:check` 确保类型正确
- [x] T23 测试 SSR 水合无错误

---

## 第7阶段：归档准备

- [x] T24 更新所有 TODO 状态为完成
- [x] T25 验证所有场景在 spec.md 中已实现

---

## 依赖关系

### 阶段依赖

- **准备（第0阶段）**：立即进行
- **设置（第1阶段）**：依赖准备完成
- **翻译文件（第2阶段）**：依赖设置 - 需要 i18n 配置
- **Store 集成（第3阶段）**：依赖设置 - 需要类型定义
- **User Story 1（第4阶段）**：依赖翻译文件和 Store 集成
- **User Story 2（第5阶段）**：依赖 User Story 1
- **完善（第6阶段）**：依赖期望的 US 完成

### 并行机会

- T04, T05, T06 可并行
- T07, T08, T09, T10 可并行（不同语言目录）
- T11, T12 可与翻译文件阶段并行