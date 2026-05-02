/**
 * Stock Business Logic
 *
 * 纯业务函数，无框架耦合。被 LangChain tools / Claude SDK tools / Hermes tools 复用。
 */
import { getStockData } from '@server/service/stockDataService';
import assetMarketInfoService from '@server/service/assetMarketInfoService';
import assetCompanyInfoService from '@server/service/assetCompanyInfoService';
import assetMetaService from '@server/service/assetMetaService';
import { searchNews } from '@server/dataflows/finnhubUtil';
import logger from '@server/base/logger';
import type { MarketType } from '@typings/asset';

/**
 * 根据股票代码识别市场类型
 */
export function getMarketType(ticker: string): MarketType {
  const t = ticker.toUpperCase();
  if (t.includes('.HK')) return 'HK';
  if (/^\d{6}$/.test(t)) return 'CN';
  return 'US';
}

/**
 * 获取股票价格数据（支持美股、A股、港股）
 */
export async function fetchStockPrice(
  symbol: string,
  startDate?: string,
  endDate?: string,
): Promise<string> {
  const market = getMarketType(symbol);
  const now = new Date().toISOString().split('T')[0];
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const end = endDate || now;

  logger.info(`[business/stock] fetchStockPrice: ${symbol} ${market} ${start}~${end}`);

  try {
    return await getStockData(symbol, start, end, market, logger);
  } catch (e) {
    throw new Error(`股票价格查询失败: ${(e as Error).message}`);
  }
}

/**
 * 查询资产市场信息（评级、财报分析、投资笔记）
 */
export async function fetchStockMarketInfo(symbol: string): Promise<string> {
  logger.info(`[business/stock] fetchStockMarketInfo: ${symbol}`);
  try {
    const result = await assetMarketInfoService.getLatestAssetMarketInfoBySymbol(symbol);
    return JSON.stringify(result, null, 2);
  } catch (e) {
    throw new Error(`市场信息查询失败: ${(e as Error).message}`);
  }
}

/**
 * 查询公司基本信息（行业、市值、简介等）
 */
export async function fetchStockCompanyInfo(symbol: string): Promise<string> {
  logger.info(`[business/stock] fetchStockCompanyInfo: ${symbol}`);
  try {
    const [companyInfo, assetMetas] = await Promise.all([
      assetCompanyInfoService.getLatestAssetCompanyInfoBySymbol(symbol),
      assetMetaService.searchAssetMetasBySymbol(symbol),
    ]);

    const investmentMemo = assetMetas.find((m) => m.investmentMemo)?.investmentMemo ?? null;

    return JSON.stringify({ companyInfo, investmentMemo }, null, 2);
  } catch (e) {
    throw new Error(`公司信息查询失败: ${(e as Error).message}`);
  }
}

/**
 * 搜索股票相关新闻
 */
export async function searchStockNews(
  ticker: string,
  startDate?: string,
  endDate?: string,
): Promise<string> {
  logger.info(`[business/stock] searchStockNews: ${ticker}`);
  try {
    const finnhub_news = await searchNews(`${ticker} ${startDate || ''} ${endDate || ''}`);
    return finnhub_news;
  } catch (e) {
    throw new Error(`新闻搜索失败: ${(e as Error).message}`);
  }
}
