import { WithRequestContextStatic } from '@server/base/decorators';
import { BaseController } from '../../base/baseController';
import { AuthController } from '@/server/controller/authController';

class AuthHttpController extends BaseController {
  static controller = new AuthController();

  @WithRequestContextStatic()
  static async POST(request: Request) {
    try {
      const body = await super.getBody(request);
      return Response.json(await AuthHttpController.controller.login(body.username, body.password));
    } catch (error) {
      return Response.json(
        { success: false, message: '登录失败', code: 'login_error' },
        { status: 401 },
      );
    }
  }
}

export const POST = AuthHttpController.POST;