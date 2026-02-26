# chat-api Specification

## Purpose
管理投资顾问聊天 API，支持通过 LangChain 或 DeepAgents.js 实现，提供流式 AI 响应。

## Requirements

### Requirement: DeepAgents.js Support
系统 MUST 支持使用 `deepagents` 作为投资顾问 Agent 的实现基础，提供与 LangChain 实现同等的功能能力，同时支持任务规划和分解。

#### Scenario: DeepAgent Initialization
- **GIVEN** 系统启动并接收到投资顾问聊天请求
- **WHEN** 需要创建投资顾问 Agent 实例
- **THEN** 系统必须（MUST）能够使用 `createDeepAgent()` 创建 DeepAgent 实例
- **THEN** DeepAgent 必须（MUST）配置所有 6 个工具
- **THEN** DeepAgent 必须（MUST）接受系统 prompt 和模型配置
- **THEN** DeepAgent 必须（MUST）支持任务规划和分解能力

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

#### Scenario: Feature Flag Support
- **GIVEN** 系统需要逐步迁移到 DeepAgents.js
- **WHEN** 环境变量 `USE_DEEPAGENTS` 设置为 `'true'`
- **THEN** 系统必须（MUST）使用 DeepAgents.js 实现
- **WHEN** 环境变量未设置或为 `'false'`
- **THEN** 系统必须（MUST）回退到 LangChain 实现

---

### Requirement: Task Planning & Decomposition
系统 MUST 支持 DeepAgents.js 的任务规划和分解能力，能够处理复杂的多步骤查询。

#### Scenario: Complex Query Handling
- **GIVEN** 用户提出复杂的投资咨询问题（涉及多个工具调用）
- **WHEN** DeepAgent 处理该查询
- **THEN** DeepAgent 必须（MUST）将复杂任务分解为可管理的步骤
- **THEN** DeepAgent 必须（MUST）按顺序执行必要的工具调用
- **THEN** DeepAgent 必须（MUST）根据中间结果调整后续步骤

#### Scenario: Sub-Agent Capability
- **GIVEN** DeepAgents.js 架构支持子代理
- **WHEN** 需要执行专业化任务（如深度股票研究）
- **THEN** 系统应当（SHOULD）支持委托给专门的子代理
- **THEN** 子代理必须（MUST）能够访问父代理的上下文

---

### Requirement: DeepAgents.js Streaming
系统 MUST 支持 DeepAgents.js 的原生流式输出，并转换为现有的 OpenAI 兼容格式。

#### Scenario: SDK Stream Event Handling
- **GIVEN** DeepAgents.js 开始流式生成响应
- **WHEN** 接收到流事件
- **THEN** 系统必须（MUST）将文本增量转换为 SSE 消息
- **WHEN** Agent 调用工具
- **THEN** 系统必须（MUST）生成包含 tool_calls 信息的 SSE 消息
- **WHEN** 流式响应结束
- **THEN** 系统必须（MUST）发送 `finish_reason: 'stop'` 的结束消息

#### Scenario: Tool Call Stream Conversion
- **GIVEN** Agent 决定调用工具
- **WHEN** DeepAgents.js 发送工具调用事件
- **THEN** 流适配器必须（MUST）生成 OpenAI 兼容的 tool_calls 格式
- **THEN** tool_calls 必须（MUST）包含：
  - `id`: 工具调用唯一标识
  - `index`: 调用索引（通常为 0）
  - `function.name`: 工具名称
  - `function.arguments`: JSON 字符串参数
  - `type`: 固定为 `'function'`

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

### Requirement: Investment Advisor Chat Endpoint
系统 MUST 提供投资顾问聊天端点 `/api/chat`，支持 **通过 LangChain 或 DeepAgents.js** 实现，通过 SSE 流式返回 AI 响应。

#### Scenario: 投资顾问基础对话
- **GIVEN** 用户已登录并有有效账户
- **WHEN** 用户发送聊天消息到 `/api/chat`
- **THEN** 系统必须（MUST）验证用户身份并获取 accountId
- **THEN** 系统必须（MUST）过滤消息，只保留 user 和 assistant 角色
- **THEN** 系统必须（MUST）从最后一条用户消息提取查询内容
- **THEN** 系统必须（MUST）调用 `chatService.chat()` 使用 `investment_advisor` agent
- **THEN** 系统 **应当（SHOULD）** 根据功能标志选择 LangChain 或 DeepAgents.js 实现
- **THEN** 系统必须（MUST）通过 SSE 流式返回响应
- **THEN** 返回的格式必须是 AI SDK 兼容的 UIMessageChunk 格式（**与实现方式无关**）

#### Scenario: 投资顾问流式响应
- **GIVEN** 用户发起投资顾问对话请求
- **WHEN** `chatService.chat()` 开始处理
- **THEN** 系统必须（MUST）发送 `text-start` 事件标识响应开始
- **THEN** 系统必须（MUST）流式发送消息块（chunks）
- **THEN** 系统必须（MUST）正确转换 **LangChain 流事件或 DeepAgents.js 流事件** 为目标格式
- **THEN** 系统必须（MUST）在结束时发送 `text-end` 事件
- **THEN** 系统必须（MUST）关闭 SSE 连接

---

### Requirement: Chat Service Integration
系统 MUST 通过 `chatService` 提供统一的聊天服务抽象，根据不同 agent 类型和 **功能标志** 路由到相应的实现。

#### Scenario: 投资顾问 Agent 调用
- **GIVEN** `agentId` 为 `investment_advisor`
- **WHEN** 调用 `chatService.chat()`
- **THEN** 系统必须（MUST）检查 `USE_DEEPAGENTS` 环境变量
- **THEN** 如果启用，系统必须（MUST）调用 DeepAgents.js 实现
- **THEN** 如果禁用，系统必须（MUST）调用原有的 LangChain 实现
- **THEN** 两种实现必须（MUST）接受相同的输入参数
- **THEN** 两种实现必须（MUST）返回相同的 SSE 输出格式

#### Scenario: Simplified chatService
- **GIVEN** 迁移到 DeepAgents.js
- **WHEN** 调用投资顾问 Agent
- **THEN** chatService 必须（MUST）直接调用 unified agent 的方法
- **THEN** chatService 不得（MUST NOT）创建 Graph 实例或管理 Graph 状态
- **THEN** 调用代码必须（MUST）简化为单一方法调用