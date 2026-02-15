# model-provider-management Spec Delta

## ADDED Requirements

### Requirement: Model Provider CRUD API
系统 MUST 提供完整的模型服务商 CRUD API 端点，支持创建、读取、更新、删除操作。

#### Scenario: 获取所有服务商列表
- **GIVEN** 用户已登录并有有效账户
- **WHEN** 发送 GET 请求到 `/api/model-providers`
- **THEN** 系统 MUST 验证用户身份并获取 accountId
- **THEN** 系统 MUST 返回当前账户的所有服务商
- **THEN** 响应格式 MUST 为 `{ success: true, data: ModelProvider[] }`
- **THEN** 每个 ModelProvider 对象 MUST 包含：id, slug, name, baseUrl, isActive, displayOrder, description

#### Scenario: 创建新服务商
- **GIVEN** 用户已登录并有有效账户
- **WHEN** 发送 POST 请求到 `/api/model-providers`，请求体包含有效的服务商信息
- **THEN** 系统 MUST 验证用户身份
- **THEN** 系统 MUST 验证请求体（name, slug, baseUrl 必填）
- **THEN** 系统 MUST 检查 slug 在账户内唯一性
- **THEN** 系统 MUST 验证 baseUrl 格式为有效 URL
- **THEN** 系统 MUST 创建服务商并返回创建的对象
- **THEN** slug 冲突时 MUST 返回错误（code: 'slug_already_exists'）

#### Scenario: 更新服务商
- **GIVEN** 用户已登录并有有效账户
- **GIVEN** 存在 id 为 X 的服务商
- **WHEN** 发送 PUT 请求到 `/api/model-providers`，请求体包含 id 和更新字段
- **THEN** 系统 MUST 验证用户身份
- **THEN** 系统 MUST 验证请求体
- **THEN** 系统 MUST 检查用户是否有权修改该服务商
- **THEN** 系统 MUST 更新服务商
- **THEN** 更新 slug 时 MUST 检查唯一性（排除自身）
- **THEN** 无权限时 MUST 返回错误（code: 'forbidden'）

#### Scenario: 删除服务商
- **GIVEN** 用户已登录并有有效账户
- **GIVEN** 存在 id 为 X 的服务商
- **WHEN** 发送 DELETE 请求到 `/api/model-providers`，请求体包含 id
- **THEN** 系统 MUST 验证用户身份
- **THEN** 系统 MUST 检查用户是否有权删除该服务商
- **THEN** 系统 MUST 删除服务商及其关联的所有模型（级联删除）
- **THEN** 无权限时 MUST 返回错误（code: 'forbidden'）

---

### Requirement: Provider Model CRUD API
系统 MUST 提供服务商模型的 CRUD API 端点，支持为每个服务商管理模型列表。

#### Scenario: 获取服务商的所有模型
- **GIVEN** 用户已登录并有有效账户
- **GIVEN** 存在 id 为 X 的服务商
- **WHEN** 发送 GET 请求到 `/api/model-providers/X/models`
- **THEN** 系统 MUST 验证用户身份
- **THEN** 系统 MUST 检查服务商属于当前账户
- **THEN** 系统 MUST 返回该服务商的所有模型
- **THEN** 响应格式 MUST 为 `{ success: true, data: ProviderModel[] }`

#### Scenario: 为服务商添加模型
- **GIVEN** 用户已登录并有有效账户
- **GIVEN** 存在 id 为 X 的服务商
- **WHEN** 发送 POST 请求到 `/api/model-providers/X/models`，请求体包含模型信息
- **THEN** 系统 MUST 验证用户身份和服务商所有权
- **THEN** 系统 MUST 验证 slug, name 必填
- **THEN** 系统 MUST 检查 slug 在服务商内唯一性
- **THEN** 系统 MUST 创建模型关联到指定服务商
- **THEN** 服务商不存在时 MUST 返回错误（code: 'provider_not_found'）

#### Scenario: 更新服务商模型
- **GIVEN** 用户已登录并有有效账户
- **GIVEN** 存在 id 为 Y 的模型
- **WHEN** 发送 PUT 请求到 `/api/model-providers/id/models`，请求体包含 id 和更新字段
- **THEN** 系统 MUST 验证用户身份
- **THEN** 系统 MUST 检查模型所属服务商属于当前账户
- **THEN** 系统 MUST 更新模型
- **THEN** 无权限时 MUST 返回错误（code: 'forbidden'）

#### Scenario: 删除服务商模型
- **GIVEN** 用户已登录并有有效账户
- **GIVEN** 存在 id 为 Y 的模型
- **WHEN** 发送 DELETE 请求到 `/api/model-providers/id/models`，请求体包含 id
- **THEN** 系统 MUST 验证用户身份
- **THEN** 系统 MUST 检查模型所属服务商属于当前账户
- **THEN** 系统 MUST 删除模型
- **THEN** 模型不存在时 MUST 返回错误（code: 'model_not_found'）

