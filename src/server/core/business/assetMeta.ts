import assetMetaService from '@server/service/assetMetaService';
import logger from '@server/base/logger';

interface CreateAssetMetaParams {
  symbol: string;
  priceCents: number;
  assetType: 'stock' | 'etf' | 'fund' | 'crypto';
  currency: string;
  source: string;
  market: 'CN' | 'US' | 'HK';
  chineseName?: string | null;
  fullName?: string | null;
  logoUrl?: string | null;
  investmentMemo?: string | null;
}

export async function createAssetMeta(params: CreateAssetMetaParams): Promise<string> {
  try {
    const result = await assetMetaService.createAssetMeta({
      symbol: params.symbol,
      priceCents: params.priceCents,
      assetType: params.assetType,
      currency: params.currency,
      source: params.source,
      market: params.market,
      chineseName: params.chineseName ?? null,
      fullName: params.fullName ?? null,
      logoUrl: params.logoUrl ?? null,
      investmentMemo: params.investmentMemo ?? null,
    });
    return JSON.stringify(result);
  } catch (error) {
    logger.error('[business/assetMeta] createAssetMeta failed:', error);
    throw error;
  }
}

interface UpdateAssetMetaParams {
  id: number;
  symbol?: string;
  priceCents?: number;
  assetType?: 'stock' | 'etf' | 'fund' | 'crypto';
  currency?: string;
  source?: string;
  market?: 'CN' | 'US' | 'HK';
  chineseName?: string | null;
  fullName?: string | null;
  logoUrl?: string | null;
  investmentMemo?: string | null;
}

export async function updateAssetMeta(params: UpdateAssetMetaParams): Promise<string> {
  try {
    const { id, ...rest } = params;
    const updateData: {
      symbol?: string;
      priceCents?: number;
      assetType?: 'stock' | 'etf' | 'fund' | 'crypto';
      currency?: string;
      source?: string;
      market?: 'CN' | 'US' | 'HK';
      chineseName?: string | null;
      fullName?: string | null;
      logoUrl?: string | null;
      investmentMemo?: string | null;
    } = {};
    if (rest.symbol !== undefined) updateData.symbol = rest.symbol;
    if (rest.priceCents !== undefined) updateData.priceCents = rest.priceCents;
    if (rest.assetType !== undefined) updateData.assetType = rest.assetType;
    if (rest.currency !== undefined) updateData.currency = rest.currency;
    if (rest.source !== undefined) updateData.source = rest.source;
    if (rest.market !== undefined) updateData.market = rest.market;
    if (rest.chineseName !== undefined) updateData.chineseName = rest.chineseName === '' ? null : rest.chineseName;
    if (rest.fullName !== undefined) updateData.fullName = rest.fullName === '' ? null : rest.fullName;
    if (rest.logoUrl !== undefined) updateData.logoUrl = rest.logoUrl === '' ? null : rest.logoUrl;
    if (rest.investmentMemo !== undefined) updateData.investmentMemo = rest.investmentMemo === '' ? null : rest.investmentMemo;

    const result = await assetMetaService.updateAssetMeta(id, updateData);
    if (!result) {
      throw new Error(`Asset meta with id ${id} not found`);
    }
    return JSON.stringify(result);
  } catch (error) {
    logger.error('[business/assetMeta] updateAssetMeta failed:', error);
    throw error;
  }
}
