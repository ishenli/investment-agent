# 投资助手

这是一个使用 Vibe Coding 打造的投资分析工具，利用 AI 提供全面的股票市场分析、资产管理和投资建议。

> 主要探索 AI Agent 的产品实践，并不用于实际生产

## 目录

- [概述](#概述)
- [功能特性](#功能特性)
- [架构](#架构)
- [入门指南](#入门指南)
  - [先决条件](#先决条件)
  - [安装](#安装)
  - [环境变量](#环境变量)
- [使用方法](#使用方法)
- [项目结构](#项目结构)
- [使用的技术](#使用的技术)
- [开发](#开发)
- [部署](#部署)
- [贡献](#贡献)
- [许可证](#许可证)

## 概述

投资助手是一个先进的投资分析平台，使用多代理 AI 系统来分析股票并提供投资建议。它结合了技术分析、新闻情绪、基本面数据和市场趋势，提供全面的投资洞察。平台还支持资产组合管理和市场信息获取功能。

## 功能特性

- **多代理 AI 分析**：利用专门的 AI 代理进行股票分析的不同方面
- **实时数据**：与金融数据提供商集成，获取最新的市场信息
- **技术分析**：全面的技术指标和图表功能
- **新闻情绪分析**：评估新闻来源的市场情绪
- **风险评估**：多层风险评估系统
- **交互式仪表板**：用户友好的界面，具有实时数据可视化功能
- **资产组合管理**：跟踪和分析投资组合
- **市场信息获取**：自动获取和分析市场信息
- **数据库支持**：使用 SQLite 和 Drizzle ORM 进行数据持久化

## 架构

该系统基于多代理架构构建，每个代理专门负责投资分析的特定方面：

1. **市场分析师**：使用移动平均线、RSI、MACD 等指标进行技术分析
2. **新闻分析师**：分析新闻情绪及其对股价的潜在影响
3. **看涨研究员**：支持看涨的投资头寸
4. **看跌研究员**：支持看跌的投资头寸
5. **研究经理**：调解看涨和看跌分析师之间的辩论
6. **风险经理**：评估投资风险并确保适当的风险管理
7. **交易员**：基于所有分析做出最终投资决策

## 入门指南

### 先决条件

- Node.js 18.x 或更高版本
- pnpm（推荐）或 npm/yarn
- Git

### 安装

1. 克隆仓库：

   ```bash
   git clone https://github.com/ishenli/investment-agent.git
   ```

2. 进入项目目录：

   ```bash
   cd investment-agent
   ```

3. 安装依赖：
   ```bash
   pnpm install
   ```

### 环境变量

在根目录下创建一个 `.env.local` 文件，包含以下变量：

```env
# LLM 配置
MODEL_PROVIDER_URL=openai compatible api url
MODEL_PROVIDER_API_KEY=your_api_key
SESSION_USER_ID=your_user_id

# 数据提供商
FINNHUB_API_KEY=your_finnhub_api_key

# 其他 API 密钥
LANGSMITH_API_KEY=your_langsmith_api_key
FINANCIAL_DATASETS_KEY=your_financial_datasets_key
ALLTICK_API_KEY=your_alltick_api_key
```

## 数据库功能

本项目集成了 SQLite 数据库和 Drizzle ORM，用于数据持久化。

### 数据库脚本

```bash
# 生成数据库迁移文件
pnpm db:generate

# 执行数据库迁移
pnpm db:migrate

# 启动 Drizzle Studio
pnpm db:studio
```

## 使用方法

1. 启动开发服务器：

   ```bash
   pnpm dev
   # 或
   npm run dev
   # 或
   yarn dev
   ```

2. 打开浏览器并访问 [http://localhost:3000](http://localhost:3000)

3. 使用仪表板：
   - 分析个股：访问 /stock 页面进行股票分析
   - 查看市场概览：访问 /dashboard 页面查看市场概览
   - 访问您的投资组合分析：访问 /asset-management 页面管理资产
   - 获取市场信息：访问 /asset-market-info-fetcher 页面获取市场信息
   - 查看 AI 生成的投资建议

4. 构建应用

+ 执行 `pnpm run build`
+ 执行 `pnpm run start`

## 项目结构

```
src/
├── app/                 # Next.js 应用目录
│   ├── (pages)/         # 页面组件
│   │   ├── asset-management/     # 资产管理页面
│   │   ├── asset-market-info-fetcher/ # 市场信息获取页面
│   │   ├── stock/        # 股票分析页面
│   │   └── ...           # 其他页面
│   ├── api/             # API 路由
│   ├── components/      # React 组件
│   ├── hooks/           # 自定义钩子
│   ├── lib/             # 工具函数
│   ├── store/           # 状态管理 (Zustand)
│   └── types/           # TypeScript 类型
├── server/              # 服务端代码
│   ├── core/            # 核心服务
│   ├── service/         # 业务逻辑
│   └── tradingagents/   # AI 代理实现
├── shared/              # 客户端和服务端共享代码
└── types/               # 共享的 TypeScript 类型
```

## 使用的技术

- **前端**：Next.js 16, React 19, TypeScript
- **样式**：Tailwind CSS
- **状态管理**：Zustand
- **UI 组件**：Radix UI, Shadcn UI, Ant Design
- **AI/ML**：LangChain.js, OpenAI API
- **数据可视化**：Recharts
- **金融数据**：Finnhub API
- **验证**：Zod
- **日志**：Winston
- **数据库**：SQLite, Drizzle ORM

## 开发

### 运行开发服务器

```bash
pnpm dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看结果。

### 构建生产版本

```bash
pnpm build
```

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定测试
pnpm test:asset
pnpm test:asset-api
```

### 代码检查

```bash
pnpm lint
# 或使用自动修复
pnpm lint:fix
```

## 部署

部署 Next.js 应用最简单的方法是使用 Next.js 创建者提供的
[Vercel 平台](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)。

查看我们的
[Next.js 部署文档](https://nextjs.org/docs/app/building-your-application/deploying)了解更多详情。

## 贡献

欢迎贡献！请按照以下步骤操作：

1. Fork 仓库
2. 创建新分支 (`git checkout -b feature/your-feature-name`)
3. 进行修改
4. 提交修改 (`git commit -m 'Add some feature'`)
5. 推送到分支 (`git push origin feature/your-feature-name`)
6. 发起 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详情请见 [LICENSE](LICENSE) 文件。

## 感谢

本项目基于[Tauric Research](https://github.com/TauricResearch)团队的[TradingAgents](https://github.com/TauricResearch/TradingAgents)，以及[arxiv.org/pdf/2412.20138](https://arxiv.org/pdf/2412.20138)。在此表示诚挚的感谢！

此外，以下作者与仓库也为本仓库提供了思路：

|作者|仓库|
|---|---|
|[@delenzhang](https://github.com/delenzhang)|[TradingAgents](https://github.com/delenzhang/TradingAgents)|
|[@hsliuping](https://github.com/hsliuping)|[TradingAgents-CN](https://github.com/hsliuping/TradingAgents-CN)|
|[@canisminor1990](https://github.com/canisminor1990)|[lobehub-ui](https://ui.lobehub.com/)|