# 投资助手 Investment Agent
![投资 Agent](https://mdn.alipayobjects.com/huamei_ptvnul/afts/img/A*75cHQpMc8-4AAAAAcFAAAAgAeg-GAQ/original)

这是一个使用 AI Coding 打造的本地化投资分析工具，利用 AI 提供全面的股票市场分析、资产管理和投资建议。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/ishenli/investment-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/ishenli/investment-agent/actions/workflows/ci.yml)
[![Dependabot Updates](https://github.com/ishenli/investment-agent/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/ishenli/investment-agent/actions/workflows/dependabot/dependabot-updates)


## 目录

- [概述](#概述)
- [安装与使用](#安装与使用)
  - [全局安装](#全局安装)
  - [本地开发](#本地开发)
  - [环境变量](#环境变量)
- [功能特性](#功能特性)
- [架构设计](#架构设计)
- [可用的脚本命令](#可用的脚本命令)
- [数据库操作](#数据库操作)
- [使用方法](#使用方法)
- [项目结构](#项目结构)
- [技术栈](#技术栈)
  - [前端框架与工具](#前端框架与工具)
  - [AI 与 LLM](#ai--llm)
  - [数据库与存储](#数据库与存储)
  - [数据可视化与图表](#数据可视化与图表)
  - [UI 组件库](#ui-组件库)
  - [开发工具与测试](#开发工具与测试)
- [CI/CD 自动化](#cicd-自动化)
- [部署](#部署)
- [贡献指南](#贡献指南)
- [许可证](#许可证)
- [致谢](#致谢)

## 概述

投资助手是一个先进的投资分析平台，使用多代理 AI 系统来分析股票并提供投资建议。它结合了技术分析、新闻情绪、基本面数据和市场趋势，提供全面的投资洞察。平台还支持资产组合管理和市场信息获取功能。

### 功能特性

![投顾智能体对话](https://mdn.alipayobjects.com/huamei_ptvnul/afts/img/A*rBlqR5EDXF4AAAAAXYAAAAgAeg-GAQ/original)

<center>智能体对话</center>

![](https://mdn.alipayobjects.com/huamei_ptvnul/afts/img/A*xb4HTbkfOcoAAAAAWhAAAAgAeg-GAQ/original)

<center>仓位管理</center>

![市场信息获取](https://mdn.alipayobjects.com/huamei_ptvnul/afts/img/A*K5SeQbplfAQAAAAAYbAAAAgAeg-GAQ/original)

<center>市场信息获取</center>

### 整体功能列表

- **多代理 AI 分析**：利用专门的 AI 代理进行股票分析的不同方面
  - 市场分析师：技术指标分析
  - 新闻分析师：市场情绪分析
  - 看涨/看跌研究员：多角度观点
  - 风险经理：投资风险评估
  - 交易员：最终决策制定

- **实时数据获取**：与金融数据提供商集成，获取最新的市场信息

- **全面技术分析**：
  - 移动平均线（MA）
  - 相对强弱指数（RSI）
  - 移动指数平均线（MACD）
  - 其他专业指标

- **智能新闻情绪分析**：评估新闻来源的市场情绪及其对股价的潜在影响

- **多层风险评估系统**：
  - 技术风险评估
  - 市场风险评估
  - 投资组合风险分析

- **交互式仪表板**：用户友好的界面，具有实时数据可视化功能

- **资产组合管理**：跟踪和分析投资组合的收益和风险

- **市场信息自动获取**：自动获取、分析和存储市场信息

- **持久化数据存储**：使用 SQLite 和 Drizzle ORM 进行可靠的数据持久化

## 安装与使用

### 全局安装

本项目可以作为 CLI 工具全局安装，使用以下命令：

```bash
# 使用 npm 全局安装
npm install -g investment-agent

# 收集支持的命令
# investment-agent: 主命令
# ig: 简写命令
```

### 本地开发

1. 克隆仓库：

   ```bash
   git clone https://github.com/ishenli/investment-agent.git
   cd investment-agent
   ```

2. 安装依赖：

   ```bash
   pnpm install
   # 或
   npm install
   ```

3. 创建环境变量配置：

   在根目录下创建 `.env.local` 文件（参考下方环境变量章节）

4. 运行开发服务器：

   ```bash
   pnpm dev
   # 访问 http://localhost:3000
   ```

### 环境变量

在 `.env.local` 文件中配置以下环境变量：

```env
# =================== LLM 配置 ===================
# OpenAI 兼容的 API 地址
MODEL_PROVIDER_URL=your_openai_compatible_api_url

# API 密钥
MODEL_PROVIDER_API_KEY=your_api_key

# 会话用户 ID
SESSION_USER_ID=your_user_id

# =================== 数据提供商 ===================
# Finnhub API 密钥（股票市场数据）
FINNHUB_API_KEY=your_finnhub_api_key

# =================== LangSmith (可选) ===================
# 用于 LangChain 追踪和调试
LANGSMITH_API_KEY=your_langsmith_api_key

# =================== 其他 API (可选) ===================
# 金融数据集密钥
FINANCIAL_DATASETS_KEY=your_financial_datasets_key
```

## 架构设计

该系统基于多代理架构构建，每个代理专门负责投资分析的特定方面：

### 核心代理架构

1. **市场分析师** (Market Analyst)
   - 使用技术指标（移动平均线、RSI、MACD 等）
   - 生成技术分析报告

2. **新闻分析师** (News Analyst)
   - 分析新闻情绪
   - 评估新闻对股价的潜在影响

3. **看涨研究员** (Bull Researcher)
   - 寻找支持看涨投资头寸的证据
   - 生成多头观点报告

4. **看跌研究员** (Bear Researcher)
   - 寻找支持看跌投资头寸的证据
   - 生成空头观点报告

5. **研究经理** (Research Manager)
   - 调解看涨和看跌分析师之间的辩论
   - 综合多方观点

6. **风险经理** (Risk Manager)
   - 基于所有分析评估投资风险
   - 确保适当的风险管理

7. **交易员** (Trader)
   - 基于所有分析做出最终投资决策
   - 生成可执行的投资建议

### 技术架构

- **前端层**：Next.js 16 + React 19 + TypeScript
- **AI 层**：LangChain + LangGraph (多代理编排)
- **数据层**：SQLite + Drizzle ORM
- **服务层**：RESTful API + WebSocket (实时数据)
- **状态管理**：Zustand + TanStack Query

## 可用的脚本命令

### 开发与构建

```bash
# 开发服务器 (Next.js)
pnpm dev

# 生产构建
pnpm build

# 启动生产服务器
pnpm start
```

### LangGraph 开发

> 只需要用于调试 langgraph，非必需

```bash
# LangGraph 开发服务器 (端口 54367)
pnpm langgraph:dev

# 启动 LangGraph 服务
pnpm langgraph:start
```

### 代码质量

```bash
# TypeScript 类型检查
pnpm types:check

# ESLint 检查
pnpm lint

# ESLint 自动修复
pnpm lint:fix

# Prettier 格式化
pnpm format

# 检查格式化
pnpm format:check
```

### 数据库操作

```bash
# 生成数据库迁移文件
pnpm db:generate

# 执行数据库迁移
pnpm db:migrate

# 打开 Drizzle Studio (数据库可视化管理)
pnpm db:studio
```

### 测试

```bash
# 测试资产服务
pnpm test
```

## 数据库操作

本项目集成了 SQLite 数据库和 Drizzle ORM，用于数据持久化。

### Drizzle ORM 关键特性

- 类型安全的数据库操作
- 自动化迁移管理
- 可视化数据库管理工具（Drizzle Studio）

### 数据库操作流程

1. **修改数据库 Schema**：编辑 `drizzle/config.ts` 或相关 schema 文件
2. **生成迁移文件**：`pnpm db:generate`
3. **执行迁移**：`pnpm db:migrate`
4. **可视化管理**：`pnpm db:studio`（可选）

## 使用方法

### Web 应用

1. 启动开发服务器：

   ```bash
   pnpm dev
   ```

2. 打开浏览器访问 [http://localhost:3000](http://localhost:3000)

### CLI 工具

如果已全局安装，可以使用：

```bash
# 使用完整命令
investment-agent [command] [options]

# 或使用简写
ig [command] [options]
```

## 项目结构

```
investment-agent/
├── bin/                          # 可执行文件 (CLI)
│   ├── investment-agent.js       # 主命令入口
│   └── ig.js                     # 简写命令入口
├── src/                          # 源代码目录
│   ├── app/                      # Next.js 应用目录
│   │   ├── (pages)/              # 页面组件（路由组）
│   │   │   ├── asset-management/           # 资产管理页面
│   │   │   ├── asset-market-info-fetcher/  # 市场信息获取页面
│   │   │   ├── stock/                    # 股票分析页面
│   │   │   └── ...                       # 其他页面
│   │   ├── api/                # API 路由
│   │   ├── components/         # React 组件
│   │   ├── hooks/              # 自定义 React Hooks
│   │   ├── lib/                # 工具函数库
│   │   ├── store/              # 状态管理 (Zustand stores)
│   │   └── types/              # TypeScript 类型定义
│   ├── server/                 # 服务端代码
│   │   ├── core/               # 核心服务
│   │   ├── service/            # 业务逻辑层
│   │   └── tradingagents/      # AI 代理实现
│   └── shared/                 # 客户端和服务端共享代码
├── tests/                      # 测试文件
│   ├── test-asset-service.ts
│   ├── test-asset-api.ts
│   ├── test-init-api.ts
│   ├── test-investment-chat.ts
│   └── test-position-service.ts
├── drizzle/                    # Drizzle ORM 配置
│   ├── config.ts               # 数据库配置
│   └── schema/                 # 数据库 schema 定义
├── public/                     # 静态资源
├── .next/                      # Next.js 构建输出（生成后）
├── .env.local                  # 环境变量（本地）
├── package.json                # 项目配置
├── tsconfig.json               # TypeScript 配置
├── tailwind.config.ts          # Tailwind CSS 配置
└── README.md                   # 项目文档
```

## 技术栈

### 前端框架与工具

- **Next.js** 16.0.0 - 全栈 React 框架
- **React** 19.2.0 - UI 库
- **TypeScript** 5.9.3 - 类型安全的 JavaScript
- **Tailwind CSS** 4.1.18 - 实用优先的 CSS 框架
- **PostCSS** - CSS 转换工具

### AI 与 LLM

- **LangChain** 1.2.7 - LLM 应用开发框架
- **LangGraph** 1.0.14 - 有向图编排和多代理系统
- **@langchain/core** 1.1.12 - LangChain 核心模块
- **@langchain/openai** 1.2.1 - OpenAI 集成
- **Vercel AI SDK** (ai) 5.0.119 - AI 流式响应
- **DeepAgents** 1.4.1 - 高级 AI 代理库
- **Tavily** 0.5.14 - 搜索和信息检索

### 数据库与存储

- **Better SQLite3** 12.6.0 - 嵌入式数据库
- **Drizzle ORM** 0.44.7 - 类型安全的 ORM
- **Drizzle Kit** 0.31.8 - 数据库迁移工具
- **Dexie** 4.2.1 - IndexedDB 封装（客户端存储）

### 数据可视化与图表

- **Recharts** 2.15.4 - React 图表库
- **@xyflow/react** 12.10.0 - 交互式流程图和节点图
- **React Syntax Highlighter** 16.1.0 - 代码高亮显示

### UI 组件库

- **Ant Design** 5.29.3 - 企业级 UI 设计语言
- **@ant-design/x** 1.6.1 - Ant Design 扩展组件
- **Radix UI** - 无样式基础组件库，Dialog, Avatar, Select, Tabs, Tooltip 等
- **LobeHub UI** 2.24.3 - 高级 UI 组件
- **Framer Motion** 12.25.0 - 动画库
- **Tailwind Animate CSS** 1.4.0 - Tailwind 动画扩展

### 状态管理与数据获取

- **Zustand** 5.0.9 - 轻量级状态管理
- **Zustand Utils** 2.1.1 - Zustand 扩展工具
- **TanStack Query** 5.90.16 - 服务端状态管理
- **SWR** 2.3.8 - 数据获取库
- **Ahooks** 3.9.6 - React Hooks 工具库

### 金融数据处理

- **Finnhub** 1.2.19 - 股票市场数据 API
- **Decimal.js** 10.6.0 - 精确的十进制数学运算

### 实用工具库

- **Lodash** 4.17.21 - JavaScript 实用工具库
- **Date-fns** 4.1.0 - 日期处理库
- **Dayjs** 1.11.19 - 轻量级日期处理
- **Axios** 1.13.2 - HTTP 客户端
- **Zod** 4.3.5 - 运行时类型验证和 schema 定义
- **UUID** 13.0.0 - UUID 生成器
- **Nanoid** 5.1.6 - 唯一 ID 生成器
- **Fast Deep Equal** 3.1.3 - 深度比较

### 文本与 Markdown 处理

- **Cheerio** 1.0.0-rc.10 - 服务端 jQuery 实现
- **Remark-parse** 11.0.0 - Markdown 解析器
- **Shiki** 3.21.0 - 语法高亮
- **Unified** 11.0.5 - 文本处理框架

### 日志与调试

- **Winston** 3.19.0 - 多传输日志库
- **Winston Daily Rotate File** 5.0.0 - 日志文件轮转
- **Debug** 4.4.3 - 调试工具

### 开发工具与测试

- **ESLint** 9.39.2 - 代码检查
- **ESLint Config Next** 16.0.0 - Next.js ESLint 配置
- **Prettier** 3.7.4 - 代码格式化
- **Husky** 9.1.7 - Git Hooks 管理工具
- **Lint-staged** - 暂存文件 lint 检查
- **Vitest** 3.2.4 - 单元测试框架

### 其他重要库

- **Recharts** - 图表可视化
- **Codesandbox Sandpack** - 在线代码编辑器
- **Dnd Kit** - 拖放功能
- **Embla Carousel** - 轮播组件
- **React Virtuoso** - 高性能列表渲染
- **Nuqs** - URL 查询参数管理

## CI/CD 自动化

本项目配置了完整的 CI/CD 流程，确保代码质量和稳定性。

### 工作流概述

#### 1. **CI 工作流** (`ci.yml`)

**触发条件**：
- 推送到 `main` 或 `develop` 分支
- Pull Request 合并到 `main`

**执行流程**：
```yaml
✓ 环境设置 (Node.js 18.x, 20.x)
✓ 依赖安装
✓ 类型检查 (typescript)
✓ 代码质量检查 (eslint)
✓ 格式化检查 (prettier)
✓ 运行所有测试 (vitest)
✓ 项目构建 (next build)
✓ 安全审计
```

### Git Hooks

使用 Husky 管理 Git Hooks，在提交前自动运行代码检查：

```bash
# 提交前自动执行
✓ lint-staged (检查暂存文件)
  ├─ ESLint 检查 JS/TS/TSX 文件
  └─ Prettier 检查 JSON/MD/CSS 文件
```

## 部署

直接本地部署即可

## 贡献指南

欢迎贡献！请遵循以下步骤：

1. **Fork 项目**
   
   ```bash
   # 在 GitHub 上点击 Fork 按钮
   ```
   
2. **克隆您的 Fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/investment-agent.git
   cd investment-agent
   ```

3. **创建功能分支**
   ```bash
   git checkout -b feature/amazing-feature
   # 或
   git checkout -b bugfix/fix-bug
   ```

4. **进行修改**
   - 遵循现有代码风格
   - 添加必要的测试
   - 更新文档（如需要）

5. **提交更改**
   ```bash
   git commit -m 'feat: add amazing feature'
   # 使用 conventional commit 格式
   ```

6. **推送到分支**
   ```bash
   git push origin feature/amazing-feature
   ```

7. **发起 Pull Request**
   - 在 GitHub 上创建 PR
   - 填写 PR 模板
   - 等待代码审查

### 代码规范

- 使用 **Conventional Commits** 规范
- 遵循 **ESLint** 和 **Prettier** 配置
- 编写 **TypeScript** 类型定义
- 添加必要的 **单元测试**

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件。

```text
MIT License

Copyright (c) 2025 ishenli

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 致谢

### 核心灵感来源

本项目基于以下优秀项目的研究和代码：

| 作者 | 仓库/项目 | 贡献 |
|------|----------|------|
| [Tauric Research Team](https://github.com/TauricResearch) | **[TradingAgents](https://github.com/TauricResearch/TradingAgents)** | 提供了多代理交易系统的核心架构思路，论文参考: [arxiv.org/pdf/2412.20138](https://arxiv.org/pdf/2412.20138) |
| [@delenzhang](https://github.com/delenzhang) | **[TradingAgents](https://github.com/delenzhang/TradingAgents)** | 中文优化和适配工作 |
| [@canisminor1990](https://github.com/canisminor1990) | [lobehub-ui](https://ui.lobehub.com/) | 高级 UI 组件和设计系统 |

### 技术支持

感谢开源社区的以下项目和工具：

- **Next.js** - React 框架
- **LangChain** - AI 应用开发
- **Ant Design** - UI 组件库
- **Radix UI** - 无样式组件
- 以及所有开源依赖的维护者们

---

**Made with ❤️ by ishenli**

如有问题或建议，欢迎提交 [Issue](https://github.com/ishenli/investment-agent/issues) 或联系作者。
