// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import * as finnhub from 'finnhub';
import { ChatAgentProxy } from '@server/core/provider/chatAgent';
import type { Logger } from '@server/base/logger';
import * as fs from 'fs';
import * as path from 'path';

const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = process.env.FINNHUB_API_KEY;

export const finnhubClient = new finnhub.DefaultApi();

/**
 * 获取指定范围内的 Finnhub 数据
 * @param ticker 股票代码
 * @param startDate 开始日期 (YYYY-MM-DD 格式)
 * @param endDate 结束日期 (YYYY-MM-DD 格式)
 * @param dataType 数据类型 (insider_trans, SEC_filings, news_data, insider_senti, fin_as_reported)
 * @param dataDir 数据保存目录
 * @param period 周期 (可选: annual 或 quarterly)
 * @returns 过滤后的数据对象
 */
export function getDataInRange({
  ticker,
  startDate,
  endDate,
  dataType,
  dataDir,
  period = 'annual',
  logger,
}: {
  ticker: string;
  startDate: string;
  endDate: string;
  dataType: string;
  dataDir: string;
  period?: string;
  logger: Logger;
}) {
  let dataPath: string;

  if (period) {
    dataPath = path.join(
      dataDir,
      'finnhub_data',
      dataType,
      `${ticker}_${period}_data_formatted.json`,
    );
  } else {
    dataPath = path.join(dataDir, 'finnhub_data', dataType, `${ticker}_data_formatted.json`);
  }

  try {
    if (!fs.existsSync(dataPath)) {
      if (logger) {
        logger.warn(`⚠️ [DEBUG] 数据文件不存在: ${dataPath}`);
        logger.warn(`⚠️ [DEBUG] 请确保已下载相关数据或检查数据目录配置`);
      }
      return {};
    }

    const fileContent = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(fileContent);
    // 按日期范围过滤数据
    const filteredData: Record<string, string | string[]> = {};

    for (const [key, value] of Object.entries(data)) {
      if (key >= startDate && key <= endDate && Array.isArray(value) && value.length > 0) {
        filteredData[key] = value;
      }
    }

    return filteredData;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'SyntaxError') {
        if (logger) {
          logger.error(`❌ [ERROR] JSON解析错误: ${error.message}`);
        }
      } else {
        if (logger) {
          logger.error(`❌ [ERROR] 读取数据文件时发生错误: ${error.message}`);
        }
      }
    }
    return {};
  }
}

export async function searchNews(query: string): Promise<string> {
  const agent = new ChatAgentProxy({ agentId: 'sousugongju' });
  const response = await agent.invoke(query);
  return response.text;
}

export async function searchAssetInfo(query: string): Promise<string> {
  const agent = new ChatAgentProxy({ agentId: 'gupiaoshichangchaxungongju' });
  const response = await agent.invoke(query);
  return response.text;
}