import logger from '@server/base/logger';
import { Type, type TObject } from '@sinclair/typebox';

import type { HermesToolConfig } from './types';
import { unwrapControllerResult } from './controllerUtil';

// ============== Core Logic ==============

async function getReportController() {
  const { ReportController } = await import('@server/controller/report');
  return new ReportController();
}

async function getReportDetailController() {
  const { ReportDetailController } = await import('@server/controller/reportDetail');
  return new ReportDetailController();
}

// ============== Hermes Adapters ==============

const reportListSchema: TObject = Type.Object({
  account_id: Type.Optional(Type.String({ description: '账户 ID（可选）' })),
  type: Type.Optional(Type.String({ description: '报告类型: weekly | monthly | emergency' })),
  limit: Type.Optional(Type.String({ description: '返回数量，默认 20' })),
  offset: Type.Optional(Type.String({ description: '偏移量，默认 0' })),
});

export const reportListHermesConfig: HermesToolConfig = {
  name: 'report_list',
  description: '获取报告列表（支持按类型过滤和分页）',
  schema: reportListSchema,
  handler: async (_id, args) => {
    try {
      const controller = await getReportController();
      const result = await controller.getReports({
        accountId: args.account_id ? String(args.account_id) : undefined,
        type: args.type
          ? (String(args.type) as 'weekly' | 'monthly' | 'emergency')
          : undefined,
        limit: args.limit ? String(args.limit) : undefined,
        offset: args.offset ? String(args.offset) : undefined,
      });
      return { content: [{ type: 'text', text: unwrapControllerResult(result) }] };
    } catch (e) {
      logger.error('[reportListTool] failed:', e);
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'read',
};

const reportDetailSchema: TObject = Type.Object({
  report_id: Type.String({ description: '报告 ID' }),
});

export const reportDetailHermesConfig: HermesToolConfig = {
  name: 'report_detail',
  description: '获取指定报告 ID 的详情',
  schema: reportDetailSchema,
  handler: async (_id, args) => {
    try {
      const controller = await getReportDetailController();
      const result = await controller.getReportDetail({
        reportId: String(args.report_id),
      });
      return { content: [{ type: 'text', text: unwrapControllerResult(result) }] };
    } catch (e) {
      logger.error('[reportDetailTool] failed:', e);
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'read',
};