---

### Requirement: Model Provider State Management
系统 MUST 使用 Zustand 实现服务商管理的客户端状态管理。

#### Scenario: 服务商列表状态管理
- **GIVEN** 页面加载
- **WHEN** 调用 `fetchProviders()` 方法
- **THEN** 系统 MUST 设置 loading 状态为 true
- **THEN** 系统 MUST 从 API 获取服务商列表
- **THEN** 系统 MUST 更新 providers 状态
- **THEN** 系统 MUST 清除 loading 状态
- **THEN** 请求失败时 MUST 设置 error 状态

#### Scenario: 当前选中的服务商管理
- **WHEN** 调用 `setActiveProvider(id)` 方法
- **THEN** 系统 MUST 更新 activeProviderId 状态
- **THEN** 如果传入 null，系统 MUST 清除当前选择

#### Scenario: 创建服务商时的状态更新
- **GIVEN** 用户填写服务商表单
- **WHEN** 提交表单调用 `createProvider()`
- **THEN** 系统 MUST 设置 saving 状态为 true
- **THEN** 系统 MUST 调用 API 创建服务商
- **THEN** 成功后系统 MUST 将新服务商添加到 providers 列表
- **THEN** 系统 MUST 设置新服务商为 active
- **THEN** 系统 MUST 清除 saving 状态和 form 状态

---

### Requirement: Model Provider UI
系统 MUST 提供分栏界面的服务商管理页面，左侧为服务商列表，右侧为配置面板。

#### Scenario: 页面布局
- **GIVEN** 用户访问 `/model-providers` 页面
- **WHEN** 页面渲染
- **THEN** 页面 MUST 显示左右分栏布局
- **THEN** 左侧 MUST 显示服务商列表
- **THEN** 右侧 MUST 显示选中服务商的配置面板
- **THEN** 未选中时右侧 MUST 显示空状态提示

#### Scenario: 服务商列表项显示
- **WHEN** 渲染服务商列表项
- **THEN** MUST 显示服务商名称
- **THEN** MUST 显示服务商 slug
- **THEN** MUST 显示激活状态徽章（激活/未激活）
- **THEN** 选中的服务商 MUST 有视觉高亮
- **THEN** 点击 MUST 触发选中该服务商

#### Scenario: 服务商配置面板 - 查看模式
- **GIVEN** 选中一个服务商
- **WHEN** 右侧面板显示查看模式
- **THEN** MUST 显示服务商名称（只读）
- **THEN** MUST 显示服务商 slug（只读）
- **THEN** MUST 显示 Base URL（只读，密钥脱敏显示）
- **THEN** MUST 显示描述（只读）
- **THEN** MUST 显示关联的模型列表
- **THEN** MUST 显示"编辑"和"删除"按钮
- **THEN** MUST 显示状态切换开关

#### Scenario: 服务商配置面板 - 编辑模式
- **GIVEN** 选中一个服务商
- **WHEN** 用户点击"编辑"按钮
- **THEN** 面板 MUST 切换到编辑模式
- **THEN** 名称和 slug MUST 可编辑（slug 仅限第一次编辑）
- **THEN** Base URL MUST 可编辑
- **THEN** API Key MUST 可编辑（password 类型）
- **THEN** 描述 MUST 可编辑
- **THEN** MUST 显示"保存"和"取消"按钮

#### Scenario: 服务商配置面板 - 创建模式
- **GIVEN** 未选中服务商
- **WHEN** 用户点击"添加服务商"按钮
- **THEN** 右侧面板 MUST 显示创建表单
- **THEN** 所有字段 MUST 为空
- **THEN** 名称和 slug MUST 必填
- **THEN** Base URL MUST 必填
- **THEN** MUST 显示"创建"和"取消"按钮

#### Scenario: 模型列表管理
- **GIVEN** 选中一个服务商
- **WHEN** 配置面板显示
- **THEN** MUST 显示该服务商关联的模型列表
- **THEN** 每个 MUST 显示模型名称和 slug
- **THEN** MUST 显示功能能力徽章（视觉、函数调用）
- **THEN** MUST 显示上下文窗口大小
- **THEN** MUST 显示激活状态
- **THEN** MUST 提供"添加模型"按钮

---

### Requirement: Model Provider Form Validation
系统 MUST 对服务商和模型表单进行输入验证。

#### Scenario: 服务商名称验证
- **WHEN** 用户输入服务商名称
- **THEN** 长度 MUST 在 1-100 字符之间
- **THEN** 不得包含特殊字符
- **THEN** 不能为空

