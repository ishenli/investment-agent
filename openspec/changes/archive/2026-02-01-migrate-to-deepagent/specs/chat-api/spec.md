# chat-api Spec Delta: DeepAgents.js Integration

## ADDED Requirements

### Requirement: DeepAgent Configuration
系统 MUST 配置 DeepAgent 使用指定的模型和流模式。

#### Scenario: Model Configuration
- **GIVEN** 系统初始化 DeepAgent
- **WHEN** 创建 `investmentDeepAgent` 实例
- **THEN** 必须（MUST）配置 model 为 `chatModelOpenAI('Kimi-K2.5')`
- **THEN** 必须（MUST）配置所有 6 个工具
- **THEN** 必须（MUST）配置 systemPrompt

#### Scenario: Stream Mode Configuration
- **GIVEN** DeepAgent 执行流式请求
- **WHEN** 调用 `investmentDeepAgent.stream()`
- **THEN** 必须（MUST）使用 `streamMode: ['messages', 'values']` 配置
- **THEN** `messages` 模式用于 SSE 输出
- **THEN** `values` 模式用于消息日志记录

#### Scenario: Direct Tool Integration
- **GIVEN** DeepAgents.js 投资顾问 Agent
- **WHEN** Agent 需要执行工具调用
- **THEN** 工具必须（MUST）可以直接使用现有的 LangChain 工具，无需适配层
- **THEN** 工具必须（MUST）包含以下 6 个：
  - `stockSearchNewsTool` - 股票新闻搜索
  - `stockGetPriceTool` - 股票价格查询
  - `stockRecallMarketInfoTool` - 市场信息回忆
  - `stockRecallCompanyInfoTool` - 公司信息回忆
  - `noteQueryTool` - 笔记查询
  - `TravilySearchTool` - 互联网搜索
- **THEN** 工具调用结果必须（MUST）返回给 LLM 进行后续处理

---

### Requirement: Message Processing Utilities
系统 MUST 提供消息处理工具函数，用于处理 DeepAgents.js 的复杂消息格式。

#### Scenario: Message Role Extraction
- **GIVEN** DeepAgents.js 返回的消息对象
- **WHEN** 需要确定消息角色
- **THEN** `getMessageRole()` 必须（MUST）支持 `_getType()` 方法调用
- **THEN** `getMessageRole()` 必须（MUST）支持 `type` 属性读取
- **THEN** `getMessageRole()` 必须（MUST）支持从 `id` 数组推断角色
- **THEN** 返回值必须是：'human' | 'ai' | 'tool' | 'system' | ''

#### Scenario: Message Content Extraction
- **GIVEN** 消息对象包含 content 字段
- **WHEN** content 为字符串类型
- **THEN** `getMessageContent()` 必须（MUST）直接返回字符串
- **WHEN** content 为数组类型（如多模态内容块）
- **THEN** `extractContent()` 必须（MUST）提取所有 text 类型的文本块
- **THEN** 返回值必须是合并后的字符串

#### Scenario: Tool Call Extraction
- **GIVEN** AI 消息包含 tool_calls
- **WHEN** 需要提取工具调用信息
- **THEN** `getToolCalls()` 必须（MUST）从 `tool_calls` 属性提取
- **THEN** `getToolCalls()` 必须（MUST）从 `kwargs.tool_calls` 提取
- **THEN** 返回的每个工具调用必须（MUST）包含：id, name, args

#### Scenario: Tool Response Meta Extraction
- **GIVEN** Tool 消息需要提取元数据
- **WHEN** 调用 `getToolMessageMeta()`
- **THEN** 必须（MUST）提取 `tool_call_id`
- **THEN** 必须（MUST）提取 `name` (工具名称)
- **THEN** 返回值必须（MUST）包含：toolCallId, toolName, toolArgs

---

### Requirement: Stream Processing Utilities
系统 MUST 提供流处理工具函数，用于处理 DeepAgents.js 的流事件。

#### Scenario: Chunk Content Extraction
- **GIVEN** `messages` 模式的流事件数据
- **WHEN** 数据为元组格式 `[messageChunk, metadata]`
- **THEN** `extractAssistantChunkText()` 必须（MUST）从第一个元素提取内容
- **THEN** 必须（MUST）处理 `kwargs.content` 嵌套结构
- **THEN** 必须（MUST）支持字符串和数组两种 content 格式

#### Scenario: Chunk ID Extraction
- **GIVEN** 流事件数据包含消息 ID
- **WHEN** 调用 `extractChunkId()`
- **THEN** 必须（MUST）从元组第一个元素提取 `id` 属性
- **THEN** 如果 ID 不存在，必须（MUST）返回空字符串

