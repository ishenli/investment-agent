# Service 层规范

## 1. 概述

Service 层是项目业务逻辑的核心，负责业务规则执行、数据编排和领域操作。它处于 Controller 层（API 路由）和 Repository 层（数据访问）之间，是唯一允许包含业务逻辑的层级。

**分层关系：**
```
Controller → Service → Repository → Database
               ↕
          External APIs / Other Services
```

---

## 2. 目录结构和命名规范

### 2.1 目录结构

```
src/server/service/
├── accountService.ts
├── agentService.ts
├── modelProviderService.ts
├── settingService.ts
├── transactionService.ts
├── historyService/           # 复杂 Service 可拆分为子目录
│   ├── index.ts
│   └── helpers.ts
└── __tests__/                # 单元测试
    ├── settingService.test.ts
    └── agentService.test.ts
```

**规则：**
- 文件命名：`xxxService.ts`（camelCase，首字母小写）
- 复杂 Service（>300 行）可拆分到子目录，通过 `index.ts` 统一导出
- 测试文件放在 `__tests__/` 子目录，命名 `xxxService.test.ts`

### 2.2 导出方式

每个 Service 文件**必须**同时导出类（用于测试）和单例实例（用于使用）：

```typescript
// ✅ 必须同时导出类和单例
export class XxxService { ... }

const xxxService = new XxxService();
export default xxxService;
```

---

## 3. Service 层职责边界

### 3.1 Service 层负责

- **业务规则验证**：检查业务约束（如唯一性、权限归属、保留值校验）
- **数据编排**：协调多个 Repository 调用完成复杂操作
- **数据转换**：将 DB 实体转换为响应 DTO（如 `toXxxResponse(entity)` 转换函数）
- **错误处理**：捕获底层错误，按统一策略抛出或返回安全默认值
- **日志记录**：关键操作的日志记录
- **调用外部 API**：封装第三方服务调用（如 Finnhub、AI 服务）

### 3.2 Service 层禁止

- ❌ **直接操作 HTTP 请求/响应**（这是 Controller 的职责）
- ❌ **直接调用 `db`**（这是 Repository 的职责），见第 9 节例外说明
- ❌ **包含 UI 相关逻辑**
- ❌ **跨 Service 循环依赖**（A 依赖 B，B 依赖 A）

### 3.3 职责边界示例

```typescript
// ✅ Controller 职责：请求解析、响应构造
async POST(request: Request) {
  const body = await request.json();
  const result = await modelProviderService.createProvider(userId, body);
  return Response.json(result);
}

// ✅ Service 职责：业务逻辑
async createProvider(accountId: number, request: CreateModelProviderRequest) {
  // 业务规则：检查 slug 唯一性
  const existing = await modelProviderRepository.findByUserIdAndSlug(accountId, request.slug);
  if (existing) throw new Error('Slug already exists in this account');

  return modelProviderRepository.create({ userId: accountId, ...request });
}

// ✅ Repository 职责：纯数据库操作，无业务逻辑
async findByUserIdAndSlug(userId: number, slug: string) {
  return this.findOne(and(eq(table.userId, userId), eq(table.slug, slug)));
}
```

---

## 4. 编码模式

### 4.1 类构造函数

构造函数保持最小化，依赖直接通过模块顶层导入 Repository 单例：

```typescript
export class XxxService {
  constructor() {
    // 数据库连接已经在 db.ts 中初始化
  }
}
```

### 4.2 数据转换函数

将实体转响应 DTO 的转换函数定义为文件级私有函数（非类方法），利于复用和测试：

```typescript
// ✅ 文件级转换函数
function toAgentResponse(entity: AgentEntity): AgentTypeResponse {
  return {
    id: entity.id,
    slug: entity.slug,
    createdAt: entity.createdAt.toISOString(),  // Date → string
    // ...
  };
}

export class AgentService {
  async getAgent(id: number) {
    const entity = await agentRepository.findById(id);
    return entity ? toAgentResponse(entity) : null;
  }
}
```

### 4.3 方法分组

使用注释分隔符组织方法，提升可读性：

