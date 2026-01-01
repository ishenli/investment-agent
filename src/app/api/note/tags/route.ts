import { BaseController } from '@renderer/api/base/baseController';
import { NoteController } from '@server/controller/note';

class NoteTagsController extends BaseController {
  static async GET(request: Request) {
    const noteController = new NoteController();
    return Response.json(await noteController.getUserTags());
  }
}

// 导出对应的 HTTP 方法
export const GET = NoteTagsController.GET;