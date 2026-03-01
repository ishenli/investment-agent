# Change: Integrate Claude Agent SDK for Investment Analysis

## Why

当前系统的 Chat 功能使用 LangChain 和 DeepAgents 进行对话,但存在以下局限:

1. **投资分析场景需要更强的工具能力**:分析持仓、执行数据查询、生成报告等任务需要文件操作、数据库查询、代码执行等能力
2. **缺乏端到端工作流执行能力**:现有 Agent 只能对话,无法主动执行复杂的多步骤任务(如"分析我的投资组合并生成报告")
3. **缺乏可扩展的工具生态**:无法集成外部 MCP Servers(如 Playwright、数据库连接器等)
4. **用户需要灵活选择 AI 引擎**:不同场景下,DeepAgents 和 Claude SDK 各有优势,用户需要能够自由切换

Claude Agent SDK 提供了以下能力来解决这些问题:

- **内置工具**:File Read/Write/Edit、Bash 执行、Glob/Grep 搜索、WebSearch/WebFetch
- **MCP Server 集成**:可扩展的外部工具接口
- **Subagents**:委托子任务给专门的 Agent
- **Hooks 机制**:在工具执行前后插入自定义逻辑

**最新进展**:
- ✅ `streamClaude` 函数已实现,支持 Claude SDK 流式输出
- ✅ `/api/chat/claude` 端点已创建,用于 Claude SDK 对话
- 🔄 需要在 Chat UI 中添加引擎选择器,让用户在 DeepAgents 和 Claude 之间切换

## What Changes

### 核心变更

1. **Chat UI 引擎选择器**:在 Chat 输入框区域添加下拉选择器,支持在 DeepAgents 和 Claude SDK 之间切换
2. **动态 API 路由**:根据用户选择的引擎,调用不同的 API 端点(`/api/chat/agent` 或 `/api/chat/claude`)
3. **会话引擎配置持久化**:将用户选择的引擎类型存储在 `chat_sessions.config` 中,实现会话级别的引擎偏好记忆
4. **Skills 导入功能** (可选):支持导入 SKILL.md 格式的知识包,作为 Agent 的上下文指导
5. **MCP Server 配置** (可选):支持为 Agent 配置 MCP Servers(外部工具扩展)

### 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                        Chat UI Layer                             │
│  - 引擎选择器 (DeepAgents / Claude SDK)                          │
│  - 根据选择调用不同 API                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        ▼                                           ▼
┌────────────────────────┐              ┌────────────────────────┐
│  /api/chat/agent       │              │  /api/chat/claude      │
│  (DeepAgents)          │              │  (Claude SDK)          │
│  - 现有实现            │              │  - streamClaude        │
└────────────────────────┘              └────────────────────────┘
        │                                           │
        ▼                                           ▼
┌────────────────────────┐              ┌────────────────────────┐
│  investmentAdvisor     │              │  Claude Agent SDK      │
│  Agent (DeepAgents)    │              │  - query()             │
│  - 6 Tools             │              │  - Built-in Tools      │
└────────────────────────┘              │  - MCP Servers         │
                                        │  - Skills (optional)   │
                                        └────────────────────────┘
```

### 引擎选择流程

```
用户在 Chat 输入框中选择引擎
    ↓
存储选择到 Session Config (engineType: 'deepagents' | 'claude')
    ↓
用户发送消息
    ↓
根据 engineType 调用对应 API
    ├─ DeepAgents → /api/chat/agent
    └─ Claude SDK → /api/chat/claude
    ↓
流式返回响应
```

### streamClaude 已实现示例

```typescript
import { streamClaude } from '@/app/lib/claude-client';

