# 投资助手 Investment Agent

基于多引擎 AI 架构的本地化投资分析工具，支持多渠道通信，提供全面的股市分析、资产管理和智能投资建议。

[English Version](../../README.md) | 中文版本
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/ishenli/investment-agent)](https://github.com/ishenli/investment-agent/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/ishenli/investment-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/ishenli/investment-agent/actions/workflows/ci.yml)

## 功能特性

### 多引擎 AI 架构
- **DeepAgents 引擎** - 基于 LangChain/LangGraph 的智能体编排
- **Claude 引擎** - Anthropic Claude Agent SDK 集成
- **Hermes 引擎** - 轻量级智能体框架，支持工具调用与全链路可观测性（追踪、指标、成本统计）
- 统一引擎接口，无缝切换

### 多渠道通信
- **微信集成** - 通过 iLink 长轮询实现个人微信接入
- **飞书支持** - 飞书机器人集成（即将推出）
- **Web 界面** - 对话式 AI 交互
- 统一消息路由，跨平台支持

### AI 驱动的分析工具
- **资产信息查询** - 通过 Finnhub 实时获取股票、基金、黄金价格
- **生成式 UI 卡片** - 在 assistant 消息中内联展示股票行情、基金详情、数据图表和交易意图确认
- **投资笔记搜索** - 语义化搜索投资笔记
- **数据库查询** - 自然语言转 SQL，查询持仓数据
- **网络搜索** - Tavily 驱动的市场研究
- **股票分析** - 技术指标和市场情绪分析

### Server-Driven 生成式 UI
- **受控 UI Artifact** - Agent 通过 `create_ui_artifact` 生成经过校验的 `UIArtifact` JSON，不生成任意 JSX 或 HTML
- **白名单组件渲染** - 前端只渲染已注册卡片类型：`stock_quote_card`、`fund_detail_panel`、`data_chart`、`trade_intent_card`
- **流式更新** - SSE 同时推送文本增量和 `ui_artifact` 事件，更新同一条 assistant 消息
- **安全 fallback** - 每张卡片都包含 `fallbackText`，用于复制、分享、导出、渲染失败和历史兼容
- **交易安全边界** - 交易意图卡只表达待确认的买入/卖出意图，真实执行必须经过用户确认和服务端校验

### 权限模式控制
- **对话级权限切换** - 在聊天输入框旁实时切换 Hermes 引擎的权限等级
- **四档权限等级**：
  - **Safe（安全）** — 仅允许读写操作，系统/金融类工具一律拦截
  - **Standard（标准）** — 系统和金融操作需用户二次确认
  - **Power（高级）** — 金融操作自动执行，系统操作仍需确认
  - **Unrestricted（无限制）** — 所有操作自动执行（ContentGuard 仍生效）
- **实时生效** — 权限设置随单次对话即时生效，不同会话可独立配置
- **内容安全防线** — ContentGuard 在权限层之下独立运行，识别危险指令和敏感文件访问

### 智能体可观测性
- **追踪与 Span 系统** - 每次智能体执行的分层追踪，显式上下文传递，兼容浏览器、Node.js 和 Electron
- **实时指标** - Token 用量、延迟、工具调用次数、迭代次数等实时统计
- **成本追踪** - 基于模型定价表的逐会话成本拆分
- **实时可观测面板** - 对话侧边栏展示执行时间线、Span 详情和汇总指标
- **持久化存储** - 追踪/Span 数据持久化到 SQLite，支持历史回溯

### 投资管理
- **持仓追踪** - 实时监控持仓和盈亏
- **资产管理** - 多账户支持，绩效分析
- **市场研究** - 聚合新闻和市场信息
- **投资笔记** - 基于标签的知识库管理

### 现代化界面
- 简洁仪表板，支持明暗主题
- 实时数据可视化
- 中英文国际化支持
- 桌面应用（Electron）支持

![](../asset/intro-light.png)

## 快速开始

### 环境要求
- Node.js 18+
- pnpm（推荐）或 npm

### 安装步骤

1. 克隆并安装：
```bash
git clone https://github.com/ishenli/investment-agent.git
cd investment-agent
pnpm install
```

2. 创建 `.env.local` 配置：
```env
# AI 配置
MODEL_PROVIDER_URL=your_openai_compatible_api_url
MODEL_PROVIDER_API_KEY=your_api_key

# 市场数据
FINNHUB_API_KEY=your_finnhub_key

# 可选：微信集成（iLink）
ILINK_API_URL=your_ilink_url
ILINK_API_KEY=your_ilink_key

# 可选：LangSmith 调试
LANGSMITH_API_KEY=your_langsmith_key
```

3. 启动开发服务器：
```bash
pnpm dev
# 访问 http://localhost:3000
```

### 全局安装（可选）
```bash
npm install -g investment-agent
investment-agent [command]  # 或：ig [command]
```

## 架构设计

### 多引擎智能体系统
```
┌─────────────────────────────────────────────┐
│           统一引擎接口                        │
├──────────────┬──────────────┬───────────────┤
│  DeepAgents  │    Claude    │    Hermes     │
│   (LangGraph)│  (Agent SDK) │   (轻量级)     │
├──────────────┴──────────────┴───────────────┤
│          AI 工具层                           │
│  • 资产查询    • 笔记搜索                     │
│  • 数据库查询  • 网络搜索                     │
│  • 股票分析                                  │
├──────────────────────────────────────────────┤
│          可观测层（Hermes）                  │
│  • 追踪/Span   • 指标统计  • 成本追踪          │
│  • 实时面板    • 持久化存储                   │
├──────────────────────────────────────────────┤
│          生成式 UI 层                         │
│  • UIArtifact  • 白名单组件  • fallback 文本   │
│  • SSE 事件    • 消息内卡片                   │
├──────────────────────────────────────────────┤
│          多渠道通信层                         │
│  • 微信       • 飞书      • Web 界面         │
├──────────────────────────────────────────────┤
│     业务逻辑 & 数据持久化                     │
└──────────────────────────────────────────────┘
```

### 核心组件
- **引擎注册中心** - 动态注册和切换 AI 引擎
- **工具系统** - 标准化工具接口，支持 LangChain/Claude SDK 适配
- **可观测系统** - 分层追踪、指标采集和智能体执行成本统计
- **生成式 UI 渲染器** - 在聊天消息内安全渲染经过校验的 UI artifacts
- **渠道路由器** - 统一消息路由，跨平台支持
- **会话管理** - 多轮对话，上下文持久化
- **数据层** - SQLite + Drizzle ORM，类型安全查询

## 微信集成

微信渠道支持通过个人微信号使用 AI 助手：

### 配置步骤
1. 在设置中配置 iLink API 凭证
2. 扫码登录微信账号
3. 开始接收和回复消息

### 架构特点
- **长轮询模式** - 无需 Webhook，后台轮询获取消息
- **上下文追踪** - 为每个会话维护对话上下文
- **消息去重** - 基于 TTL 的去重机制，确保可靠性
- **自动重连** - 内置重试逻辑和指数退避

### 功能特性
- 文本消息支持
- 会话跨重连保持
- 可配置分块响应
- 调试日志集成

## 技术栈（AI 相关）

### AI & LLM
- **LangChain & LangGraph** - 智能体编排和工作流
- **Claude Agent SDK** - Anthropic 智能体框架
- **DeepAgents** - 多智能体系统框架
- **AI SDK** - Vercel AI 工具包，支持流式输出

### 通信渠道
- **微信（iLink）** - 个人微信号集成
- **飞书** - 企业消息平台（计划中）

### 数据与存储
- **SQLite + Drizzle ORM** - 类型安全的数据库操作
- **Finnhub API** - 实时市场数据
- **Tavily API** - 网络搜索能力

### 后端与可观测性
- **Hermes 可观测性** - 追踪/Span 生命周期、指标采集、成本追踪
- **SQLite + Drizzle ORM** - 类型安全的数据库操作
- **事件总线** - 即发即弃的可观测性 Sink 系统

### 前端
- **Next.js 16 + React 19** - 现代化 Web 框架
- **Ant Design + Radix UI** - UI 组件库
- **TailwindCSS** - 样式方案
- **生成式 UI 渲染器** - 通过 Zod 校验后在投资对话中展示内联业务卡片

## 常用命令

```bash
# 开发
pnpm dev              # 启动开发服务器

# 构建和部署
pnpm build            # 构建生产版本
pnpm start            # 启动生产服务器

# 数据库
pnpm db:generate      # 生成迁移文件
pnpm db:migrate       # 执行迁移
pnpm db:studio        # 打开 Drizzle Studio

# 代码质量
pnpm lint             # ESLint 检查
pnpm format           # Prettier 格式化
pnpm test             # 运行测试
```

## 项目结构

```
src/
├── app/              # Next.js 页面和路由
│   ├── api/channel/  # 微信/飞书 Webhook 路由
│   ├── api/chat/     # 对话、可观测性与交易意图 API
│   └── (pages)/chat/features/Conversation/components/GenerativeUI/
│                     # 消息内 UI artifact 渲染器与卡片注册表
├── server/
│   ├── core/
│   │   ├── agents/   # AI 智能体实现
│   │   │   ├── langchain/  # DeepAgents 引擎
│   │   │   ├── claude/     # Claude 引擎
│   │   │   └── hermes/     # Hermes 引擎
│   │   ├── engine/   # 引擎注册和运行器
│   │   └── business/ # 核心业务逻辑
│   ├── channel/      # 渠道处理器
│   ├── service/      # API 服务
│   │   └── observabilityService.ts
│   └── repository/   # 数据访问层
│       └── chat/     # 对话与可观测性仓库
├── types/            # TypeScript 类型定义
│   └── chat/         # 对话 schema，包括 UIArtifact 协议
└── locales/          # 国际化翻译
packages/
├── agent-channel/    # 多平台消息 SDK
│   └── src/weixin/   # 微信渠道实现
└── hermes-agent/
    └── src/
        └── observability/  # 追踪、指标、成本追踪
```

## 核心模块

| 模块 | 路径 | 说明 |
|-----|------|-----|
| 对话 | `/chat` | AI 驱动的对话界面 |
| 生成式 UI | `/chat` | 股票、图表、基金和交易意图的消息内 UI artifacts |
| 资产 | `/asset` | 持仓和仓位管理 |
| 研究 | `/research` | 市场研究和分析 |
| 笔记 | `/note` | 投资知识库 |
| 报告 | `/report` | 分析报告历史 |
| 设置 | `/setting` | 账户、AI 模型和渠道配置 |

## 环境变量

| 变量 | 必填 | 说明 |
|-----|------|-----|
| `MODEL_PROVIDER_URL` | ✓ | OpenAI 兼容的 API 地址 |
| `MODEL_PROVIDER_API_KEY` | ✓ | LLM API 密钥 |
| `FINNHUB_API_KEY` | ✓ | Finnhub 市场数据 API |
| `ILINK_API_URL` | | iLink API 地址（微信） |
| `ILINK_API_KEY` | | iLink API 密钥（微信） |
| `TAVILY_API_KEY` | | Tavily 网络搜索 API |
| `LANGSMITH_API_KEY` | | LangSmith 追踪（可选）|

## 部署

应用可作为桌面应用（Electron）或 Web 服务器本地运行。无需云端部署 - 所有数据保留在本地。

## 贡献指南

欢迎贡献！请：
1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 提交更改
4. 推送并创建 Pull Request

## 许可证

MIT 许可证 - 详见 [LICENSE](../../LICENSE) 文件。

## 致谢

| 项目 | 贡献 |
|-----|------|
| [TradingAgents](https://github.com/TauricResearch/TradingAgents) | 多智能体架构灵感 |
| [LobsterAI](https://github.com/netease-youdao/LobsterAI) | 技能系统参考 |
| [LobeUI](https://ui.lobehub.com/) | UI 组件库 |

---

Made with ❤️ by [ishenli](https://github.com/ishenli)

有问题？[提交 Issue](https://github.com/ishenli/investment-agent/issues)
