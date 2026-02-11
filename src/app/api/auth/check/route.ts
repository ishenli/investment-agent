import { WithRequestContextStatic } from '@server/base/decorators';
import { BaseController } from '../../base/baseController';
import { AuthController } from '@/server/controller/authController';

class AuthHttpController extends BaseController {
  static controller = new AuthController();

  @WithRequestContextStatic()
  static async GET(request: Request) {
    try {
      // 从 Authorization header 获取 token，或者从请求体获取
      const authHeader = request.headers.get('Authorization');
      let token: string | undefined;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        // 尝试从查询参数获取
        const url = new URL(request.url);
        token = url.searchParams.get('token') || undefined;
      }

      return Response.json(await AuthHttpController.controller.checkAuth(token));
    } catch (error) {
      return Response.json({
        success: true,
        data: {
          isAuthenticated: false,
          user: null,
        },
      });
    }
  }
}

export const GET = AuthHttpController.GET;