---

### Requirement: DeepAgents.js Streaming (Enhanced)
系统 MUST 支持 DeepAgents.js 的原生流式输出，使用双模式流处理。

#### Scenario: SDK Stream Event Handling
- **GIVEN** DeepAgents.js 开始流式生成响应
- **WHEN** 使用 `streamMode: ['messages', 'values']` 调用
- **THEN** 系统必须（MUST）处理两种模式的事件
- **THEN** `messages` 模式用于 SSE 输出（ai message 和 tool call）
- **THEN** `values` 模式用于消息日志记录

#### Scenario: Values Mode Processing
- **GIVEN** 接收到 `values` 模式的流事件
- **WHEN** 解析 state.messages 数组
- **THEN** 系统必须（MUST）跳过 human 消息
- **THEN** 系统必须（MUST）使用 `getMessageRole()` 识别消息类型
- **THEN** 系统必须（MUST）使用 `getMessageId()` 去重（seenMessageIds Set）
- **THEN** 系统必须（MUST）使用 `getMessageContent()` 提取内容
- **THEN** 系统必须（MUST）使用 `getToolCalls()` 提取工具调用
- **THEN** 系统必须（MUST）使用 `getToolMessageMeta()` 提取 tool 消息元数据

#### Scenario: Messages Mode Processing
- **GIVEN** 接收到 `messages` 模式的流事件
- **WHEN** 数据格式为元组 `[messageChunk, metadata]`
- **THEN** 系统必须（MUST）使用 `extractChunkId()` 提取消息 ID
- **THEN** 系统必须（MUST）使用 `extractAssistantChunkText()` 提取内容
- **WHEN** 消息角色为 'ai'
- **THEN** 系统必须（MUST）调用 `emitter.sendMessage(id, content, null)` 发送 SSE
- **WHEN** 消息角色为 'tool'
- **THEN** 系统必须（MUST）调用 `emitter.sendToolCall()` 发送工具调用事件

#### Scenario: Tool Call Stream Conversion (Simplified)
- **GIVEN** Agent 决定调用工具
- **WHEN** DeepAgents.js 发送 tool 消息事件
- **THEN** 流适配器必须（MUST）提取 tool_call_id 和 name
- **THEN** 必须（MUST）通过 `emitter.sendToolCall()` 发送工具调用信息

#### Scenario: Stream Error Handling
- **GIVEN** 流式处理过程中发生错误
- **WHEN** 捕获到 DeepAgents.js 错误或流中断
- **THEN** 系统必须（MUST）记录错误日志
- **THEN** 系统必须（MUST）发送 SSE error 事件
- **THEN** 系统必须（MUST）关闭 SSE 连接
- **THEN** 系统不得（MUST NOT）抛出未处理的异常

---

### Requirement: Architecture Simplification
系统 MUST 简化投资顾问 Agent 的架构，移除不必要的抽象层。

#### Scenario: Graph Removal
- **GIVEN** 当前 InvestmentAdvisorGraph 使用单节点 StateGraph
- **WHEN** 迁移到 DeepAgents.js
- **THEN** 系统必须（MUST）删除 InvestmentAdvisorGraph 及其状态定义
- **THEN** chatService 必须（MUST）直接调用 unified agent
- **THEN** 功能必须（MUST）保持完全一致

#### Scenario: Unified Agent File
- **GIVEN** 新的 DeepAgents.js 实现
- **WHEN** 创建投资顾问 Agent
- **THEN** 所有逻辑必须（MUST）集中在一个文件中
- **THEN** 文件必须（MUST）包含：系统 prompt、DeepAgent 配置、上下文构建、chat 方法

---

## MODIFIED Requirements

### Requirement: Investment Advisor Chat Endpoint (MODIFIED)
系统 MUST 提供投资顾问聊天端点 `/api/chat`，支持 **DeepAgents.js** 实现，通过 SSE 流式返回 AI 响应。

#### Scenario: 投资顾问基础对话 (MODIFIED)
- **GIVEN** 用户已登录并有有效账户
- **WHEN** 用户发送聊天消息到 `/api/chat`
- **THEN** 系统必须（MUST）验证用户身份并获取 accountId
- **THEN** 系统必须（MUST）过滤消息，只保留 user 和 assistant 角色
- **THEN** 系统必须（MUST）从最后一条用户消息提取查询内容
- **THEN** 系统必须（MUST）调用 `chatService.chat()` 使用 `investment_advisor` agent
- **THEN** 系统必须（MUST）通过 SSE 流式返回响应
- **THEN** 返回的格式必须是 AI SDK 兼容的 UIMessageChunk 格式

