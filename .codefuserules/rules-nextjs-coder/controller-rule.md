# Controller 规则

## 基本要求
- 控制器必须继承 BaseController 类, API Controller 和 Biz Controller 的父类不同
- Biz Controller 方法必须使用 @WithRequestContext() 装饰器
- Biz Controller 使用 this.success() 和 this.error() 方法返回标准化响应格式
- Biz Controller 使用 zod 进行请求体和参数的类型验证
  
## 职责分离规范
- 控制器只负责业务逻辑处理，不处理 HTTP 特定细节
- API 路由文件只负责：
  - HTTP 请求接收和参数解析
  - 调用对应控制器方法
  - HTTP 响应返回
- 控制器负责：
  - 用户身份验证和权限检查
  - 参数验证和业务逻辑处理
  - 调用服务层进行数据操作
  - 返回标准化的业务结果

## 方法实现规范
- 控制器方法应具有清晰的输入参数类型定义
- 控制器方法应具有明确的返回值类型
- 必须包含完整的错误处理逻辑
- 使用 AuthService.getCurrentUserId() 获取当前用户 ID
- 在执行业务逻辑前必须验证用户身份

## 响应格式规范
- 成功响应使用 this.success(data) 方法
- 错误响应使用 this.error(message, code) 方法
- 错误码应具有业务含义且唯一
- 返回的数据结构应保持一致性

## 示例代码结构
### API Controller (route.ts )
- 用于处理 Nextjs 的 APP Router 中的 HTTP 请求，涉及 HTTP 特定细节
- 文件地址在 `app/api` 目录下，使用的是 static 方法，如果方法使用装饰器，请使用`WithRequestContextStatic` 
```typescript
class NoteHttpController extends BaseController {
  static async GET(request: Request) {
    const noteController = new NoteController();
    const json = await super.getQuery(request);
    return Response.json(await noteController.getAllNotes(json));
  }

  static async POST(request: Request) {
    const noteController = new NoteController();
    const body = await super.getBody(request);
    
    // 如果有id参数则为更新操作，否则为创建操作
    if (body.id) {
      return Response.json(await noteController.updateNote(body));
    } else {
      return Response.json(await noteController.createNote(body));
    }
  }
  
  static async PUT(request: Request) {
    const noteController = new NoteController();
    const body = await super.getBody(request);
    return Response.json(await noteController.updateNote(body));
  }
  
  static async DELETE(request: Request) {
    const noteController = new NoteController();
    const body = await super.getBody(request);
    return Response.json(await noteController.deleteNote(body));
  }
}

// 导出对应的 HTTP 方法
export const GET = NoteHttpController.GET;
export const POST = NoteHttpController.POST;
export const PUT = NoteHttpController.PUT;
export const DELETE = NoteHttpController.DELETE;
```

### Biz Controller
- 用于处理业务逻辑，不涉及 HTTP 特定细节
- 文件地址在 `server/controller` 目录下，文件名为 `[biz].ts`
- 继承的是 BaseBizController 类

```typescript
export class BizController extends BaseBizController {
  @WithRequestContext()
  async exampleMethod(param: { id: string }) {
    try {
      // 1. 获取当前用户ID
      const userId = await AuthService.getCurrentUserId();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 2. 参数验证
      if (!param.id) {
        return this.error('参数不能为空', 'validation_error');
      }

      // 3. 业务逻辑处理
      const result = await exampleService.doSomething(param.id, userId);

      // 4. 返回成功响应
      return this.success(result);
    } catch (error) {
      // 5. 错误处理
      return this.error('业务处理失败', 'business_error');
    }
  }
}
```