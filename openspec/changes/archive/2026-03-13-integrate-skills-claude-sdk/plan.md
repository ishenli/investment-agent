# 实现计划：Integrate Skills with Claude Agent SDK

**分支**：`integrate-skills-claude-sdk` | **日期**：2026-03-04 | **规范**：`changes/integrate-skills-claude-sdk/specs/`
**输入**：来自 `changes/integrate-skills-claude-sdk/proposal.md` 的功能规范

## 概要

将现有内置插件（Artifacts、LocalSystem）的 `systemRole` 迁移为 SKILL.md 文件，通过 `SkillFileScanner` 统一管理。新增 `SkillStorageManager` 单例作为路径管理入口。在 `/api/chat/claude/route.ts` 中集成 `skillService.getEnabledSkills()`，将已启用 Skills 的 prompt 合并到 `systemPrompt` 供 Claude Agent SDK 使用，同时支持会话级别的选择性激活。

## 技术上下文

**语言/版本**：TypeScript 5+ / Node.js >= 20
**主要依赖**：Next.js 15+, React 19, Drizzle ORM, Zustand, `@anthropic-ai/claude-agent-sdk`
**存储**：SQLite (LibSQL dialect via Drizzle ORM) + 本地文件系统 (`SKILLs/` 目录)
**测试**：Vitest
**目标平台**：桌面 Web (Electron + Web)
**项目类型**：Next.js App Router (SSR + Client)
**性能目标**：Skills 加载不超过 200ms（内存缓存命中），首次扫描 < 500ms
**约束条件**：必须兼容 Electron；不得破坏 DeepAgents 路径；`BuiltinToolManifest` 保持原样（向后兼容）

## 规范检查

