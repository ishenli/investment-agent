# claude-chat Spec Delta: Claude SDK UI Integration

## ADDED Requirements

### Requirement: Engine Selector UI Component
系统 MUST 在 Chat 输入框区域提供引擎选择器,允许用户在 DeepAgents 和 Claude SDK 之间切换。

#### Scenario: Engine Selector Display
- **GIVEN** 用户打开 Chat 页面
- **WHEN** 查看输入框工具栏
- **THEN** 系统 MUST 显示引擎选择器下拉菜单
- **THEN** 选择器 MUST 位于模型选择器之前
- **THEN** 选择器 MUST 包含两个选项:
  - `DeepAgents` (默认)
  - `Claude SDK`

#### Scenario: Engine Selection
- **GIVEN** 用户在引擎选择器中选择引擎
- **WHEN** 选择 `DeepAgents` 或 `Claude SDK`
- **THEN** 系统 MUST 更新当前会话的 `config.engineType`
- **THEN** 选择 MUST 立即生效,无需刷新页面
- **THEN** 选择 MUST 在会话级别持久化

#### Scenario: API Route Selection
- **GIVEN** 用户发送消息
- **WHEN** 系统准备调用 API
- **THEN** 系统 MUST 根据 `config.engineType` 选择 API 端点:
  - `engineType: 'deepagents'` → `/api/chat/agent`
  - `engineType: 'claude'` → `/api/chat/claude`
- **THEN** API 请求 MUST 包含相同的消息格式
- **THEN** 两个 API MUST 返回兼容的 SSE 流格式

#### Scenario: Claude SDK Task Execution
- **GIVEN** 用户选择 `Claude SDK` 引擎
- **WHEN** 用户发送消息
- **THEN** 系统 MUST 调用 `/api/chat/claude`
- **THEN** API MUST 使用 `streamClaude` 函数
- **THEN** 系统 MUST 通过 SSE 流式返回执行过程
- **THEN** 执行完成后 MUST 返回最终结果和 Token 使用统计

---

### Requirement: Session Engine Configuration Persistence
系统 MUST 将用户选择的引擎类型存储在会话配置中,实现会话级别的引擎偏好记忆。

#### Scenario: Engine Selection Persistence
- **GIVEN** 用户选择了 `Claude SDK` 引擎
- **WHEN** 系统更新会话配置
- **THEN** 配置 MUST 包含 `engineType: 'claude'`
- **THEN** 刷新页面后 MUST 保持选择的引擎
- **THEN** 切换到其他会话再返回 MUST 保持选择的引擎

#### Scenario: Default Engine Type
- **GIVEN** 新创建的会话或未设置引擎类型的会话
- **WHEN** 用户打开会话
- **THEN** 系统 MUST 默认使用 `DeepAgents` 引擎
- **THEN** 引擎选择器 MUST 显示 `DeepAgents` 为选中状态

---

### Requirement: Claude Service Layer (NEW)
系统 MUST 提供统一的 ClaudeService 服务层,封装 Claude SDK 的配置管理逻辑。

#### Scenario: Provider Configuration Retrieval
- **GIVEN** 用户已配置 Model Provider
- **WHEN** 调用 `claudeService.getClaudeConfig(modelSlug?)`
- **THEN** 系统 MUST 通过 `modelProviderResolver` 获取配置
- **THEN** 系统 MUST 优先使用指定模型,未找到时回退到默认模型
- **THEN** 系统 MUST 记录日志说明使用的模型和 Provider

#### Scenario: ApiProvider Object Construction
- **GIVEN** 成功获取 Provider 配置
- **WHEN** 构建 `ApiProvider` 对象
- **THEN** 对象 MUST 包含以下字段:
  - `id` - 唯一标识符
  - `provider_type: 'anthropic'`
  - `base_url` - Provider 的 base URL
  - `api_key` - Provider 的 API Key
  - 其他元数据字段

#### Scenario: Configuration Validation
- **GIVEN** 构建了 ApiProvider 对象
- **WHEN** 验证配置
- **THEN** 系统 MUST 检查 `base_url` 和 `api_key` 非空
- **THEN** 缺少必要字段时 MUST 抛出明确的错误