// 现有实现 (已在 /api/chat/claude 中使用)
const stream = streamClaude({
  prompt: userQuery,
  sessionId: session_id,
  sdkSessionId: undefined,
  model: model || 'claude-3-5-sonnet-20241022',
  systemPrompt: systemPrompt,
  workingDirectory: workDir,
  abortController: new AbortController(),
  permissionMode: 'acceptEdits',
  toolTimeoutSeconds: 600,
  provider: provider, // ApiProvider 配置
  settings: {}, // SettingsMap
  updateSdkSessionId: (id, sdkSessionId) => {
    // 更新 session 的 sdkSessionId
  },
});

// 流式返回 SSE 格式
return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  },
});
```

### Skills 存储架构

参考项目已有的 `DatabaseManager` 设计模式，Skills 采用**文件存储 + 数据库索引**的混合架构：

```
┌─────────────────────────────────────────────────────────────────┐
│                    SkillStorageManager                           │
│  - 单例模式，参考 DatabaseManager                                 │
│  - 自动区分 Electron/Web 环境                                    │
│  - 统一的文件读写接口                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        ▼                                           ▼
┌───────────────────────┐               ┌───────────────────────┐
│  文件系统 (实际内容)    │               │  数据库 (元数据索引)   │
│  - SKILL.md           │               │  - id, name           │
│  - references/        │               │  - description        │
│  - scripts/           │               │  - path, source       │
└───────────────────────┘               └───────────────────────┘
```

**存储路径（参考 DatabaseManager.getProjectRoot()）：**

| 环境 | 路径 | 说明 |
|------|------|------|
| Electron 生产 | `{userData}/skills/` | 用户数据目录，跨版本持久化 |
| Electron 开发 | `{projectDir}/skills/` | 项目目录，便于调试 |
| Web | `{projectDir}/skills/` | 项目目录 |

**目录结构：**

```
{projectRoot}/skills/
├── investment-analysis/          # Skill 目录（使用 slug 命名）
│   ├── SKILL.md                  # 主文件（必需）
│   ├── references/               # 参考文档（可选）
│   │   ├── risk-models.md
│   │   └── portfolio-schema.md
│   └── scripts/                  # 可执行脚本（可选）
│       └── calculate_var.py
└── market-research/
    └── SKILL.md
```

### MCP Server 配置模型

```typescript
// 存储在 chat_plugins 表中（扩展现有表）
interface MCPPlugin {
  id: string;
  name: string;
  command: string;      // 启动命令，如 "npx"
  args: string[];       // 命令参数
  env?: Record<string, string>;  // 环境变量
  isEnabled: boolean;
}
```

## Impact

### 已完成
- ✅ `src/app/lib/claude-client.ts` - streamClaude 函数已实现
- ✅ `src/app/api/chat/claude/route.ts` - Claude API 端点已创建
- ✅ `src/types/claude.ts` - Claude 相关类型定义已添加
- ✅ `package.json` - `@anthropic-ai/claude-agent-sdk` 依赖已添加

### 待实现
- Affected specs: `claude-chat` (修改), `chat-api` (修改)
- Affected code:
  - **后端核心服务**:
    - `src/server/service/claudeService.ts` - **新增:Claude SDK 专用服务层**
    - `src/server/service/reportService/index.ts` - **修改:使用 claudeService 替代内部逻辑**
  - **前端 UI 层**:
    - `src/app/(pages)/chat/modules/Workspace/Conversation/features/ChatInput/` - **新增引擎选择器组件**
    - `src/app/store/chat/slices/aiChat/actions/generateAIChat.ts` - **修改:根据引擎类型调用不同 API**
    - `src/app/services/chat.ts` - **修改:支持 Claude API 调用**
    - `src/app/store/session/slices/session/action.ts` - **修改:会话配置添加 engineType 字段**
  - **数据层** (可选):
    - `drizzle/schema.ts` - **修改:chat_sessions.config 添加 engineType 字段**
  - **未来功能**:
    - `src/app/(pages)/chat/features/skills/` - 新建 Skills 管理 UI
    - `src/server/repository/chat/skill.ts` - 新建 Skills Repository

## Design Overview

### 1. UI 引擎选择器设计

**位置**: Chat 输入框左侧工具栏,在 `model` 选择器之前

**组件层级**:
```
ChatInput/Desktop/index.tsx
  ↓
