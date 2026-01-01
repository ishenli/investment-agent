// import { NextRequest, NextFetchEvent } from 'next/server';
// import { AuthService } from '@server/service/authService';

// /**
//  * 认证中间件
//  * 验证请求中的JWT token并设置用户信息到请求上下文中
//  */
// export async function authMiddleware(request: NextRequest, event: NextFetchEvent) {
//   // 从Authorization头获取token
//   const authHeader = request.headers.get('Authorization');

//   if (authHeader && authHeader.startsWith('Bearer ')) {
//     const token = authHeader.substring(7); // 移除 "Bearer " 前缀

//     // 验证token并获取用户ID
//     const userId = await AuthService.getCurrentUserId(request);

//     if (userId) {
//       // 在实际应用中，这里应该将用户信息添加到请求上下文中
//       // 例如：request.userId = userId;
//       return null; // 继续处理请求
//     }
//   }

//   // 如果需要认证但未提供有效token，返回401错误
//   // 注意：在实际应用中，可能只需要对某些路由强制认证
//   return null; // 继续处理请求（开发环境下允许未认证）
// }

// /**
//  * 需要认证的路由包装器
//  * @param handler 原始处理函数
//  * @returns 包装后的处理函数
//  */
// export function withAuth<T extends Function>(handler: T): T {
//   return (async (...args: unknown[]) => {
//     // 在实际应用中，这里应该检查认证状态
//     // 如果未认证，返回401错误
//     // const request = args[0];
//     // const userId = await AuthService.getCurrentUserId(request);
//     // if (!userId) {
//     //   return new Response(
//     //     JSON.stringify({ error: 'Unauthorized' }),
//     //     { status: 401, headers: { 'Content-Type': 'application/json' } }
//     //   );
//     // }

//     // 调用原始处理函数
//     return handler(...args);
//   }) as T;
// }
