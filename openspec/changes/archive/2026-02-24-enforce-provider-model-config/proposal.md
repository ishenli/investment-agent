# Change: 强制使用 Provider 配置的模型

## Why

当前系统中多个服务硬编码了固定模型名称（如 `'Kimi-K2.5'`、`'Qwen3-Next-80B-A3B-Instruct'`），但这些模型可能未在用户的 Provider 中配置。当 Provider 未配置指定模型时，系统会默默 fallback 到环境变量配置，导致：

1. 用户无法感知实际使用的模型
2. 可能使用错误或不适用的模型
3. 无法统一管理模型配置

需要统一使用用户配置的默认模型，确保模型调用的可控性和一致性。

## What Changes

- **增强 `chatModelOpenAI` 函数**：支持无参数调用时获取用户默认模型
- **统一使用默认模型**：所有硬编码模型名称的位置改为使用默认模型
- **保留前端模型选择**：`chatService` 和 `reportService` 支持从前端指定模型

### 受影响的文件

| 文件 | 当前硬编码 | 修改方式 |
|------|-----------|----------|
| `chatService.ts:364` | `'Qwen3-Next-80B-A3B-Instruct'` | 前端传入或使用默认模型 |
| `reportService.ts:806` | `ModelMap['Kimi-K2.5']` | 使用默认模型 |
| 其他 Graph/Service | 各种固定模型 | 统一使用默认模型 |

## Impact

- **Affected specs**: `model-provider` (新建 capability)
- **Affected code**:
  - `src/server/core/provider/chatModel.ts` - 核心模型获取逻辑
  - `src/server/service/chatService.ts` - 聊天服务
  - `src/server/service/reportService.ts` - 报告服务
  - 其他使用 `chatModelOpenAI` 的 Graph 和 Service

## 行为变更

### Before
```typescript
const llm = await chatModelOpenAI('Kimi-K2.5');
// 硬编码模型，可能未在 Provider 中配置
```

### After
```typescript
// 使用默认模型
const llm = await chatModelOpenAI();

// chatService: 前端指定模型或使用默认
const llm = await chatModelOpenAI(request.model || undefined);
```

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 现有用户无 Provider 配置 | 中 | 保留环境变量 fallback 作为兼容方案 |
| 默认模型未设置 | 低 | 自动选择第一个可用模型作为默认 |