# Proposal: 将 Market Info 和 Report API 转换为 Agent Tools

## Why

当前系统的 `registerBusinessTools.ts` 中已注册约 20 个工具，但缺少以下重要业务 API：
- **市场信息 API**（4 个路由）- 创建、查询、更新、删除市场信息
- **报告 API**（2 个路由）- 报告生成和管理

这些功能对 Agent 进行投资分析非常重要，但目前 Agent 无法通过工具调用访问。

## What Changes

将以下 API 路由注册为 Agent Tools：

**市场信息相关**：
- `GET /api/asset/market-info` - 获取市场信息列表
- `GET /api/asset/market-info/latest` - 获取最新市场信息
- `GET /api/asset/market-info/detail` - 获取市场信息详情
- `PUT /api/asset/market-info` - 更新市场信息
- `DELETE /api/asset/market-info` - 删除市场信息
- `POST /api/market-fetcher/save` - 保存市场信息

**报告相关**：
- `GET /api/report` - 获取报告列表
- `GET /api/report/[id]` - 获取报告详情

## Impact

### 正面影响
- Agent 可以直接查询和创建市场信息
- Agent 可以生成和检索投资分析报告
- 扩展 Agent 分析能力

### 风险和缓解
- **权限控制**：复用现有 Controller 的认证逻辑 → 无需额外处理
- **参数验证**：复用现有 Zod Schema → 直接映射到 Tool Schema

## Scope

涉及的能力模块：
- `agent-management` - 扩展 Tool 注册

修改文件：
- `src/server/core/agents/hermes/registerBusinessTools.ts` - 添加新工具
- `src/server/core/business/index.ts` - 导出业务函数（如需要）
