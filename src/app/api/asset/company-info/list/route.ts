import { WithRequestContext } from '@server/base/decorators';
import { BaseController } from '@renderer/api/base/baseController';
import { CompanyBizController } from '@/server/controller/company';

class CompanyInfoListHttpController extends BaseController {
  static controller = new CompanyBizController();
  
  @WithRequestContext()
  static async GET(request: Request) {
    const json = await super.getQuery(request);
    return Response.json(await CompanyInfoListHttpController.controller.getCompanyInfoList(json));
  }
}

export const GET = CompanyInfoListHttpController.GET;
