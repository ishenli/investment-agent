# 任务：Skills Management Panel

**输入**：来自 `/specs/skills-management/spec.md` 的设计文档
**前置条件**：plan.md
**参考**：[项目规范](../project.md)

**测试**：
- 类型检查：`pnpm type-check`
- 单元测试：`pnpm test`

**组织方式**：任务按 User Stories 分组，支持增量交付和独立验证。

## 格式说明

`[ID] [P?] [US?] 描述`
- **[P]**：可并行（不同文件，无依赖）
- **[US?]**：所属用户故事（P1, P2, P3...）

## 路径约定

| 类型 | 路径 |
|------|------|
| Database Schema | `src/drizzle/schema/skills.ts` |
| API Routes | `src/app/api/skills/route.ts` |
| Controller | `src/server/controller/skillController.ts` |
| Service | `src/server/service/skillService.ts` |
| Repository | `src/server/repository/skillRepository.ts` |
| Store | `src/store/skills/store.ts` |
| Components | `src/app/(pages)/setting/skills/components/` |
| Types | `src/typings/skill.ts` |

## 第0阶段：准备（设计与验证）

- [ ] T00 创建变更目录结构 `openspec/changes/add-skills-management/` <!-- id: 0 -->
- [ ] T01 编写 proposal.md 描述变更意图和影响 <!-- id: 1 -->
- [ ] T02 编写 plan.md 技术设计文档 <!-- id: 2 -->
- [ ] T03 编写 spec delta 需求规范 (new capability) <!-- id: 3 -->
- [ ] T04 运行 `openspec validate add-skills-management --strict` 验证 <!-- id: 4 -->

---

## 第1阶段：设置（基础设施）

**目的**：数据库 Schema 和类型定义

- [ ] T005 在 `src/typings/skill.ts` 中定义 Skill 类型 <!-- id: 5 -->
- [ ] T006 在 `src/drizzle/schema/skills.ts` 中定义 skills 表 <!-- id: 6 -->
- [ ] T007 运行 `pnpm db:generate` 生成迁移文件 <!-- id: 7 -->
- [ ] T008 运行 `pnpm db:migrate` 应用迁移到开发数据库 <!-- id: 8 -->

---

## 第2阶段：基础（数据访问层）

**目的**：Repository 和 Service 层，必须在 UI 前完成

**⚠️ 关键**：此阶段完成前不应开始 UI 工作

- [ ] T009 [P] 在 `src/server/repository/skillRepository.ts` 实现数据访问层 <!-- id: 9 -->
- [ ] T010 在 `src/server/service/skillService.ts` 实现业务逻辑层 <!-- id: 10 -->
- [ ] T011 编写 SkillService 单元测试 <!-- id: 11 -->

**检查点**：数据访问和业务逻辑就绪，可以开始 API/UI 实现

---

## 第3阶段：API 和 Controller

- [ ] T012 在 `src/server/controller/skillController.ts` 实现 Controller <!-- id: 12 -->
- [ ] T013 在 `src/app/api/skills/route.ts` 实现 API Route <!-- id: 13 -->
- [ ] T014 添加请求验证（Zod schema） <!-- id: 14 -->
- [ ] T015 添加错误处理和日志记录 <!-- id: 15 -->
- [ ] T016 编写 API 端点集成测试 <!-- id: 16 -->

---

## 第4阶段：User Story 1 - 查看和切换技能状态 (优先级：P1) 🎯 MVP

**目标**：用户可以查看技能列表并启用/禁用技能
**独立测试**：打开 `/setting/skills`，看到技能列表，点击开关能切换状态

### 实现