#### Scenario: Environment Variable Format
- **GIVEN** 需要 Claude Agent SDK 格式的配置
- **WHEN** 调用 `claudeService.getEnvConfig(modelSlug?)`
- **THEN** 系统 MUST 返回包含以下字段的对象:
  - `modelSlug: string`
  - `env.ANTHROPIC_API_KEY: string`
  - `env.ANTHROPIC_BASE_URL: string`

#### Scenario: Service Reusability
- **GIVEN** 多个服务需要使用 Claude SDK
- **WHEN** 从 `claudeService` 获取配置
- **THEN** 所有服务 MUST 使用相同的配置逻辑
- **THEN** 避免重复的 Provider 获取代码

---

### Requirement: Skills Knowledge Package Management (Future Feature)
系统 MUST 支持 Skills 知识包的管理,将 SKILL.md 格式的知识作为 Agent 执行的上下文指导。

#### Scenario: Skill Storage Architecture
- **GIVEN** 应用需要在 Electron 和 Web 环境中存储 Skills
- **WHEN** 初始化 Skills 存储
- **THEN** 系统 MUST 使用 `SkillStorageManager` 单例管理存储
- **THEN** 存储路径 MUST 根据环境自动确定：
  - Electron 生产环境：`{userData}/skills/`
  - Electron 开发环境：`{projectDir}/skills/`
  - Web 环境：`{projectDir}/skills/`
- **THEN** 路径计算 MUST 复用 `getProjectRoot()` 函数（参考 DatabaseManager）

#### Scenario: Skill File Structure
- **GIVEN** Skill 需要以文件形式存储
- **WHEN** 创建 Skill
- **THEN** 每个 Skill MUST 是一个独立目录，目录名为 `slug`
- **THEN** 目录 MUST 包含 `SKILL.md` 主文件
- **THEN** 目录 MAY 包含 `references/` 子目录（参考文档）
- **THEN** 目录 MAY 包含 `scripts/` 子目录（可执行脚本）

#### Scenario: Skill Database Index
- **GIVEN** 需要快速查询和管理 Skills
- **WHEN** 创建或导入 Skill
- **THEN** 系统 MUST 在 `chat_skills` 表中创建元数据索引
- **THEN** 元数据 MUST 包含：
  - `id` - 唯一标识符
  - `slug` - 目录名（用于文件路径）
  - `name` - 从 SKILL.md frontmatter 解析
  - `description` - 从 SKILL.md frontmatter 解析
  - `path` - 相对路径
  - `source` - 来源类型
- **THEN** 实际内容 MUST 存储在文件系统中

#### Scenario: Skill Import from Content
- **GIVEN** 用户导入 Skill 内容
- **WHEN** 提供符合 SKILL.md 格式的内容
- **THEN** 系统 MUST 解析 YAML frontmatter 提取 `name` 和 `description`
- **THEN** 系统 MUST 验证内容格式正确性
- **THEN** 系统 MUST 通过 `SkillStorageManager.createSkill()` 创建文件
- **THEN** 系统 MUST 在数据库中创建元数据索引

#### Scenario: Skill Import from URL
- **GIVEN** 用户从 URL 导入 Skill
- **WHEN** 提供 GitHub/Gist 等 URL
- **THEN** 系统 MUST 获取远程内容
- **THEN** 系统 MUST 解析并验证格式
- **THEN** 系统 MUST 通过 `SkillStorageManager.createSkill()` 创建文件
- **THEN** 系统 MUST 在数据库中创建元数据索引并记录 `sourceUrl`

#### Scenario: Skill Activation in Session
- **GIVEN** 会话需要启用 Skills
- **WHEN** 在会话配置中选择 Skills
- **THEN** 系统 MUST 将 Skill slugs 添加到会话配置
- **THEN** Agent 执行时 MUST 通过 `SkillStorageManager.readSkillContent()` 加载内容
- **THEN** Skills 内容 MUST 合并到 systemPrompt
- **THEN** Skills MUST 按选择的顺序合并

---

### Requirement: MCP Server Configuration (Future Feature)
系统 MUST 支持 MCP (Model Context Protocol) Server 配置,扩展 Agent 的外部工具能力。

