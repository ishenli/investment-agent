# 任务：Integrate Skills with Claude Agent SDK

**输入**：来自 `changes/integrate-skills-claude-sdk/plan.md` 的设计文档
**前置条件**：plan.md（必需）
**参考**：[项目规范](file://openspec/project.md)

**测试**：
- 类型检查：`pnpm run types:check`
- 单元测试：`pnpm test`

**组织方式**：任务按 User Stories 分组，支持增量交付和独立验证。

---

## 第0阶段：准备（已完成）

- [x] T00 创建变更目录 `openspec/changes/integrate-skills-claude-sdk/`
- [x] T01 编写 `proposal.md` 描述变更意图和影响
- [x] T02 编写 `plan.md` 技术设计文档
- [x] T03 编写 spec delta 规范变更
- [ ] T04 运行 `openspec validate integrate-skills-claude-sdk --strict` 验证

---

## 第1阶段：内置插件迁移为 SKILL.md（P1 基础）

**目的**：将 Artifacts 和 LocalSystem 的 `systemRole` 内容迁移为独立的 SKILL.md 文件，供 `SkillFileScanner` 自动发现

- [x] T101 创建 `SKILLs/lobe-artifacts/SKILL.md`，frontmatter 包含 `name`、`description`、`official: true`、`version: "1.0.0"`，正文为 `src/app/tools/artifacts/systemRole.ts` 中 `systemPrompt` 的完整内容
- [x] T102 创建 `SKILLs/lobe-local-system/SKILL.md`，frontmatter 包含 `name`、`description`、`official: true`、`version: "1.0.0"`，正文为 `src/app/tools/local-system/systemRole.ts` 中 `systemPrompt` 的完整内容
- [ ] T103 手动验证：运行 `SkillFileScanner.scan()` 能识别两个新 skill（`id: 'lobe-artifacts'`、`id: 'lobe-local-system'`，`isBuiltIn: true`）

**检查点**：两个 SKILL.md 文件存在且可被 Scanner 解析

---

## 第2阶段：SkillStorageManager 单例（P1 基础）

**目的**：提供统一的 Skills 路径管理入口，供其他模块引用

**⚠️ 关键**：此阶段仅新增文件，不依赖前序阶段完成

- [x] T201 在 `src/server/lib/SkillStorageManager.ts` 创建 `SkillStorageManager` 单例类：
  - `static getInstance(): SkillStorageManager`
  - `getSkillsRoot(): string`（委托 `skillFileScanner.getSkillsRoot()`）
  - `readSkillsContent(slugs: string[]): Promise<string[]>`（扫描后按 slug 返回 prompt 列表）
  - 导出 `skillStorageManager` 单例
- [ ] T202 在 `src/server/lib/skill/index.ts` 中重新导出 `SkillStorageManager`（可选，保持统一导出）
- [ ] T203 [P] 为 `readSkillsContent` 编写单元测试，验证按 slug 顺序返回 prompt、不存在的 slug 被跳过

**检查点**：`SkillStorageManager` 可被 import，`readSkillsContent` 单元测试通过

---

## 第3阶段：User Story 1 - 全局 Skills 注入 Claude SDK systemPrompt (P1) 🎯 MVP

**目标**：用户在 `/setting/skills` 启用任意 Skill 后，该 Skill 的 prompt 自动注入 Claude SDK chat 的 systemPrompt
**独立测试**：启用 `lobe-artifacts`，发起 Claude chat，确认响应中出现 `<lobeArtifact>` 相关行为

### 实现

- [x] T301 在 `src/app/api/chat/claude/route.ts` 中 import `skillService`
- [x] T302 在 `ClaudeChatController.POST` 的第2步（用户认证）之后，调用 `skillService.getEnabledSkills(userIdNum)` 获取已启用 skills 列表
- [x] T303 构建 `skillsSystemPrompt`：过滤有 prompt 内容的 skills，按 `## Skill: <name>\n\n<prompt>` 格式拼接，多个 skills 以 `\n\n---\n\n` 分隔
- [x] T304 将 `systemPromptOverride` 与 `skillsSystemPrompt` 合并为 `finalSystemPrompt`：`[systemPromptOverride, skillsSystemPrompt].filter(Boolean).join('\n\n') || undefined`
- [x] T305 将 `streamClaude` 调用中的 `systemPrompt` 改为 `finalSystemPrompt`
- [ ] T306 手动验证：启用 lobe-artifacts skill（确保 DB 有记录），发起 chat，观察 systemPrompt 是否包含 Artifacts 内容

**检查点**：US1 功能完整，全局已启用 Skills 被注入 systemPrompt

---

## 第4阶段：User Story 2 - 会话级别 Skills 过滤 (P2)

**目标**：请求体可携带 `skills: string[]` 指定本次会话激活的 skill slugs，作为全局启用的子集过滤
**独立测试**：发起请求携带 `skills: ["lobe-artifacts"]`，验证只有 `lobe-artifacts` prompt 被注入

### 实现

- [x] T401 在 `ClaudeChatRequestSchema` 中添加 `skills: z.array(z.string()).optional()` 字段
- [x] T402 在 `ClaudeChatController.POST` 中提取 `body.skills`
- [x] T403 修改 Skills 过滤逻辑：若 `body.skills` 为非空数组，则将 `enabledSkills` 过滤为仅包含 `body.skills` 中的 slugs；空数组 `[]` 视为"不限制"（使用全部已启用）
- [ ] T404 手动验证：携带 `skills: ["lobe-artifacts"]` 发起请求，确认只有 Artifacts prompt 被注入；携带 `skills: []` 确认全部注入

**检查点**：US2 功能完整，会话级别过滤正确工作

---

## 第5阶段：User Story 3 - 内置 Skills 自动同步到管理 UI (P3)

**目标**：应用启动时自动调用 `syncBuiltinSkills`，确保内置 SKILL.md 文件的 DB 记录存在，用户无需手动同步即可在管理 UI 看到并控制内置 skills
**独立测试**：清空 skills 表，重启应用，访问 `/setting/skills`，确认 `lobe-artifacts` 和 `lobe-local-system` 出现在列表中

### 实现

- [ ] T501 检查 `src/server/controller/init.ts`，确认初始化逻辑的调用时机
- [ ] T502 在初始化流程中（用户首次登录或应用启动后）为当前登录用户调用 `skillService.syncBuiltinSkills(userId)`
- [ ] T503 手动验证：清空 `skills` 表，重新触发初始化，确认 `lobe-artifacts` 和 `lobe-local-system` 记录被创建，`source='official'`，`isEnabled=true`

**检查点**：US3 功能完整，内置 skills 自动出现在管理 UI

---

## 第6阶段：完善与质量保证

- [ ] T601 运行 `pnpm run lint` 并修复问题
- [ ] T602 运行 `pnpm run types:check` 确保类型正确
- [ ] T603 运行 `pnpm test` 确保所有测试通过
- [ ] T604 验证 Electron 环境下 `SKILLs/` 目录路径正确（`getBundledSkillsRoot` 路径适配）

---

## 第7阶段：归档准备

- [ ] T701 更新所有 TODO 状态为完成
- [ ] T702 验证所有场景在 spec.md 中已实现
- [ ] T703 运行 `openspec archive integrate-skills-claude-sdk --yes`

---

## 依赖关系

### 阶段依赖

- **第0阶段（准备）**：已完成
- **第1阶段（SKILL.md 迁移）**：立即进行，独立
- **第2阶段（SkillStorageManager）**：立即进行，独立（与第1阶段并行）
- **第3阶段（US1 全局注入）**：依赖第1阶段（需要 SKILL.md 存在以便测试）
- **第4阶段（US2 会话过滤）**：依赖第3阶段
- **第5阶段（US3 自动同步）**：依赖第1阶段（需要 SKILL.md 存在）
- **第6阶段（质量保证）**：依赖所有实现阶段完成

### 并行机会

- 第1阶段（SKILL.md 创建）与第2阶段（SkillStorageManager）可并行
- 第4阶段（会话过滤）与第5阶段（自动同步）可并行（均依赖第3阶段，但互相独立）
