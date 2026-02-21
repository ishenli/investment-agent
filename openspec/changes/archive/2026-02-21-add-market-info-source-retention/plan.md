# Technical Plan: 市场信息原文保留功能

## Overview

基于现有 `market-fetcher` API 进行改造，支持两种内容保存模式：
1. **AI摘要模式**（现有）：保存AI提取的分析摘要
2. **原文保留模式**（新增）：保存原始文章内容

## Tech Stack

- **Database**: SQLite + Drizzle ORM
- **Backend**: Next.js API Routes + TypeScript
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Validation**: Zod

## Schema Changes

### Database Schema (drizzle/schema.ts)

```typescript
// 修改 assetMarketInfo 表，新增字段
export const assetMarketInfo = sqliteTable('asset_market_info', {
  // ... existing fields ...
  originalContent: text('original_content'), // ADDED: 存储原始文章内容
  contentMode: text('content_mode', { enum: ['ai_summary', 'original'] })
    .notNull()
    .default('ai_summary'), // ADDED: 内容处理模式标记
});
```

### TypeScript Types (src/types/marketInfo.ts)

```typescript
// ADDED: 内容处理模式枚举
export type ContentMode = 'ai_summary' | 'original';

// MODIFIED: AssetMarketInfoType 新增字段
export type AssetMarketInfoType = {
  // ... existing fields ...
  originalContent: string | null; // ADDED
  contentMode: ContentMode;       // ADDED
};

// MODIFIED: CreateAssetMarketInfoRequest 新增字段
export type CreateAssetMarketInfoRequest = {
  // ... existing fields ...
  originalContent?: string;       // ADDED
  contentMode: ContentMode;       // ADDED
};
```

## API Design

### POST /api/market-fetcher/save (现有API扩展)

扩展现有保存端点，支持 `contentMode` 参数：

```typescript
interface SaveMarketInfoRequest {
  // 现有字段
  assetMetaIds: number[];
  title: string;
  symbol: string;
  sentiment?: string;
  importance?: string;
  summary?: string;
  marketImpact?: string;
  keyTopics?: string;
  keyDataPoints?: string;
  sourceUrl?: string;
  sourceName?: string;
  marketInfoId?: string;  // MarketInformation ID（用于获取原文）

  // ADDED 字段
  contentMode: 'ai_summary' | 'original';  // 默认为 'ai_summary'
}
```

**业务逻辑**:

**AI摘要模式** (`contentMode: 'ai_summary'`):
- 使用现有逻辑，保存AI分析字段 (sentiment, summary, marketImpact等)
- `originalContent` 可选保存（如需备份原文）

**原文保留模式** (`contentMode: 'original'`):
- 通过 `marketInfoId` 查找对应的 `MarketInformation`
- 将 `MarketInformation.content` 保存到 `originalContent` 字段
- `summary` 字段可填空或使用原文前N字符作为预览
- 其他AI摘要字段可为空或使用默认值

### 流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                     添加市场信息流程                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │ Step 1: 内容  │───▶│ Step 2: 模式  │───▶│ Step 3: 保存数据  │  │
│  │    录入      │    │    选择      │    │                  │  │
│  └──────────────┘    └──────────────┘    └──────────────────┘  │
│         │                  │                         │          │
│         ▼                  ▼                         ▼          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │ 抓取URL/手动  │    │ AI摘要模式   │───▶│ 保存AI提取摘要    │  │
│  │   输入内容   │    │   (默认)     │    │ (现有逻辑)        │  │
│  └──────────────┘    └──────────────┘    └──────────────────┘  │
│         │                  │                                    │
│         │            ┌──────────────┐    ┌──────────────────┐  │
│         │            │ 原文保留模式  │───▶│ 保存原始内容      │  │
│         │            │              │    │ (新增逻辑)        │  │
│         │            └──────────────┘    └──────────────────┘  │
│         │                                                       │
│         │         ┌─────────────────────────────────────┐      │
│         └────────▶│       在资产详情页直接添加原文         │      │
│                   │   (跳过AI分析，直接录入保存)           │      │
│                   └─────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

### 现有组件修改

```
StepThreeDataSaver (修改)
├── ContentModeSelector (新增) - 模式切换: AI摘要 vs 原文
├── AIAnalysisPreview (现有) - AI分析结果预览
├── OriginalContentPreview (新增) - 原文内容预览
└── ActionButtons
    ├── CancelButton
    └── SaveButton
```

### 新增组件

```
AddMarketInfoDialog (新增)
├── ContentModeSelector - 模式切换
├── AssetSelector - 选择关联资产
├── OriginalContentForm
│   ├── TitleInput
│   ├── OriginalContentTextarea (大文本框)
│   └── SourceUrlInput
└── ActionButtons
```

## State Management

### StepThreeDataSaver 新增状态

```typescript
interface StepThreeState {
  contentMode: 'ai_summary' | 'original';
  // 现有状态保持不变
  selectedAssetIds: number[];
  isFinalSaving: boolean;
  // ...
}
```

### AddMarketInfoDialog 状态

```typescript
interface AddMarketInfoFormState {
  contentMode: 'ai_summary' | 'original';
  assetMetaIds: number[];
  // 原文模式字段
  title: string;
  originalContent: string;
  sourceUrl: string;
  sourceName: string;
  // AI摘要模式字段（如需要）
  sentiment?: string;
  importance?: string;
  summary?: string;
  marketImpact?: string;
}
```

## Migration Strategy

1. **数据库迁移**：添加 `original_content` 和 `content_mode` 字段
2. **旧数据处理**：
   - `content_mode` 默认 `'ai_summary'`
   - `original_content` 可为 null
3. **API向后兼容**：`contentMode` 参数可选，默认 `'ai_summary'`

## Error Handling

- 原文模式下通过 `marketInfoId` 查不到 `MarketInformation` 时返回 404
- 原文内容长度限制（最大 100KB）
- 使用 Zod 进行请求体验证

## Security Considerations
- 原文内容长度限制（100KB）
- XSS防护：展示时转义HTML标签
- 用户权限检查：仅登录用户可创建

## Integration Points

### 与现有系统的集成

1. **market-fetcher 系统**：
   - 复用 `MarketInformation` 作为原文暂存
   - 通过 `marketInfoId` 关联原文数据

2. **asset-market-info 系统**：
   - 扩展 `AssetMarketInfoType` 存储原文
   - 根据 `contentMode` 决定展示方式

3. **AI分析系统**：
   - 原文模式下可跳过AI分析步骤
   - 后续可添加"对原文进行AI分析"功能
