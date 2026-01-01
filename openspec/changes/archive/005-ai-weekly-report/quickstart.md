# Quickstart Guide: AI 智能投资周报

## 1. 功能概述

AI 智能投资周报功能通过 AI 自动分析用户本周的持仓变化、市场动态及个人笔记，生成一份集业绩复盘、信息回顾、策略建议于一体的深度报告。

## 2. 核心价值

1. **自动化**: 无需手动统计，自动聚合价格、交易、笔记、新闻数据
2. **深度洞察**: AI 不仅仅是罗列数据，而是寻找"价格变化"与"市场信息"之间的因果联系
3. **行动导向**: 报告结尾提供具体的调仓或关注建议

## 3. 快速开始

### 3.1 前置条件

确保已安装以下依赖：
- Node.js >= 18
- pnpm >= 8
- 数据库已初始化并运行

### 3.2 安装步骤

1. 克隆项目仓库
2. 安装依赖：
   ```bash
   pnpm install
   ```
3. 运行数据库迁移：
   ```bash
   pnpm db:migrate
   ```
4. 启动开发服务器：
   ```bash
   pnpm dev
   ```

### 3.3 访问周报功能

1. 在浏览器中打开应用
2. 导航到"智能周报"页面
3. 查看历史报告或生成新报告

## 4. API 使用示例

### 4.1 生成周报

```bash
curl -X POST /api/weekly-report/reports \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "1",
    "type": "weekly"
  }'
```

### 4.2 获取报告列表

```bash
curl -X GET "/api/weekly-report/reports?accountId=1&type=weekly"
```

### 4.3 获取报告详情

```bash
curl -X GET "/api/weekly-report/reports/1"
```

## 5. 开发指南

### 5.1 项目结构

```
src/
├── app/
│   ├── (pages)/
│   │   └── weekly-report/
│   │       ├── page.tsx          # 周报页面入口
│   │       ├── components/       # 页面组件
│   │       └── hooks/            # 页面专用 hooks
│   ├── components/
│   │   └── weekly-report/        # 可复用组件
│   ├── store/
│   │   └── weekly-report/        # 状态管理
│   └── api/
│       └── weekly-report/        # API 路由
│           └── route.ts          # API 控制器
└── server/
    └── service/
        └── weeklyReportService.ts # 核心业务逻辑
```

### 5.2 核心服务

WeeklyReportService 是周报功能的核心服务，负责：

1. 聚合本周数据（持仓、交易、市场信息、笔记等）
2. 调用 AI 模型生成报告
3. 存储和管理生成的报告

### 5.3 数据模型

周报功能使用以下主要数据表：

1. `analysis_reports` - 存储生成的分析报告
2. `asset_positions` - 持仓数据
3. `transactions` - 交易记录
4. `asset_market_info` - 市场信息
5. `notes` - 用户笔记
6. `asset_meta` - 资产元数据（包含投资备忘录）

### 5.4 API 控制器

API 控制器遵循项目标准模式：

1. 继承 BaseController
2. 使用 WithRequestContext 装饰器
3. 实现标准 HTTP 方法（GET, POST, DELETE）

## 6. 测试

### 6.1 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定测试
pnpm test:unit src/server/service/weeklyReportService.test.ts
```

### 6.2 测试覆盖

确保以下方面有充分的测试覆盖：

1. WeeklyReportService 的数据聚合逻辑
2. API 控制器的请求处理
3. 数据验证和错误处理
4. AI 生成报告的集成测试

## 7. 部署

### 7.1 构建应用

```bash
pnpm build
```

### 7.2 启动生产服务器

```bash
pnpm start
```

### 7.3 环境变量

确保设置以下环境变量：

```
OPENAI_API_KEY=your_openai_api_key
DATABASE_URL=your_database_url
```

## 8. 故障排除

### 8.1 报告生成失败

1. 检查 OpenAI API 密钥是否正确配置
2. 确认网络连接正常
3. 查看服务器日志获取详细错误信息

### 8.2 数据不完整

1. 确认相关数据表中有本周的数据
2. 检查数据聚合逻辑是否正确
3. 验证时间范围筛选条件

### 8.3 性能问题

1. 检查数据库查询是否已优化
2. 确认是否启用了适当的缓存机制
3. 查看 AI API 调用是否超时

## 9. 最佳实践

1. **数据验证**: 始终验证输入数据的有效性
2. **错误处理**: 提供清晰的错误消息和适当的 HTTP 状态码
3. **日志记录**: 记录关键操作和错误信息以便调试
4. **安全性**: 确保用户只能访问自己的数据
5. **性能优化**: 对频繁查询的数据建立适当的索引