DesktopChatInput (from @renderer/(pages)/chat/features/ChatInput/Desktop)
  ↓
ActionBar
  ↓
EngineSelector (NEW) - 新增组件
```

**交互逻辑**:
1. 下拉菜单包含两个选项:
   - **DeepAgents** (默认) - 使用现有投资顾问 Agent
   - **Claude SDK** - 使用 Claude Agent SDK

2. 选择引擎后:
   - 更新 Session Config: `engineType: 'deepagents' | 'claude'`
   - 在输入框显示当前选择的引擎图标
   - 会话级别持久化,刷新后保持选择

### 2. API 路由逻辑

**修改文件**: `src/app/services/chat.ts`

```typescript
// 在 bailingLLMStream 方法中添加引擎判断
bailingLLMStream = async (params) => {
  const sessionConfig = getSessionStoreState().currentSession?.config;
  const engineType = sessionConfig?.engineType || 'deepagents';
  
  const api = engineType === 'claude' 
    ? '/api/chat/claude'  // 使用 Claude SDK
    : '/api/chat/agent';  // 使用 DeepAgents (现有)
    
  await connectAgentStream({
    api,
    body: { ...params },
    // ... 其他参数
  });
};
```

### 3. Session Config 扩展

**修改文件**: `drizzle/schema.ts` 或通过 JSON 字段扩展

```typescript
// chat_sessions.config 字段 (JSON)
interface SessionConfig {
  // ... 现有字段
  engineType?: 'deepagents' | 'claude';  // 新增:AI 引擎类型
  
  // Claude SDK 专用配置 (可选)
  claudeConfig?: {
    skills?: string[];       // 启用的 Skill slugs
    mcpServers?: string[];   // 启用的 MCP Server IDs
    permissionMode?: string; // 权限模式
  };
}
```

### 4. 组件实现细节

**新增文件**: `src/app/(pages)/chat/modules/Workspace/Conversation/features/ChatInput/Desktop/EngineSelector.tsx`

```tsx
import { Select } from 'antd';
import { useSessionStore } from '@renderer/store/session';

const EngineSelector = () => {
  const [currentSession, updateSessionConfig] = useSessionStore((s) => [
    s.currentSession,
    s.updateSessionConfig,
  ]);
  
  const engineType = currentSession?.config?.engineType || 'deepagents';
  
  return (
    <Select
      value={engineType}
      onChange={(value) => {
        updateSessionConfig({
          ...currentSession.config,
          engineType: value,
        });
      }}
      options={[
        { label: 'DeepAgents', value: 'deepagents' },
        { label: 'Claude SDK', value: 'claude' },
      ]}
    />
  );
};
```

**修改文件**: `src/app/(pages)/chat/modules/Workspace/Conversation/features/ChatInput/Desktop/index.tsx`

```tsx
const leftActions = [
  'engine',     // 新增:引擎选择器
  'model',
  'tools',
  'clear',
] as ActionKeys[];
```

### 5. Skills 管理 (未来功能)

- **导入**:上传 SKILL.md 文件或目录
- **启用**:为特定会话选择启用的 Skills
- **上下文注入**:Skills 内容作为 `systemPrompt` 传入

### 6. MCP Server 管理 (未来功能)

- **配置**:定义 server 名称、命令、参数、环境变量
- **关联**:MCP Servers 关联到会话配置
- **安全**:敏感环境变量(API Keys)通过 modelProviders 表管理

### 7. 数据模型变更

#### chat_sessions.config 扩展(JSON 字段)

```typescript
interface SessionConfig {
  // ... 现有字段
  engineType?: 'deepagents' | 'claude';  // 新增:AI 引擎类型
  
