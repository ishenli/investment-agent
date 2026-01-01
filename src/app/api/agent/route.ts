import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '../base/baseController';
import { AgentBizController } from '@/server/controller/agent';

class AgentHttpController extends BaseController {
  static controller = new AgentBizController();
  
  @WithRequestContext()
  static async POST(request: Request) {
    const body = await super.getBody(request);
    return Response.json(await AgentHttpController.controller.createAgent(body));
  }

  @WithRequestContext()
  static async GET(request: Request) {
    const json = await super.getQuery(request);
    return Response.json(await AgentHttpController.controller.getAgent(json));
  }

  @WithRequestContext()
  static async PUT(request: Request) {
    const body = await super.getBody(request);
    const json = await super.getQuery(request);
    // 合并查询参数和请求体
    const params = { ...json, ...body };
    return Response.json(await AgentHttpController.controller.updateAgent(params));
  }

  @WithRequestContext()
  static async DELETE(request: Request) {
    const json = await super.getQuery(request);
    return Response.json(await AgentHttpController.controller.deleteAgent(json));
  }
}

// Export the main agent endpoints
export const POST = AgentHttpController.POST;
export const GET = AgentHttpController.GET;
export const PUT = AgentHttpController.PUT;
export const DELETE = AgentHttpController.DELETE;
