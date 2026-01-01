import { BaseController } from '@renderer/api/base/baseController';
import { NoteController } from '@server/controller/note';

class NoteDetailHttpController extends BaseController {
  static async GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const noteController = new NoteController();
    const p = await params;
    return Response.json(await noteController.getNoteById({ id: p.id }));
  }
  
  static async PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const noteController = new NoteController();
    const body = await super.getBody(request);
    // 将参数ID添加到body中
    const p = await params;
    const updateData = { ...body, id: p.id };
    return Response.json(await noteController.updateNote(updateData));
  }
  
  static async DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const noteController = new NoteController();
    const p = await params;
    return Response.json(await noteController.deleteNote({ id: p.id }));
  }
}

// 导出对应的 HTTP 方法
export const GET = NoteDetailHttpController.GET;
export const PUT = NoteDetailHttpController.PUT;
export const DELETE = NoteDetailHttpController.DELETE;