  // Claude SDK 专用配置 (可选,未来功能)
  claudeConfig?: {
    skills?: string[];       // 启用的 Skill slugs
    mcpServers?: string[];   // 启用的 MCP Server IDs
    permissionMode?: 'default' | 'acceptEdits' | 'dontAsk';
    maxBudgetUsd?: number;   // 预算限制
  };
}
```

#### chat_skills 表（新建 - 元数据索引）

> **设计说明**：Skills 的实际内容存储在文件系统中，数据库仅存储元数据用于快速查询和关联。

```typescript
export const chatSkills = sqliteTable('chat_skills', {
  id: text('id').primaryKey(),            // nanoid
  slug: text('slug').notNull().unique(),  // 目录名，用于文件路径
  name: text('name').notNull(),           // 从 SKILL.md frontmatter 解析
  description: text('description'),       // 从 SKILL.md frontmatter 解析
  path: text('path').notNull(),           // 相对路径：skills/{slug}/
  source: text('source', { enum: ['local', 'url', 'builtin'] }).notNull(),
  sourceUrl: text('source_url'),          // URL 来源时记录
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});
```

#### SkillStorageManager 设计（参考 DatabaseManager）

```typescript
// src/server/lib/SkillStorageManager.ts
export class SkillStorageManager {
  private static instance: SkillStorageManager;
  private skillsDir: string;

  private constructor() {
    // 参考 DatabaseManager 的路径计算逻辑
    const projectRoot = getProjectRoot();
    this.skillsDir = path.join(projectRoot, 'skills');
  }

  public static getInstance(): SkillStorageManager {
    if (!SkillStorageManager.instance) {
      SkillStorageManager.instance = new SkillStorageManager();
    }
    return SkillStorageManager.instance;
  }

  // 初始化：确保目录存在
  public async initialize(): Promise<void>;

  // CRUD 操作
  public async createSkill(slug: string, content: string): Promise<Skill>;
  public async readSkill(slug: string): Promise<SkillContent>;
  public async updateSkill(slug: string, content: string): Promise<void>;
  public async deleteSkill(slug: string): Promise<void>;
  public async listSkills(): Promise<SkillMeta[]>;

  // 文件操作
  public async readSkillFile(slug: string, filename: string): Promise<string>;
  public async writeSkillFile(slug: string, filename: string, content: string): Promise<void>;

  // 路径获取
  public getSkillPath(slug: string): string;
  public getSkillsDir(): string;
}
```

### 8. ClaudeService 服务层设计

为了避免重复代码和统一 Claude SDK 的使用,我们需要创建一个专门的 `claudeService`:

**新增文件**: `src/server/service/claudeService.ts`

```typescript
import logger from '@server/base/logger';
import authService from './authService';
import { modelProviderResolver } from './modelProviderResolver';
import type { ApiProvider } from '@/types';

/**
 * Claude SDK 配置
 */
interface ClaudeConfig {
  modelSlug: string;
  provider: ApiProvider;
}

/**
 * ClaudeService - 统一管理 Claude SDK 相关功能
 * 
 * 职责:
 * 1. Provider 配置获取和转换
 * 2. 模型选择和回退逻辑
 * 3. ApiProvider 对象构建
 * 4. 配置验证和日志记录
 */