- 检查是否符合 [项目规范](file://openspec/agent/memory/constitution.md)
- 检查 TypeScript 严格模式约束
- 检查 OpenSpec delta 格式正确性

## 项目结构

### 文档（此功能）

```text
openspec/changes/integrate-skills-claude-sdk/
├── proposal.md
├── plan.md                  # 此文件
├── tasks.md
└── specs/
    ├── skills-management/
    │   └── spec.md          # MODIFIED: BuiltinSkillMigration + SkillStorageManager
    └── chat-api/
        └── spec.md          # MODIFIED: ClaudeSDK Skills Injection
```

### 源代码（项目根目录）

```text
SKILLs/
├── lobe-artifacts/
│   └── SKILL.md             # NEW: Artifacts systemRole → SKILL.md
└── lobe-local-system/
    └── SKILL.md             # NEW: LocalSystem systemRole → SKILL.md

src/
├── server/
│   ├── lib/
│   │   └── SkillStorageManager.ts   # NEW: 单例，Skills 路径管理 + 内容读取
│   └── controller/
│       └── init.ts                  # MODIFIED: 启动时调用 syncBuiltinSkills
└── app/
    └── api/
        └── chat/
            └── claude/
                └── route.ts         # MODIFIED: 集成 skillService，合并 systemPrompt
```

**结构决策**：
- `SkillStorageManager` 放在 `src/server/lib/` 与已有的 `DatabaseManager`、`skillManager` 保持一致
- SKILL.md 放在项目根 `SKILLs/` 目录，由 `SkillFileScanner.getSkillsRoot()` 自动发现
- Chat API 修改只涉及 `route.ts` 单文件，不新增服务层方法（`skillService.getEnabledSkills` 已存在）

## 需求拆分

### User Stories (按优先级排序)

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P1 | 用户在 Settings 启用 Artifacts Skill 后，Claude SDK chat 的回复遵守 Artifacts 格式规范 | 在 `/setting/skills` 启用 `lobe-artifacts`，发起 Claude 聊天，检查响应是否包含 `<lobeArtifact>` 标签 |
| P2 | 用户在会话中指定 `skills: ["lobe-artifacts"]`，只激活该 Skill | 请求体携带 `skills: ["lobe-artifacts"]`，其他全局启用的 skills 不被注入 |
| P3 | 新安装 App 后，内置 Skills 自动出现在 `/setting/skills` 管理页 | 清空 DB，重启应用，访问 Skills 页看到 `lobe-artifacts` 和 `lobe-local-system` |

## 技术架构

### 数据流

```
用户发送聊天 (POST /api/chat/claude)
  ↓
ClaudeChatRequestSchema 验证 (新增可选 skills 字段)
  ↓
skillService.getEnabledSkills(userIdNum)  ← SkillRegistry (缓存 + DB merge)
  ↓
过滤：body.skills 指定则按 slug 过滤，否则使用全部已启用
  ↓
构建 skillsSystemPrompt（按 skill.name 分节拼接 prompt）
  ↓
合并：[modeOverridePrompt, skillsSystemPrompt].filter(Boolean).join('\n\n')
  ↓
streamClaude({ systemPrompt: finalSystemPrompt, ... })
  ↓
Claude Agent SDK subprocess
```

### 状态管理

- **服务端**：`SkillRegistry` 内存缓存（per-user），`skillService.getEnabledSkills()` 是唯一消费入口
- **客户端**：无新增 Zustand state；Skills 管理页已有 Store 不变
- **缓存策略**：`SkillRegistry` 在 install/toggle 后调用 `invalidate(userId)` 清除缓存

### 外部集成

- **`@anthropic-ai/claude-agent-sdk`**：`streamClaude()` 的 `systemPrompt.append` 字段，接收合并后的 Skills prompt
- **`SkillFileScanner`**：自动扫描 `SKILLs/` 目录，识别新增的 `lobe-artifacts` 和 `lobe-local-system`
- **`skillService`** (`src/server/service/skillService.ts:67`)：`getEnabledSkills(userId)` 返回 `ResolvedSkill[]`（含 `prompt` 字段）

## SkillStorageManager 设计

```typescript
// src/server/lib/SkillStorageManager.ts
export class SkillStorageManager {
  private static instance: SkillStorageManager;
  private scanner: SkillFileScanner;

  private constructor() {
    this.scanner = skillFileScanner;
  }

  static getInstance(): SkillStorageManager {
    if (!SkillStorageManager.instance) {
      SkillStorageManager.instance = new SkillStorageManager();
    }
    return SkillStorageManager.instance;
  }

  /** Skills 根目录（Electron/Web 自动适配） */
  getSkillsRoot(): string {
    return this.scanner.getSkillsRoot();
  }

  /** 读取指定 slugs 的 SKILL.md prompt 内容（按顺序） */
  async readSkillsContent(slugs: string[]): Promise<string[]> {
    const parsed = this.scanner.scan();
    return slugs
      .map(slug => parsed.find(s => s.id === slug)?.prompt ?? '')
      .filter(Boolean);
  }
}

export const skillStorageManager = SkillStorageManager.getInstance();
```

## systemPrompt 合并策略

```
finalSystemPrompt = [
  systemPromptOverride,   // ask mode 专用覆盖（"You are in Ask mode..."）
  skillsSystemPrompt,     // "## Skill: <name>\n\n<prompt>" 逐个拼接
].filter(Boolean).join('\n\n') || undefined
```

- `askMode` 下 `skillsSystemPrompt` 仍然注入（Ask mode 不禁止 systemPrompt，仅禁止工具）
- `skills` 请求字段为空数组 `[]` 时视为"不限制"（注入全部已启用 skills）
- `skills` 为 `["slug1"]` 时仅注入对应 slug 的 skills（即使全局有更多已启用）

## SKILL.md frontmatter 规范（内置插件）

```yaml
---
name: Artifacts
description: Enable creating rich artifacts (code, HTML, SVG, diagrams) in conversations
official: true
version: "1.0.0"
---
```

`SkillFileScanner` 会将 `official: true` 映射为 `isOfficial = true`，`syncBuiltinSkills` 同步时 `source = 'official'`，保证管理 UI 正确显示且不可删除。

## 复杂性跟踪

无需额外复杂性，所有构建块（SkillRegistry、skillService、streamClaude）已存在，本次仅完成集成管道。

## 文件系统 ↔ 数据库同步策略

### 职责分离原则

数据库（`skills` 表）与文件系统（`SKILL.md`）之间采用**分离关注点**设计：

| 文件系统（SKILL.md） | 数据库（skills 表） |
|---|---|
| 技能内容（prompt） | 用户偏好（isEnabled） |
| 元数据（name / description / version） | 分类（category / icon） |
| 存在性（目录是否在磁盘上） | 自定义技能数据 |

**文件系统永远是 official/builtin 技能的内容权威源**；数据库只存用户级别的偏好覆盖。运行时通过 `SkillRegistry.resolve()` 实时合并两者，无需持续轮询。

### 三路对账（syncBuiltinSkills）

`skillService.syncBuiltinSkills(userId)` 执行三路对账，返回 `{ created, updated, pruned }`：

| FS 状态 | DB 状态 | 操作 |
|---|---|---|
| SKILL.md 存在 | DB 行缺失 | **CREATE**：新建行，`isEnabled=true`，`source='official'` |
| SKILL.md 存在 | DB 行存在，元数据已漂移 | **UPDATE**：刷新 `name`/`description`/`version`，保留用户的 `isEnabled` |
| SKILL.md 不存在 | DB 行存在（source='official'） | **PRUNE**：删除孤立行（custom 技能不受影响） |

操作幂等，可安全重复调用。

### 触发时机

| 时机 | 入口 | 说明 |
|---|---|---|
| **应用启动** | `src/instrumentation.ts` | 数据库初始化完成后，对所有非软删除用户批量执行 |
| **技能安装后** | `skillService.installSkill()` | 调用 `skillRegistry.invalidate(userId)`，下次 `resolve()` 重新扫描 |
| **手动触发** | `POST /api/skills/sync` | `SkillController.syncBuiltinSkills()` HTTP 端点 |

### 运行时实时合并（无需同步）

读取 prompt 内容时**不依赖同步机制**：

```
getEnabledSkills(userId)
  ↓
SkillRegistry.resolve(userId)
  ├── SkillFileScanner.scan()         → 实时扫描磁盘 SKILL.md（每次请求）
  └── skillRepository.findByUserId()  → 读取 DB 用户偏好
  ↓
合并：FS 提供内容 + DB 提供 isEnabled 状态（内存缓存命中 < 1ms）
```

因此手动修改 `SKILL.md` 内容后，重启（或调用 `skillRegistry.invalidate(userId)`）即可立即生效，无需额外同步。

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| SKILL.md 不存在时 skills 为空，无 systemPrompt 注入 | 低 | `filter(Boolean)` 防止空注入，功能降级为无 skills 模式 |
| Skills prompt 过长导致 token 超限 | 中 | 当前内置 skills prompt 约 1-2KB，实践中可接受；未来可加 token 估算截断 |
| `syncBuiltinSkills` 并发调用重复创建 DB 行 | 低 | `skillRepository.findByUserIdAndSlug` 查重后再 insert，幂等安全 |
| Electron 打包后 `SKILLs/` 路径不正确 | 中 | `SkillFileScanner.getBundledSkillsRoot()` 已处理 Electron 路径，复用即可 |

## 性能考虑

- `skillService.getEnabledSkills()` 命中 `SkillRegistry` 内存缓存时 < 1ms
- 首次扫描 `SKILLs/` 目录（< 20 个 skills）< 50ms
- 全部注入 prompt 字符串拼接 < 1ms

## 安全考虑

- Skills 内容来自文件系统，属于应用受信任内容，无需额外过滤
- 用户通过 `skills` 请求字段只能选择自己已有的已启用 skills（`getEnabledSkills(userId)` 强制 userId 隔离）

## 测试策略

- **单元测试**：`SkillStorageManager.readSkillsContent()` 正确返回 slug 对应 prompt
- **集成测试**：`GET /api/chat/claude` 携带 `skills` 字段，验证 `streamClaude` 收到正确 `systemPrompt`
- **手动验证**：启用 `lobe-artifacts` skill，发送聊天请求，检查 Claude 响应包含 Artifacts 语法
