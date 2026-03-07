# 实现计划：Skills Management Panel

**分支**：`add-skills-management` | **日期**：2026-02-28 | **规范**：`specs/skills-management/spec.md`
**输入**：来自 `/specs/skills-management/spec.md` 的功能规范

## 概要

为 Settings 页面添加 Skills 管理面板，允许用户查看、启用/禁用、搜索和筛选 AI 技能。技能按功能类型（brainstorming、debugging 等）和来源（official、community、custom）分类。使用分层架构：Controller → Service → Repository + Zustand Store 状态管理。

## 技术上下文

**语言/版本**：TypeScript 5+ / Node.js >= 20
**主要依赖**：Next.js 15+, React 19, Drizzle ORM, Zustand, shadcn/ui
**存储**：LibSQL (SQLite dialect)
**测试**：Vitest, React Testing Library
**目标平台**：桌面 Web (Electron + Web)
**项目类型**：Next.js App Router (SSR + Client)
**性能目标**：API 响应 < 500ms，技能列表加载 < 2s
**约束条件**：必须兼容 Electron，遵循项目分层架构规范

## 规范检查

- 检查是否符合 [Controller 规则](.claude/rules/controller-rule.md)
- 检查是否符合 [Service 规则](.claude/rules/service-rule.md)
- 检查是否符合 [Repository 规则](.claude/rules/repository-rule.md)
- 检查是否符合 [Store 规则](.claude/rules/store-rule.md)
- 检查 TypeScript 严格模式约束
- 检查 OpenSpec delta 格式正确性

## 项目结构

### 文档（此功能）

```text
openspec/changes/add-skills-management/
├── proposal.md              # 变更提案
├── plan.md                  # 此文件
├── tasks.md                 # 任务清单
└── specs/
    └── skills-management/    # 新的 capability
        └── spec.md          # 完整的需求规范
```

### 源代码（项目根目录）

```text
src/
├── drizzle/schema/
│   └── skills.ts            # NEW: skills table schema
├── server/
│   ├── repository/
│   │   └── skillRepository.ts       # NEW
│   ├── service/
│   │   └── skillService.ts          # NEW
│   └── controller/
│       └── skillController.ts       # NEW
├── store/skills/                    # NEW
│   ├── initialState.ts
│   ├── slices/
│   │   ├── skills/
│   │   │   ├── action.ts
│   │   │   └── initialState.ts
│   │   └── ...
│   └── store.ts
├── app/
│   ├── api/skills/
│   │   └── route.ts         # NEW: API handler
│   └── (pages)/setting/
│       └── skills/
│           ├── page.tsx     # NEW: Main page
│           └── components/
│               ├── SkillCard.tsx    # NEW
│               └── SkillGrid.tsx    # NEW
└── typings/
    └── skill.ts             # NEW: TypeScript types
```

**结构决策**：遵循现有项目模式，参考 `setting/agent/page.tsx` 的列表 + 卡片布局，使用 `Tab` 组件进行分类筛选。

## 需求拆分

### User Stories (按优先级排序)

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P1 | 查看所有可用技能列表并启用/禁用 | 打开 `/setting/skills`，看到技能列表，点击开关能切换状态 |
| P2 | 搜索和筛选技能 | 输入关键词能过滤列表，选择分类能过滤 |
| P3 | 创建和删除自定义技能 | 添加新技能后出现在列表中，删除后消失 |

## 技术架构

### 数据流
```
User Action (Toggle/Search)
 ↓
SkillsComponent (React)
 ↓
Zustand Store (skills/skills action)
 ↓
API Call: GET/PUT /api/skills
 ↓
SkillController (withRequestContext)
 ↓
SkillService (validate, business logic)
 ↓
SkillRepository (DB operation)
 ↓
Response → Store Update → Component Re-render
```

### 状态管理
- **服务端**: SQLite 数据库通过 Drizzle ORM
- **客户端**: Zustand store with DevTools, 按切片模式组织
- **缓存策略**: 初始加载从 API 获取，更新操作同步到服务端

### 外部集成
- **Drizzle ORM**: skills 表 CRUD 操作
- **Zustand**: 客户端状态管理，搜索/筛选状态
- **shadcn/ui**: Card, Switch, Input, Tabs, Badge 组件
- **React i18next**: 国际化支持

## 数据库 Schema

```typescript
skillsTable: pgTable('skills', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(), // brainstorming, debugging, etc.
  source: text('source').notNull(), // 'official' | 'community' | 'custom'
  isEnabled: boolean('is_enabled').notNull().default(true),
  icon: text('icon'), // emoji or icon name
  config: json('config'), // skill config (optional)
  userId: integer('user_id').notNull(), // per-user isolation
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

## 复杂性跟踪

无需额外复杂性，所有需求可通过标准模式和项目现有设施满足。

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 技能数据迁移（从现有配置到数据库） | 中 | 提供 `/api/skills/sync` 同步接口 |
| 多用户技能数据隔离 | 低 | Schema 中有 userId 字段，Service 层验证 |
| 内置技能误删除 | 低 | Service 层检查 source === 'official' 拒绝 |

## 性能考虑

- API 响应 < 500ms（单个技能列表查询）
- 首屏加载 < 2s（包含技能列表）
- 搜索/筛选使用客户端过滤（已加载列表）
- 技能数量 < 100 条时无需分页

## 安全考虑

- 所有 API 请求需通过 AuthService 验证用户身份
- 用户只能操作自己的技能（userId 校验）
- 内置技能的 slug 是预定义的，防止冲突

## 测试策略

- **单元测试**: SkillRepository (CRUD), SkillService (业务逻辑)
- **集成测试**: API 端点 (/api/skills CRUD)
- **组件测试**: SkillCard 组件渲染和交互