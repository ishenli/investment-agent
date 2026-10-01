import logger from '@server/base/logger';
import { createAssetMeta, updateAssetMeta } from '@server/core/business';
import { Type, type TObject } from '@sinclair/typebox';

import type { HermesToolConfig } from './types';

// ============== Hermes Adapters ==============

const assetMetaCreateSchema: TObject = Type.Object({
  symbol: Type.String({ description: '资产代号（股票代码）' }),
  priceCents: Type.Number({ description: '价格（单位：分）' }),
  assetType: Type.Union([Type.Literal('stock'), Type.Literal('etf'), Type.Literal('fund'), Type.Literal('crypto')], { description: '资产类型' }),
  currency: Type.String({ description: '货币代码，如 CNY, USD, HKD' }),
  source: Type.String({ description: '数据来源标识' }),
  market: Type.Union([Type.Literal('CN'), Type.Literal('US'), Type.Literal('HK')], { description: '市场' }),
  chineseName: Type.Optional(Type.String({ description: '中文名称' })),
  fullName: Type.Optional(Type.String({ description: '完整名称' })),
  logoUrl: Type.Optional(Type.String({ description: 'Logo URL' })),
  investmentMemo: Type.Optional(Type.String({ description: '投资备忘录' })),
});

export const assetMetaCreateHermesConfig: HermesToolConfig = {
  name: 'asset_meta_create',
  description: '创建新的资产元数据记录',
  schema: assetMetaCreateSchema,
  handler: async (_id, args) => {
    try {
      const result = await createAssetMeta({
        symbol: String(args.symbol),
        priceCents: Number(args.priceCents),
        assetType: String(args.assetType) as 'stock' | 'etf' | 'fund' | 'crypto',
        currency: String(args.currency),
        source: String(args.source),
        market: String(args.market) as 'CN' | 'US' | 'HK',
        chineseName: args.chineseName !== undefined ? String(args.chineseName) : null,
        fullName: args.fullName !== undefined ? String(args.fullName) : null,
        logoUrl: args.logoUrl !== undefined ? String(args.logoUrl) : null,
        investmentMemo: args.investmentMemo !== undefined ? String(args.investmentMemo) : null,
      });
      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      logger.error('[assetMetaCreateTool] failed:', e);
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'write',
};

const assetMetaUpdateSchema: TObject = Type.Object({
  id: Type.Number({ description: '资产元数据 ID' }),
  symbol: Type.Optional(Type.String({ description: '资产代号（股票代码）' })),
  priceCents: Type.Optional(Type.Number({ description: '价格（单位：分）' })),
  assetType: Type.Optional(Type.Union([Type.Literal('stock'), Type.Literal('etf'), Type.Literal('fund'), Type.Literal('crypto')], { description: '资产类型' })),
  currency: Type.Optional(Type.String({ description: '货币代码，如 CNY, USD, HKD' })),
  source: Type.Optional(Type.String({ description: '数据来源标识' })),
  market: Type.Optional(Type.Union([Type.Literal('CN'), Type.Literal('US'), Type.Literal('HK')], { description: '市场' })),
  chineseName: Type.Optional(Type.String({ description: '中文名称，传空字符串表示清空' })),
  fullName: Type.Optional(Type.String({ description: '完整名称，传空字符串表示清空' })),
  logoUrl: Type.Optional(Type.String({ description: 'Logo URL，传空字符串表示清空' })),
  investmentMemo: Type.Optional(Type.String({ description: '投资备忘录，传空字符串表示清空' })),
});

export const assetMetaUpdateHermesConfig: HermesToolConfig = {
  name: 'asset_meta_update',
  description: '更新已有的资产元数据记录',
  schema: assetMetaUpdateSchema,
  handler: async (_id, args) => {
    try {
      const result = await updateAssetMeta({
        id: Number(args.id),
        symbol: args.symbol !== undefined ? String(args.symbol) : undefined,
        priceCents: args.priceCents !== undefined ? Number(args.priceCents) : undefined,
        assetType: args.assetType !== undefined ? String(args.assetType) as 'stock' | 'etf' | 'fund' | 'crypto' : undefined,
        currency: args.currency !== undefined ? String(args.currency) : undefined,
        source: args.source !== undefined ? String(args.source) : undefined,
        market: args.market !== undefined ? String(args.market) as 'CN' | 'US' | 'HK' : undefined,
        chineseName: args.chineseName !== undefined ? String(args.chineseName) : undefined,
        fullName: args.fullName !== undefined ? String(args.fullName) : undefined,
        logoUrl: args.logoUrl !== undefined ? String(args.logoUrl) : undefined,
        investmentMemo: args.investmentMemo !== undefined ? String(args.investmentMemo) : undefined,
      });
      return { content: [{ type: 'text', text: result }] };
    } catch (e) {
      logger.error('[assetMetaUpdateTool] failed:', e);
      return { content: [{ type: 'text', text: (e as Error).message }], isError: true };
    }
  },
  category: 'write',
};