```typescript
export class XxxService {
  // ============== 初始化 ==============
  // ============== 查询操作 ==============
  // ============== 创建操作 ==============
  // ============== 更新操作 ==============
  // ============== 删除操作 ==============
}
```

---

## 5. 异常处理策略

### 5.1 读操作（查询）：返回安全默认值

查询操作捕获异常后**记录日志并返回安全默认值**，避免中断调用方：

```typescript
// ✅ 查询操作：返回默认值
async getProvidersByAccountId(accountId: number): Promise<ModelProvider[]> {
  try {
    return await modelProviderRepository.findByUserId(accountId);
  } catch (error) {
    logger.error(`Failed to get providers for account ${accountId}: ${error}`);
    return [];  // 返回空数组，不抛出
  }
}

async getProviderById(providerId: number): Promise<ModelProvider | null> {
  try {
    return await modelProviderRepository.findById(providerId);
  } catch (error) {
    logger.error(`Failed to get provider ${providerId}: ${error}`);
    return null;  // 返回 null，不抛出
  }
}
```

### 5.2 写操作（创建/更新/删除）：记录日志后重新抛出

写操作需要调用方感知失败，应**记录日志后 re-throw**：

```typescript
// ✅ 写操作：re-throw 让调用方处理
async createProvider(accountId: number, request: CreateModelProviderRequest) {
  try {
    const existing = await modelProviderRepository.findByUserIdAndSlug(accountId, request.slug);
    if (existing) {
      throw new Error('Slug already exists in this account');  // 业务错误，直接抛出
    }
    const result = await modelProviderRepository.create({ ... });
    logger.info(`Model provider created: ${result.id} for account ${accountId}`);
    return result;
  } catch (error) {
    logger.error(`Failed to create model provider: ${error}`);
    throw error;  // re-throw，Controller 层处理响应
  }
}
```

### 5.3 返回结构化结果（替代抛出）

对于预期内的业务失败，可返回结构化结果而不是抛出异常：

```typescript
// ✅ 结构化结果（适用于有多种失败原因的操作）
async deleteAgent(agentId: number): Promise<{ success: boolean; reason?: string }> {
  const agent = await agentRepository.findById(agentId);
  if (!agent) return { success: false, reason: 'Agent not found' };
  if (agent.isBuiltin) return { success: false, reason: 'Cannot delete builtin agent' };

  await agentRepository.delete(agentId);
  return { success: true };
}
```

---

## 6. 日志记录规范

### 6.1 日志 import

```typescript
import logger from '@server/base/logger';
```

### 6.2 日志格式

**带 Service 前缀（推荐用于重要操作）：**
```typescript
logger.info('[AgentService] Builtin agents initialization completed. Created: 3, Skipped: 2');
logger.error('[AgentService] Failed to create builtin agent "slug":', error);
```

**不带前缀（简洁格式）：**
```typescript
logger.info(`Model provider created: ${id} for account ${accountId}`);
logger.error(`Failed to get providers for account ${accountId}: ${error}`);
```

### 6.3 日志级别选择

| 级别 | 使用场景 |
|------|---------|
| `logger.debug` | 开发调试信息，循环内检查，详细状态 |
| `logger.info` | 成功的业务操作（创建/更新/删除成功） |
| `logger.warn` | 非预期但可恢复的情况（数据不完整、降级处理） |
| `logger.error` | 操作失败、异常捕获 |

### 6.4 关键业务节点必须记录

- ✅ 初始化流程（开始、结果统计）
- ✅ 创建/删除成功（记录 ID）
- ✅ 权限验证失败（记录被拒绝的操作）
- ✅ 外部 API 调用失败
- ✅ 捕获到异常时的 `logger.error`

### 6.5 敏感信息安全

- ❌ 禁止打印 API Key、密码、Token
- ❌ 禁止打印完整请求体（可能含敏感字段）
- ✅ 打印 ID、slug、userId 等非敏感标识符

```typescript
// ✅ 安全：打印 ID
logger.info(`Provider created: ${newProvider.id}`);

// ❌ 危险：打印 apiKey
logger.info(`Provider created with apiKey: ${request.apiKey}`);
```

---

