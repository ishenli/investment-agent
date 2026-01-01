# 用户账户管理功能文档

## 功能概述

用户账户管理功能允许用户创建和管理其基础账户信息。该功能包括用户注册、登录、个人信息管理等操作。金融资产相关的功能已移至[资产管理模块](../002-asset-management/asset-management-feature.md)。

## 功能详情

### 用户场景

1. 新用户访问投资代理平台，需要创建基础账户
2. 已有用户希望更新个人信息
3. 用户需要修改账户设置或偏好

### 核心流程

1. 用户填写账户信息（用户名、邮箱、密码）
2. 系统验证输入数据的有效性
3. 创建用户账户
4. 返回创建成功的账户信息

**说明：**
金融资产相关的操作（如创建交易账户、设置交易参数、资金管理等）已移至[资产管理模块](../002-asset-management/asset-management-feature.md)。

## API 接口规范

### 创建用户账户接口

**Endpoint**: `POST /api/account`

**请求体 (Request Body)**:

```json
{
  "username": "string", // 用户名 (必填)
  "email": "string", // 邮箱地址 (必填)
  "password": "string" // 密码 (必填)
}
```

**成功响应 (Status 201)**:

```json
{
  "id": "string",
  "username": "string",
  "email": "string",
  "createdAt": "date-time",
  "updatedAt": "date-time",
  "isActive": "boolean"
}
```

**说明：**
金融资产相关的API接口已移至[资产管理模块](../002-asset-management/contracts/asset-api.yaml)。

### 请求参数说明

| 参数名   | 类型   | 必填 | 描述                   |
| -------- | ------ | ---- | ---------------------- |
| username | string | 是   | 用户名，长度3-30个字符 |
| email    | string | 是   | 有效的邮箱地址         |
| password | string | 是   | 密码，至少8个字符      |

### 错误响应

**400 Bad Request**: 请求数据无效

```json
{
  "success": false,
  "code": "INVALID_REQUEST",
  "message": "请求参数验证失败"
}
```

**409 Conflict**: 账户已存在

```json
{
  "success": false,
  "code": "ACCOUNT_EXISTS",
  "message": "用户名或邮箱已被使用"
}
```

**500 Internal Server Error**: 服务器内部错误

```json
{
  "success": false,
  "code": "INTERNAL_ERROR",
  "message": "服务器内部错误"
}
```

## 使用示例

### 示例1: 创建用户账户

**请求**:

```bash
curl -X POST /api/account \
  -H "Content-Type: application/json" \
  -d '{
    "username": "trader123",
    "email": "trader123@example.com",
    "password": "securePassword123"
  }'
```

**响应**:

```json
{
  "id": "user_1234567890",
  "username": "trader123",
  "email": "trader123@example.com",
  "createdAt": "2025-10-14T10:00:00Z",
  "updatedAt": "2025-10-14T10:00:00Z",
  "isActive": true
}
```

**说明：**
金融资产相关的操作示例已移至[资产管理模块](../002-asset-management/asset-management-feature.md)。

## 数据模型影响

用户账户管理功能会创建以下实体：

1. **User Account**: 存储用户基本信息

详细数据模型定义请参考 [data-model.md](./data-model.md)

**说明：**
金融资产相关的数据实体已移至[资产管理模块](../002-asset-management/data-model.md)。

## 验证规则

### 输入验证

1. 用户名：
   - 长度3-30个字符
   - 仅包含字母、数字、下划线和连字符
   - 必须唯一

2. 邮箱：
   - 符合标准邮箱格式
   - 必须唯一

3. 密码：
   - 至少8个字符
   - 包含字母和数字

### 业务验证

1. 用户名和邮箱在系统中必须唯一
2. 创建时间不能晚于当前时间

## 安全考虑

1. 密码在存储前必须进行哈希处理
2. 敏感信息（如密码）不能在响应中返回
3. 对请求频率进行限制以防止滥用
4. 所有通信应通过HTTPS加密传输

## 性能要求

1. 账户创建响应时间应小于1秒
2. 支持并发创建多个账户
3. 数据库写入操作应具有原子性

## 测试用例

### 正面测试

1. 成功创建用户账户
2. 使用最小有效参数创建账户
3. 使用最大有效参数创建账户

**说明：**
金融资产相关的测试用例已移至[资产管理模块](../002-asset-management/asset-management-feature.md)。

### 负面测试

1. 用户名已存在
2. 邮箱已存在
3. 密码长度不足
4. 邮箱格式无效

## 相关文档

- [API Contract](./contracts/account-api.yaml)
- [Data Model](./data-model.md)
- [Implementation Plan](./plan.md)