export class ClaudeService {
  /**
   * 获取 Claude SDK 配置
   * 
   * @param modelSlug - 可选的模型标识
   * @returns Claude 配置对象
   */
  async getClaudeConfig(modelSlug?: string): Promise<ClaudeConfig> {
    const account = await authService.getCurrentUserAccount();
    if (!account) {
      throw new Error('User not authenticated');
    }

    const accountId = parseInt(account.id);
    let config;

    // 1. 尝试获取指定模型或默认模型
    if (modelSlug) {
      config = await modelProviderResolver.getActiveModelConfig(accountId, modelSlug);
      if (!config) {
        logger.warn(`[ClaudeService] Model ${modelSlug} not found, fallback to default`);
        config = await modelProviderResolver.getDefaultModelConfig(accountId);
      }
    } else {
      config = await modelProviderResolver.getDefaultModelConfig(accountId);
    }

    if (!config) {
      throw new Error('Model provider configuration not found');
    }

    logger.info(
      `[ClaudeService] Using model ${config.model.slug} from provider ${config.provider.name}`
    );

    // 2. 构建 ApiProvider 对象
    const provider: ApiProvider = {
      id: `claude-${Date.now()}`,
      name: config.provider.name,
      provider_type: 'anthropic',
      base_url: config.provider.baseUrl || '',
      api_key: config.provider.apiKey || '',
      is_active: 1,
      sort_order: 0,
      extra_env: '{}',
      notes: `Auto-generated for Claude SDK`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 3. 验证配置
    this.validateConfig(provider);

    return {
      modelSlug: config.model.slug,
      provider,
    };
  }

  /**
   * 验证配置完整性
   */
  private validateConfig(provider: ApiProvider): void {
    if (!provider.base_url || !provider.api_key) {
      throw new Error(
        `Invalid provider configuration: missing ${!provider.base_url ? 'base_url' : 'api_key'}`
      );
    }
  }

  /**
   * 获取环境变量格式的配置 (用于 Claude Agent SDK)
   */
  async getEnvConfig(modelSlug?: string): Promise<{
    modelSlug: string;
    env: Record<string, string | undefined>;
  }> {
    const config = await this.getClaudeConfig(modelSlug);
    
    return {
      modelSlug: config.modelSlug,
      env: {
        ANTHROPIC_API_KEY: config.provider.api_key,
        ANTHROPIC_BASE_URL: config.provider.base_url,
      },
    };
  }
}

// 导出单例
export const claudeService = new ClaudeService();
```

**使用示例 - 在 reportService 中**:

```typescript
// 修改前
private async getModelConfig(modelSlug?: string): Promise<ClaudeAgentConfig> {
  const account = await authService.getCurrentUserAccount();
  // ... 50 行重复代码
}

// 修改后
import { claudeService } from '../claudeService';

private async getModelConfig(modelSlug?: string): Promise<ClaudeAgentConfig> {
  return claudeService.getEnvConfig(modelSlug);
}
```

**使用示例 - 在 /api/chat/claude 中**:

```typescript
import { claudeService } from '@/server/service/claudeService';

const config = await claudeService.getClaudeConfig(model);

const stream = streamClaude({
  prompt: content,
  sessionId: session_id,
  model: config.modelSlug,
  provider: config.provider,
  // ... 其他参数
});
```

### 9. 实现优先级

#### Phase 1: 核心基础设施 (本次 PR - 第一部分)
- [x] `streamClaude` 函数 (已完成)
- [x] `/api/chat/claude` 端点 (已完成)
- [ ] **ClaudeService 服务层** (新增)
- [ ] 重构 reportService 使用 claudeService
- [ ] 单元测试

#### Phase 2: UI 引擎选择器 (本次 PR - 第二部分)
- [ ] EngineSelector 组件
- [ ] 修改 `bailingLLMStream` 支持动态路由
- [ ] Session Config 添加 `engineType` 字段
- [ ] 端到端测试

#### Phase 3: Skills 管理 (未来 PR)
- [ ] Skills 文件存储架构
- [ ] Skills 数据库索引
- [ ] Skills 管理 UI
- [ ] Skills 导入功能

#### Phase 4: MCP Server 配置 (未来 PR)
- [ ] MCP Server 配置模型
- [ ] MCP Server 管理 UI
- [ ] MCP Server 集成测试

### 10. 安全考虑

- **权限控制**:使用 `permissionMode` 控制危险操作
- **沙箱隔离**:Agent 在指定 `cwd` 目录下工作
- **预算限制**:通过 `maxBudgetUsd` 控制成本
- **敏感数据**:API Keys 存储在 modelProviders 表,不暴露给用户
- **引擎隔离**:DeepAgents 和 Claude SDK 完全独立,互不干扰