#### Scenario: 投资顾问流式响应 (MODIFIED)
- **GIVEN** 用户发起投资顾问对话请求
- **WHEN** `chatService.chat()` 开始处理
- **THEN** 系统必须（MUST）发送 `text-start` 事件标识响应开始
- **THEN** 系统必须（MUST）流式发送消息块（chunks）
- **THEN** 系统必须（MUST）正确转换 DeepAgents.js 流事件为目标格式
- **THEN** 系统必须（MUST）在结束时发送 `text-end` 事件
- **THEN** 系统必须（MUST）关闭 SSE 连接

---

### Requirement: Chat Service Integration (MODIFIED)
系统 MUST 通过 `chatService` 提供统一的聊天服务抽象，针对 `investment_advisor` agent 调用 DeepAgents.js 实现。

#### Scenario: 投资顾问 Agent 调用 (MODIFIED)
- **GIVEN** `agentId` 为 `investment_advisor`
- **WHEN** 调用 `chatService.chat()`
- **THEN** 系统必须（MUST）调用 DeepAgents.js 实现
- **THEN** 系统必须（MUST）返回 SSE 输出格式

#### Scenario: Simplified chatService (MODIFIED)
- **GIVEN** 迁移到 DeepAgents.js
- **WHEN** 调用投资顾问 Agent
- **THEN** chatService 必须（MUST）直接调用 unified agent 的方法
- **THEN** chatService 不得（MUST NOT）创建 Graph 实例或管理 Graph 状态
- **THEN** 调用代码必须（MUST）简化为单一方法调用

---

## RENAMED Requirements

None.

---

## REMOVED Requirements

### Requirement: LangChain Tool Adapter (REMOVED)
**原因**: DeepAgents.js 原生支持 LangChain 工具，无需适配层。

---

### Requirement: Skills Extensibility (REMOVED)
**原因**: 当前 design 不涉及 Skills 架构，DeepAgents.js 直接管理工具。

---

## Implementation Notes

### Tool Integration

DeepAgents.js directly supports LangChain tools without an adapter layer:

```typescript
import { createDeepAgent } from "deepagents";
import {
  stockSearchNewsTool,
  stockGetPriceTool,
  // ... other tools
} from '../../tools';
import { chatModelOpenAI } from '../provider/chatModel';

const investmentDeepAgent = createDeepAgent({
  model: chatModelOpenAI('Kimi-K2.5'),  // Model configuration
  tools: [
    stockSearchNewsTool,
    stockGetPriceTool,
    stockRecallMarketInfoTool,
    stockRecallCompanyInfoTool,
    noteQueryTool,
    TravilySearchTool,
  ],
  systemPrompt: SYSTEM_PROMPT,
});
```

### Stream Event Mapping

| DeepAgents.js Event | Mode | Processing |
|---------------------|------|------------|
| Text chunk | messages | `extractAssistantChunkText()` → `emitter.sendMessage()` |
| Tool call | messages | `getToolMessageMeta()` → `emitter.sendToolCall()` |
| Message state | values | `getMessageRole/Content/ToolCalls()` → logging |
| Stream end | - | `emitter.sendMessage(id, null, 'stop')` |

### File Structure Changes

**Added:**
```
src/server/core/deepagents/
├── investmentAdvisorAgent.ts    # NEW: All-in-one file
└── util.ts                      # NEW: Message processing utilities

src/server/utils/
└── stream.ts                    # NEW: Stream processing utilities
```

**Deleted:**
```
src/server/core/graph/investmentAdvisorGraph/
├── index.ts                     # DELETE
└── investmentChatState.ts       # DELETE
```

**Updated:**
```
src/server/service/chatService.ts   # UPDATE: Simplified call
```

### Utility Functions

Message processing utilities (`src/server/core/deepagents/util.ts`):
- `getMessageRole(msg)` - Extract message role (human/ai/tool/system)
- `getMessageId(msg)` - Extract message ID with kwargs fallback
- `getMessageContent(msg)` - Extract content string
- `getToolCalls(msg)` - Extract tool_calls array
- `getToolMessageMeta(msg)` - Extract tool metadata (callId, name)
- `extractContent(content)` - Handle string or array content

Stream processing utilities (`src/server/utils/stream.ts`):
- `extractAssistantChunkText(data)` - Extract text from message chunk tuple
- `extractChunkId(data)` - Extract ID from message chunk tuple
- `extractContent(content)` - Handle varied content formats

### Dependencies

```json
{
  "deepagents": "^1.4.1"
}
```

Existing dependencies remain unchanged:
- `langchain`: Required for tool creation and message types
- `@langchain/openai`
- `@langchain/tavily`
- `zod`: Schema validation
- `fs-extra`: File operations for debugging
