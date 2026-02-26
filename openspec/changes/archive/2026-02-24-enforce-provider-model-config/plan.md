# 实现计划：强制使用 Provider 配置的模型

**分支**：`enforce-provider-model-config` | **日期**：2026-02-24
**输入**：模型配置管理需求

## 概要

统一使用用户配置的默认模型，移除所有硬编码模型名称。`chatService` 和 `reportService` 支持从前端指定模型，其他服务统一使用默认模型。

## 技术上下文

**语言/版本**：TypeScript 5+ / Node.js >= 20
**主要依赖**：Next.js 16, LangChain.js, Drizzle ORM
**存储**：SQLite (Provider 配置存储)
**测试**：Vitest
**性能目标**：模型配置检查 < 50ms（缓存命中）

## 项目结构

### 文档

```text
openspec/changes/enforce-provider-model-config/
├── proposal.md              # 变更提案
├── plan.md                  # 此文件
├── tasks.md                 # 任务清单
└── specs/
    └── model-provider/
        └── spec.md          # Delta 变更
```

### 源代码（修改范围）

```text
src/
├── server/
│   ├── core/
│   │   └── provider/
│   │       └── chatModel.ts          # 核心模型获取逻辑（修改）
│   └── service/
│       ├── modelProviderResolver.ts  # 模型解析服务（修改）
│       ├── chatService.ts            # 聊天服务（修改）
│       ├── reportService.ts          # 报告服务（修改）
│       ├── marketAIService.ts        # 市场分析服务（修改）
│       └── ...其他Graph/Service      # 统一使用默认模型
```

## 需求拆分

### User Stories

| 优先级 | 用户故事 | 独立验证 |
|--------|---------|---------|
| P1 | 作为用户，我希望所有 AI 调用使用我配置的默认模型 | 设置默认模型后验证各功能 |
| P1 | 作为用户，我希望聊天时能选择不同模型 | 聊天界面模型选择器正常工作 |
| P2 | 作为用户，我希望报告生成时能选择模型 | 报告生成支持模型选择 |

## 技术架构

### 数据流

```
[服务/Graph] → [chatModelOpenAI()] → [ModelProviderResolver.getDefaultModel()]
                                           ↓
                                    [返回用户默认模型]
                                           ↓
                              ┌────────────────────────┐
                              │ 未配置？               │
                              ├────────────┬───────────┤
                              │ Yes        │ No        │
                              ↓            ↓
                         [环境变量]    [Provider配置]
```

### chatModelOpenAI 函数签名

```typescript
// 方式1：使用默认模型
async function chatModelOpenAI(): Promise<ChatOpenAI>;

// 方式2：指定模型（向后兼容）
async function chatModelOpenAI(modelSlug: string): Promise<ChatOpenAI>;

// 实现：参数可选
async function chatModelOpenAI(modelSlug?: string): Promise<ChatOpenAI> {
  if (modelSlug) {
    // 尝试获取指定模型，未找到则回退到默认
  } else {
    // 获取默认模型
  }
}
```

### 错误处理

- 无任何配置 → 抛出明确错误，提示用户配置 Provider
- 指定模型未找到 → 回退到默认模型并记录警告日志

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 现有用户无配置 | 中 | 保留环境变量 fallback |
| 性能影响 | 低 | 使用缓存优化查询 |

## 测试策略

- **单元测试**: `chatModelOpenAI` 函数的各种调用方式
- **集成测试**: 默认模型获取逻辑、回退逻辑