#### Scenario: Slug 格式验证
- **WHEN** 用户输入 slug
- **THEN** 长度 MUST 在 1-50 字符之间
- **THEN** 必须 MUST 匹配正则 `/^[a-z0-9-]+$/`
- **THEN** 不得包含大写字母或空格
- **THEN** 同一账户内必须唯一

#### Scenario: Base URL 验证
- **WHEN** 用户输入 Base URL
- **THEN** MUST 为有效的 URL 格式
- **THEN** 长度不得超过 500 字符
- **THEN** 应使用 https 协议

#### Scenario: API Key 输入处理
- **WHEN** 编辑现有服务商
- **THEN** API Key MUST 显示为脱敏形式（如 `••••••••`）
- **WHEN** 用户留空 API Key 字段
- **THEN** 系统 MUST 保持原有密钥不变

#### Scenario: 模型 Slug 验证
- **WHEN** 用户输入模型 slug
- **THEN** 长度 MUST 在 1-50 字符之间
- **THEN** 必须 MUST 匹配正则 `/^[a-z0-9.-]+$/`
- **THEN** 同一服务商内必须唯一

#### Scenario: 上下文窗口验证
- **WHEN** 用户输入上下文窗口大小
- **THEN** MUST 为正整数
- **THEN** 值范围 MUST 在 1-1,000,000 之间
- **THEN** 可以为空（表示未知）

---

### Requirement: Navigation Integration
系统 MUST 将服务商管理页面添加到应用导航菜单。

#### Scenario: 导航菜单项
- **WHEN** 应用渲染导航侧边栏
- **THEN** MUST 显示"模型服务商"菜单项
- **THEN** 链接 MUST 指向 `/model-providers`
- **THEN** SHOULD 配置合适的图标
- **THEN** 当前在服务商页面时 MUST 显示激活状态

---

## MODIFIED Requirements

None.

---

## RENAMED Requirements

None.

---

## REMOVED Requirements

None.

---

## Implementation Notes

### API Request/Response Types

```typescript
// 服务商类型
interface ModelProvider {
  id: number;
  accountId: number;
  slug: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  isActive: boolean;
  displayOrder: number;
  description?: string;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
}

// 模型类型
interface ProviderModel {
  id: number;
  providerId: number;
  slug: string;
  name: string;
  contextWindow?: number;
  supportsVision: boolean;
  supportsFunctionCalling: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: number;
  updatedAt: number;
}

// 创建请求
interface CreateModelProviderRequest {
  name: string;
  slug: string;
  baseUrl: string;
  apiKey?: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
}

// API 响应
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: any;
  };
}
```

### 状态管理 Store Structure

```
src/app/store/modelProvider/
├── initialState.ts          # Combined state
├── store.ts                 # Store creation
└── slices/
    ├── providers/           # Providers list slice
    ├── models/              # Models slice
    └── form/                # Form state slice
```

### UI 组件结构

```
src/app/(pages)/model-providers/
└── page.tsx                 # Main page

src/app/components/model-provider/
├── ProviderListPanel.tsx    # Left panel
├── ProviderConfigPanel.tsx  # Right panel
├── ProviderForm.tsx         # Form component
├── ModelsSection.tsx        # Models list
└── ModelListItem.tsx        # Model item
```

### Zod 验证 Schema

```typescript
import { z } from 'zod';

export const ModelProviderSchema = z.object({
  name: z.string()
    .min(1, '名称不能为空')
    .max(100, '名称不能超过100个字符')
    .regex(/^[\u4e00-\u9fa5a-zA-Z0-9\s\-]+$/, '名称包含无效字符'),
  slug: z.string()
    .min(1, 'Slug不能为空')
    .max(50, 'Slug不能超过50个字符')
    .regex(/^[a-z0-9-]+$/, 'Slug只能包含小写字母、数字和连字符'),
  baseUrl: z.string()
    .url('无效的URL格式')
    .max(500, 'URL不能超过500个字符')
    .refine(val => val.startsWith('https://'), 'URL必须使用https协议'),
  apiKey: z.string().optional(),
  description: z.string()
    .max(500, '描述不能超过500个字符')
    .optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const ProviderModelSchema = z.object({
  slug: z.string()
    .min(1, 'Model Slug不能为空')
    .max(50, 'Model Slug不能超过50个字符')
    .regex(/^[a-z0-9.-]+$/, 'Slug只能包含小写字母、数字、点和连字符'),
  name: z.string()
    .min(1, '模型名称不能为空')
    .max(100, '模型名称不能超过100个字符'),
  contextWindow: z.number()
    .int()
    .min(1)
    .max(1000000)
    .optional(),
  supportsVision: z.boolean().optional(),
  supportsFunctionCalling: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});
```