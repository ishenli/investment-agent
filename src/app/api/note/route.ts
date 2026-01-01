import { BaseController } from '../base/baseController';
import { NoteController } from '@server/controller/note';

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