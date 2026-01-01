import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import { CompanyBizController } from '@/server/controller/company';

class CompanyInfoHttpController extends BaseController {
  static controller = new CompanyBizController();
  
  @WithRequestContext()
  static async POST(request: Request) {
    const body = await super.getBody(request);
    return Response.json(await CompanyInfoHttpController.controller.saveCompanyInfo(body));
  }

  @WithRequestContext()
  static async DELETE(request: Request) {
    const json = await super.getQuery(request);
    return Response.json(await CompanyInfoHttpController.controller.deleteCompanyInfo(json));
  }
}

export const POST = CompanyInfoHttpController.POST;
export const DELETE = CompanyInfoHttpController.DELETE;