#### Scenario: MCP Server Data Model
- **GIVEN** 系统需要存储 MCP Server 配置
- **WHEN** 创建或更新 MCP Server
- **THEN** 系统 MUST 在 `chat_plugins` 表中存储配置（扩展字段）
- **THEN** MCP Server 记录 MUST 包含：
  - `name` - Server 名称
  - `type: 'mcp'` - 类型标识
  - `command` - 启动命令
  - `args` - 命令参数
  - `env` - 环境变量（可选）

#### Scenario: MCP Server Registration
- **GIVEN** 用户注册 MCP Server
- **WHEN** 提供配置信息
- **THEN** 系统 MUST 验证命令格式
- **THEN** 系统 MUST 创建 MCP Server 记录
- **THEN** 系统 MUST 测试 Server 是否可启动（可选验证）

#### Scenario: MCP Server Integration in Agent
- **GIVEN** 会话配置了 MCP Servers
- **WHEN** 执行 Agent 任务
- **THEN** 系统 MUST 构建 `mcpServers` 配置对象
- **THEN** 配置对象 MUST 传递给 SDK `query()` 函数
- **THEN** Agent MUST 能够使用 MCP Server 提供的工具

---

### Requirement: Agent Permission Control
系统 MUST 支持 Agent 执行的权限控制，确保安全执行。

#### Scenario: Permission Modes
- **GIVEN** 会话需要设置权限模式
- **WHEN** 配置 `permissionMode`
- **THEN** 系统 MUST 支持以下模式：
  - `default` - 危险操作需要确认
  - `acceptEdits` - 自动接受文件编辑
  - `dontAsk` - 不询问（适用于自动化场景）
  - `bypassPermissions` - 跳过所有权限检查（需额外确认）

#### Scenario: Working Directory Restriction
- **GIVEN** Agent 需要操作文件
- **WHEN** 执行文件读写操作
- **THEN** Agent MUST 只能在配置的 `cwd` 目录下操作
- **THEN** 系统 MUST 阻止访问 cwd 之外的文件

#### Scenario: Budget Limit
- **GIVEN** 会话设置了预算限制
- **WHEN** Agent 执行过程中
- **THEN** 系统 MUST 跟踪 Token 消耗和成本
- **THEN** 当达到 `maxBudgetUsd` 时 MUST 停止执行
- **THEN** 系统 MUST 返回预算超限提示

---

### Requirement: Agent Execution API
系统 MUST 提供 Agent 执行 API 端点。

#### Scenario: Execute Agent Task
- **GIVEN** 用户请求执行 Agent 任务
- **WHEN** POST `/api/chat/claude-agent` 包含任务信息
- **THEN** 系统 MUST 验证会话配置
- **THEN** 系统 MUST 加载 Skills 和 MCP Servers
- **THEN** 系统 MUST 返回 SSE 流

#### Scenario: Request Validation
- **GIVEN** API 收到请求
- **WHEN** 验证请求参数
- **THEN** 系统 MUST 验证：
  - `sessionId` 存在且有效
  - `prompt` 非空
  - 会话 `agentType` 为 `claude-agent`
- **THEN** 无效请求 MUST 返回 400 错误

#### Scenario: Error Handling
- **GIVEN** Agent 执行过程中发生错误
- **WHEN** 捕获到 SDK 错误或异常
- **THEN** 系统 MUST 记录错误日志
- **THEN** 系统 MUST 发送 SSE error 事件
- **THEN** 系统 MUST 关闭 SSE 连接

---

### Requirement: Skills Management API
系统 MUST 提供 Skills 管理 API 端点。

#### Scenario: List Skills
- **GIVEN** 用户请求查看所有 Skills
- **WHEN** GET `/api/chat/skill`
- **THEN** 系统 MUST 返回所有 Skill 记录列表
- **THEN** 列表 MUST 按 `updatedAt` 降序排序

#### Scenario: Import Skill
- **GIVEN** 用户导入新的 Skill
- **WHEN** POST `/api/chat/skill` 包含 Skill 数据
- **THEN** 系统 MUST 验证内容格式
- **THEN** 系统 MUST 创建 Skill 记录
- **THEN** 返回创建的 Skill 记录

#### Scenario: Delete Skill
- **GIVEN** 用户删除 Skill
- **WHEN** DELETE `/api/chat/skill/:id`
- **THEN** 系统 MUST 删除指定 Skill 记录
- **THEN** 已删除的 Skill MUST 从相关会话配置中移除

---