- [ ] T017 [P] [US1] 在 `src/store/skills/store.ts` 创建 Zustand store <!-- id: 17 -->
- [ ] T018 [P] [US1] 在 `src/app/(pages)/setting/skills/components/SkillCard.tsx` 创建技能卡片组件 <!-- id: 18 -->
- [ ] T019 [P] [US1] 在 `src/app/(pages)/setting/skills/components/SkillGrid.tsx` 创建技能网格组件 <!-- id: 19 -->
- [ ] T020 [US1] 在 `src/app/(pages)/setting/skills/page.tsx` 创建主页面 <!-- id: 20 -->
- [ ] T021 [US1] 在 `src/app/components/settings-sidebar.tsx` 添加 Skills 导航项 <!-- id: 21 -->
- [ ] T022 [US1] 添加加载/错误状态处理 <!-- id: 22 -->
- [ ] T023 [US1] 验证响应式布局 <!-- id: 23 -->
- [ ] T024 [US1] 编写组件单元测试 <!-- id: 24 -->

**检查点**：US1 功能完整可用

---

## 第5阶段：User Story 2 - 搜索和筛选 (优先级：P2)

**目标**：用户可以搜索关键词和按分类筛选技能
**独立测试**：输入关键词能过滤列表，选择分类能过滤

### 实现

- [ ] T025 [US2] 在 Store 中添加 searchQuery 和 selectedCategory 状态 <!-- id: 25 -->
- [ ] T026 [US2] 添加搜索框组件（Input）到页面 <!-- id: 26 -->
- [ ] T027 [US2] 添加 Tabs 组件用于分类筛选 <!-- id: 27 -->
- [ ] T028 [US2] 实现搜索和筛选逻辑 <!-- id: 28 -->
- [ ] T029 [US2] 验证搜索和筛选交互 <!-- id: 29 -->

---

## 第6阶段：User Story 3 - 自定义技能 (优先级：P3)

**目标**：用户可以创建和删除自定义技能
**独立测试**：添加新技能后出现在列表中，删除后消失

### 实现

- [ ] T030 [P] [US3] 在 Store 中添加 createCustomSkill 和 deleteCustomSkill actions <!-- id: 30 -->
- [ ] T031 [P] [US3] 在 Service 中添加自定义技能 CRUD 方法 <!-- id: 31 -->
- [ ] T032 [US3] 添加"新增技能"按钮和对话框 <!-- id: 33 -->
- [ ] T033 [US3] 添加删除按钮（仅对自定义技能显示） <!-- id: 34 -->
- [ ] T034 [US3] 内置技能删除保护逻辑 <!-- id: 35 -->
- [ ] T035 [US3] 验证创建和删除流程 <!-- id: 36 -->

---

## 第7阶段：完善与质量保证

**目的**：跨用户的改进和质量检查

- [ ] T036 运行 `pnpm lint` 并修复问题 <!-- id: 37 -->
- [ ] T037 运行 `pnpm type-check` 确保类型正确 <!-- id: 38 -->
- [ ] T038 运行 `pnpm test` 确保测试通过 <!-- id: 39 -->
- [ ] T039 添加国际化文本（zh-CN, en-US） <!-- id: 40 -->
- [ ] T040 添加 `/api/skills/sync` 端点用于同步内置技能 <!-- id: 41 -->

---

## 第8阶段：归档准备

- [ ] T041 更新所有 TODO 状态为完成 <!-- id: 42 -->
- [ ] T042 验证所有场景在 spec.md 中已实现 <!-- id: 43 -->
- [ ] T043 运行 `openspec validate add-skills-management --strict` <!-- id: 44 -->

---

## 依赖关系

### 阶段依赖

- **准备（第0阶段）**：立即进行
- **设置（第1阶段）**：依赖准备完成
- **基础（第2阶段）**：依赖设置 - 阻塞 API/UI
- **API（第3阶段）**：依赖基础阶段
- **User Story 1**：依赖 API 和基础阶段
- **User Story 2**：依赖 User Story 1
- **User Story 3**：依赖 User Story 2
- **完善**：依赖期望的 US 完成
- **归档**：依赖所有工作完成

### 并行机会

- Store 与 UI 组件可以并行开发
- SkillCard 和 SkillGrid 组件可以并行构建
- Repository 和 Service 类型定义可以并行