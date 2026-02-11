import { WithRequestContextStatic } from '@server/base/decorators';
import { BaseController } from '../../base/baseController';
import { AuthController } from '@/server/controller/authController';

class AuthHttpController extends BaseController {
  static controller = new AuthController();

  @WithRequestContextStatic()
  static async GET() {
    try {
      return Response.json(await AuthHttpController.controller.hasUsers());
    } catch (error) {
      return Response.json({ success: true, data: { hasUsers: false } });
    }
  }
}

export const GET = AuthHttpController.GET;