## MODIFIED Requirements

### Requirement: Chat Session Configuration (MODIFIED)
系统 MUST 支持在会话配置中存储引擎类型,支持 DeepAgents 和 Claude SDK 两种引擎。

#### Scenario: Engine Type Configuration (ADDED)
- **GIVEN** 用户选择 AI 引擎
- **WHEN** 更新会话配置
- **THEN** 配置 MUST 支持 `engineType` 字段
- **THEN** `engineType` MUST 支持以下值:`'deepagents'` | `'claude'`
- **THEN** 默认值 MUST 为 `'deepagents'`

#### Scenario: Claude SDK Session Config (ADDED)
- **GIVEN** 用户选择 `Claude SDK` 引擎
- **WHEN** 配置 Claude SDK 专用参数 (未来功能)
- **THEN** 配置 MAY 支持 `claudeConfig` 字段:
  - `skills: string[]` - 启用的 Skill slugs
  - `mcpServers: string[]` - 启用的 MCP Server IDs
  - `permissionMode` - 权限模式
  - `maxBudgetUsd` - 预算限制

---

## RENAMED Requirements

None.

---

## REMOVED Requirements

None.

---

## Implementation Notes

### Claude Agent SDK Package

```json
{
  "dependencies": {
    "@anthropic-ai/claude-agent-sdk": "^0.x.x"
  }
}
```

### SkillStorageManager (参考 DatabaseManager)

```typescript
// src/server/lib/SkillStorageManager.ts
import { getProjectRoot } from '../base/env';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../base/logger';

const globalForSkills = globalThis as unknown as {
  __skillStorageManagerInstance: SkillStorageManager | undefined;
};

export class SkillStorageManager {
  private skillsDir: string;

  private constructor() {
    // 参考 DatabaseManager 的路径计算逻辑
    const projectRoot = getProjectRoot();
    this.skillsDir = path.join(projectRoot, 'skills');
  }

  public static getInstance(): SkillStorageManager {
    if (!globalForSkills.__skillStorageManagerInstance) {
      globalForSkills.__skillStorageManagerInstance = new SkillStorageManager();
    }
    return globalForSkills.__skillStorageManagerInstance;
  }

  public getSkillPath(slug: string): string {
    return path.join(this.skillsDir, slug);
  }

  public async readSkillContent(slug: string): Promise<string> {
    const skillPath = path.join(this.getSkillPath(slug), 'SKILL.md');
    return fs.readFileSync(skillPath, 'utf-8');
  }

  // ... 其他方法
}
```

### 存储路径示例

| 环境 | 路径 |
|------|------|
| Electron 生产 | `~/Library/Application Support/investment-agent/skills/` (macOS) |
| Electron 生产 | `%APPDATA%/investment-agent/skills/` (Windows) |
| Electron 开发 | `{project}/skills/` |
| Web | `{project}/skills/` |

### Event-driven Agent Stream

```typescript
for await (const message of query({
  prompt: options.prompt,
  options: {
    cwd: options.cwd,
    systemPrompt,  // 从 SkillStorageManager 加载并合并
    allowedTools: options.allowedTools,
    mcpServers: mcpServersConfig,
    permissionMode: options.permissionMode,
    maxBudgetUsd: options.maxBudgetUsd,
  },
})) {
  if ("result" in message) {
    yield { type: "result", content: message.result };
  } else if (message.type === "system") {
    yield { type: "status", content: message };
  }
}
```

### SKILL.md Format Example

```markdown
---
name: Investment Analysis
description: Comprehensive investment analysis and risk assessment
---

# Investment Analysis Skill

## Objective

Analyze investment portfolio and provide risk assessment.

## Workflow

1. Load portfolio data from the specified path
2. Calculate key metrics (Sharpe ratio, max drawdown, etc.)
3. Generate risk assessment report

## Tools Required

- Read - Load portfolio files
- WebSearch - Fetch market data
- Bash - Run analysis scripts
```

### Database Migration

```sql
-- Create chat_skills table (元数据索引)
CREATE TABLE chat_skills (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  path TEXT NOT NULL,
  source TEXT NOT NULL, -- 'local' | 'url' | 'builtin'
  source_url TEXT,
  is_enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 文件存储在 {projectRoot}/skills/{slug}/SKILL.md
```