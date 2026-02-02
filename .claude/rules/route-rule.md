# Next.js 路由规则 (Route Rules)

## 项目路由结构

本项目使用 Next.js 15 的 App Router 模式，所有页面位于 `src/app/(pages)`
目录下。

当前路由结构：

- `/dashboard` - 账户分析仪表板
- `/market` - 市场现状展示
- `/stock` - 股票分析功能

## 路由命名规范

1. **目录命名**
   - 使用小写字母和连字符分隔单词 (kebab-case)
   - 语义化命名，清晰表达页面功能
   - 避免使用复数形式（除非是列表页）

2. **路由层级**
   - 主要功能模块作为一级路由
   - 子功能或详情页作为二级路由
   - 动态路由使用 `[param]` 格式

## 页面文件规范

1. **入口文件**
   - 每个路由目录必须包含 `page.tsx` 文件
   - 页面组件默认导出

2. **路由参数**
   - 动态路由参数使用 `[id]` 形式
   - 可选路由参数使用 `[[...slug]]` 形式

## API 路由规范

1. **控制器继承模式**
   - 所有 API 路由必须采用类继承 BaseController 的形式
   - 控制器类命名遵循 `[Resource]Controller` 模式
   - 示例：

   ```typescript
   class StockController extends BaseController {
     // 实现方法
   }
   ```

2. **方法实现规范**
   - 使用静态方法实现 HTTP 动词（GET, POST, PUT, DELETE 等）
   - 方法名使用大写 HTTP 动词命名
   - 必须使用 WithRequestContext 装饰器包装方法
   - 示例：

   ```typescript
   class StockController extends BaseController {
     @WithRequestContext()
     static async POST(request: Request) {
       // 实现逻辑
     }
   }
   ```

3. **导出规范**
   - 必须显式导出对应的 HTTP 方法
   - 示例：

   ```typescript
   export const POST = StockController.POST;
   ```

4. **BaseController 提供的方法**
   - `validateParams` - 验证查询参数
   - `validateBody` - 验证请求体
   - `success` - 返回成功响应
   - `error` - 返回错误响应
   - `responseValidateError` - 返回验证错误响应

## 导航组件规范

1. **导航数据结构**

   ```
   {
     title: string,      // 导航项显示名称
     url: string,        // 对应路由路径
     icon: IconComponent // 图标组件
   }
   ```

2. **活动状态管理**
   - 使用 `usePathname()` Hook 获取当前路径
   - 通过精确匹配设置活动状态
   - 活动状态样式通过 `isActive` 属性控制

## 新增路由步骤

1. 在 `src/app/(pages)` 下创建新目录（用于页面路由）
2. 在新目录中创建 `page.tsx` 文件
3. 如需 API 路由，在 `src/app/api` 下创建对应目录
4. 在 API 目录中创建 `route.ts` 文件并继承 BaseController
5. 更新 `src/app/components/app-sidebar.tsx` 中的导航数据
6. 添加相应的图标组件
7. 确保新页面遵循项目 UI 组件规范

## 路由保护

1. **公共路由**
   - 无需登录即可访问的页面
   - 包括：首页、登录页等

2. **私有路由**
   - 需要登录验证的页面
   - 通过中间件进行权限检查

## 示例

### 创建 API 路由控制器

```typescript
// src/app/api/example/route.ts
import { WithRequestContext } from '@/server/base/decorators';
import { BaseController } from '../base/baseController';

class ExampleController extends BaseController {
  @WithRequestContext()
  static async GET(request: Request) {
    try {
      // 处理逻辑
      const data = { message: 'Success' };
      return this.success(data);
    } catch (error) {
      return this.error('获取数据失败', 'get_data_error');
    }
  }

  @WithRequestContext()
  static async POST(request: Request) {
    try {
      const body = await this.validateBody(request, YourSchema);
      // 处理逻辑
      return this.success({ id: 1, ...body });
    } catch (error) {
      return this.error('创建数据失败', 'create_data_error');
    }
  }
}

export const GET = ExampleController.GET;
export const POST = ExampleController.POST;
```

### 创建新页面

```typescript
// src/app/(pages)/new-feature/page.tsx
export default function NewFeaturePage() {
  return (
    <div>
      <h1>New Feature</h1>
    </div>
  );
}
```

### 添加导航项

```typescript
// src/app/components/app-sidebar.tsx
const data = {
  navMain: [
    // ... existing items
    {
      title: '新功能',
      url: '/new-feature',
      icon: IconNewFeature,
    },
  ],
};
```

## 注意事项

1. 所有路由变更后需要更新侧边栏导航配置
2. 确保路由路径与页面功能一致
3. 遵循现有的 UI 设计模式和组件库规范
4. 添加适当的错误处理和加载状态
5. 所有 API 路由必须继承 BaseController 并使用 WithRequestContext 装饰器