## 7. 事务管理

### 7.1 跨表原子操作

当需要对多张表进行原子操作时，使用 Drizzle 的事务 API：

```typescript
import { db } from '@server/lib/db';

async addTransaction(data: TransactionData): Promise<TransactionRecord> {
  // 需要同时写入 transactions 表和更新 accountFunds 表
  return await (db as any).transaction(async (tx: any) => {
    // 1. 插入交易记录
    const [newTransaction] = await tx
      .insert(transactions)
      .values({ ... })
      .returning();

    // 2. 更新账户余额
    await tx
      .update(accountFunds)
      .set({ amountCents: newBalance })
      .where(eq(accountFunds.accountId, accountId));

    return newTransaction;
  });
}
```

### 7.2 事务使用原则

- 涉及多表写操作且需要保证一致性时**必须**使用事务
- 纯查询操作不需要事务
- 事务内避免调用外部 API（网络超时会导致事务长时间占用）
- 事务失败自动回滚，Service 层捕获后记录日志并 re-throw

---

## 8. 业务验证

### 8.1 验证位置

业务验证在 Service 层执行，输入格式验证在 Controller 层执行：

```typescript
// Controller 层：验证输入格式（使用 zod/schema）
const body = CreateModelProviderRequestSchema.parse(await request.json());

// Service 层：验证业务规则
async createProvider(accountId: number, request: CreateModelProviderRequest) {
  // 业务规则：检查 slug 是否被保留
  if (RESERVED_SLUGS.includes(request.slug)) {
    throw new Error(`Slug "${request.slug}" is reserved`);
  }

  // 业务规则：检查 slug 唯一性
  const existing = await modelProviderRepository.findByUserIdAndSlug(accountId, request.slug);
  if (existing) throw new Error('Slug already exists in this account');

  // ...
}
```

### 8.2 常见验证模式

```typescript
// 资源存在性检查
const provider = await modelProviderRepository.findById(providerId);
if (!provider) throw new Error('Provider not found');

// 权限归属校验
const hasOwnership = await modelProviderRepository.verifyOwnership(providerId, accountId);
if (!hasOwnership) return null;  // 或 throw new Error('Forbidden')

// 唯一性检查
const exists = await repository.existsByField(value);
if (exists) throw new Error('Already exists');

// 保留值检查
if (BUILTIN_SLUGS.includes(request.slug)) {
  throw new Error(`Slug "${request.slug}" is reserved for builtin`);
}
```

---

## 9. 与 Repository 层的交互

### 9.1 标准方式：使用 Repository 单例

```typescript
import { modelProviderRepository } from '@server/repository/modelProviderRepository';
import { settingRepository } from '@server/repository/settingRepository';

export class ModelProviderService {
  async getProviders(accountId: number) {
    return modelProviderRepository.findByUserId(accountId);
  }
}
```

### 9.2 例外：可以直接使用 `db` 的场景

以下场景允许在 Service 中直接使用 `db`（需注释说明原因）：

- 该操作尚未有对应 Repository，且创建 Repository 收益不高
- 需要 `db.query.*`（Relational API，Repository 未封装）
- 多表事务操作（见第 7 节）

```typescript
// 允许：尚未有对应 Repository 的复杂关联查询
const accountFund = await db.query.accountFunds.findFirst({
  where: eq(accountFunds.accountId, accountId),
});
```

> **注意**：新增数据库操作时，**优先**在 Repository 中封装，而不是在 Service 中直接写 `db` 查询。

---

## 10. 与 Controller 层的交互

Service 只接受和返回**业务对象/DTO**，不接触 HTTP 概念：

```typescript
// ✅ Service 接口：业务参数和业务返回值
async createProvider(accountId: number, request: CreateModelProviderRequest): Promise<ModelProvider>

// ❌ Service 不应该：接收 Request 对象或返回 Response 对象
async createProvider(req: Request): Promise<Response>
```

---

## 11. 单元测试规范

### 11.1 Mock 策略

- **Mock Repository 单例**，不 mock 底层 `db`
- **Mock 外部 Service 依赖**（如 `authService`、`positionService`）
- 在测试中 `new XxxService()` 创建实例（不使用导出的单例）

```typescript
// ✅ 正确：vi.mock 在顶层声明，import 在后
vi.mock('@server/repository/settingRepository', () => ({
  settingRepository: {
    findByUserId: vi.fn(),
    upsert: vi.fn(),
    // ...列出所有被使用的方法
  },
}));

vi.mock('@server/service/authService', () => ({
  default: { getCurrentUserId: vi.fn() },
}));

import { settingRepository } from '../../repository/settingRepository';
import authService from '../authService';
```

### 11.2 测试结构

```typescript
describe('SettingService', () => {
  let service: SettingService;

  beforeEach(() => {
    service = new SettingService();  // 每个测试创建新实例
    vi.clearAllMocks();              // 清除所有 mock 状态
  });

  describe('setSetting', () => {
    it('应该成功创建新设置', async () => {
      // Arrange
      vi.mocked(settingRepository.upsert).mockResolvedValue(mockSetting);

      // Act
      const result = await service.setSetting('1', 'key', 'value');

      // Assert
      expect(result.value).toBe('value');
      expect(settingRepository.upsert).toHaveBeenCalledWith(1, 'key', 'value');
    });

    it('数据库错误时应该抛出错误', async () => {
      vi.mocked(settingRepository.upsert).mockRejectedValue(new Error('DB error'));
      await expect(service.setSetting('1', 'key', 'value')).rejects.toThrow();
    });
  });
});
```

### 11.3 测试覆盖要求

每个 Service 方法应覆盖：
- ✅ 正常路径（happy path）
- ✅ 资源不存在时的行为
- ✅ 权限校验失败时的行为
- ✅ 底层错误时的行为（抛出 or 返回默认值）

---

## 12. 性能考虑

### 12.1 避免 N+1 查询

```typescript
// ❌ N+1：循环内查询
const providers = await modelProviderRepository.findByUserId(userId);
for (const provider of providers) {
  const models = await providerModelRepository.findByProviderId(provider.id); // N 次查询
}

// ✅ 批量查询或使用 Combined Repository
const allData = await modelProviderCombinedRepository.findAllAvailableModelsByUserId(userId);
```

### 12.2 分页查询

对于可能返回大量数据的查询，必须支持分页：

```typescript
async getTransactionHistory(accountId: string, limit = 50, offset = 0) {
  const totalCount = await transactionRepository.countByAccountId(parseInt(accountId));
  const records = await transactionRepository.findByAccountId(parseInt(accountId), limit, offset);
  return { transactions: records, totalCount };
}
```

### 12.3 数据缓存

对于高频且相对静态的数据（如内置配置），可在 Service 内使用内存缓存：

```typescript
export class AgentService {
  private builtinAgentsCache: AgentTypeResponse[] | null = null;

  async listBuiltinAgents(): Promise<AgentTypeResponse[]> {
    if (this.builtinAgentsCache) return this.builtinAgentsCache;
    const results = await agentRepository.findBuiltinAgents();
    this.builtinAgentsCache = results.map(toAgentResponse);
    return this.builtinAgentsCache;
  }
}
```

---

## 13. 注释规范

```typescript
/**
 * Model Provider Service
 *
 * 处理 Model Provider 和关联 Model 的业务逻辑
 */
export class ModelProviderService {

  /**
   * 创建新的模型服务商
   * @param accountId 账户 ID
   * @param request 服务商创建数据
   * @returns 创建的服务商
   * @throws 当 slug 已存在时抛出 Error
   */
  async createProvider(accountId: number, request: CreateModelProviderRequest): Promise<ModelProvider> {
    // ...
  }
}
```

---

## 14. 禁止事项

- ❌ Service 中直接操作 `req`/`res` HTTP 对象
- ❌ Service 构造函数中执行副作用（数据库查询、网络请求）
- ❌ 同一个操作中混用 Repository 方法和直接 `db` 查询（保持一致性）
- ❌ 在循环中逐条查询可批量处理的数据（N+1 问题）
- ❌ 日志中打印密码、API Key 等敏感字段
- ❌ Service 间循环依赖（A import B，B import A）
