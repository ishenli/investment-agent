/**
 * Transaction Business Logic
 *
 * 纯业务函数，无框架耦合。被 LangChain tools / Claude SDK tools / Hermes tools 复用。
 */
import transactionService from '@server/service/transactionService';
import authService from '@server/service/authService';
import logger from '@server/base/logger';
import type { TransactionType } from '@typings/transaction';

// ============== Query Operations ==============

/**
 * 获取账户的交易历史记录
 *
 * @param accountId - 账户 ID
 * @param limit - 返回记录数量限制（默认 50）
 * @param offset - 偏移量（用于分页）
 * @returns 格式化的交易历史字符串
 */
export async function getTransactionHistory(
  accountId: string,
  limit?: number,
  offset?: number,
): Promise<string> {
  logger.info(`[business/transaction] getTransactionHistory: accountId=${accountId}, limit=${limit}, offset=${offset}`);

  try {
    const { transactions, totalCount } = await transactionService.getTransactionHistory(
      accountId,
      limit ?? 50,
      offset ?? 0,
    );

    if (transactions.length === 0) {
      return `账户 ${accountId} 暂无交易记录。`;
    }

    const lines = transactions.map((tx) => {
      const date = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('zh-CN') : 'N/A';
      const type = tx.type || 'N/A';
      const symbol = tx.symbol || '-';
      const quantity = tx.quantity !== undefined ? tx.quantity.toString() : '-';
      const price = tx.price !== undefined ? `$${tx.price.toFixed(2)}` : '-';
      const amount = tx.amount !== undefined ? `$${tx.amount.toFixed(2)}` : '-';

      return `[${tx.id}] ${date} | ${type} | ${symbol} | 数量: ${quantity} | 价格: ${price} | 金额: ${amount}`;
    });

    return `账户 ${accountId} 共 ${totalCount} 条交易记录，当前显示 ${transactions.length} 条:\n${lines.join('\n')}`;
  } catch (e) {
    throw new Error(`交易历史获取失败: ${(e as Error).message}`);
  }
}

/**
 * 按日期范围查询交易历史
 *
 * @param accountId - 账户 ID
 * @param startDate - 开始日期（ISO 格式字符串）
 * @param endDate - 结束日期（ISO 格式字符串）
 * @param limit - 返回记录数量限制
 * @param offset - 偏移量
 * @returns 格式化的交易历史字符串
 */
export async function getTransactionHistoryByDateRange(
  accountId: string,
  startDate: string,
  endDate: string,
  limit?: number,
  offset?: number,
): Promise<string> {
  logger.info(`[business/transaction] getTransactionHistoryByDateRange: accountId=${accountId}, ${startDate} ~ ${endDate}`);

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('日期格式无效，请使用 ISO 格式（如 2024-01-01）');
    }

    const { transactions, totalCount } = await transactionService.getTransactionHistoryByDateRange(
      accountId,
      start,
      end,
      limit,
      offset,
    );

    if (transactions.length === 0) {
      return `账户 ${accountId} 在 ${startDate} 至 ${endDate} 期间无交易记录。`;
    }

    const lines = transactions.map((tx) => {
      const date = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('zh-CN') : 'N/A';
      const type = tx.type || 'N/A';
      const symbol = tx.symbol || '-';
      const quantity = tx.quantity !== undefined ? tx.quantity.toString() : '-';
      const price = tx.price !== undefined ? `$${tx.price.toFixed(2)}` : '-';
      const amount = tx.amount !== undefined ? `$${tx.amount.toFixed(2)}` : '-';

      return `[${tx.id}] ${date} | ${type} | ${symbol} | 数量: ${quantity} | 价格: ${price} | 金额: ${amount}`;
    });

    return `账户 ${accountId} 在 ${startDate} 至 ${endDate} 期间共 ${totalCount} 条交易记录:\n${lines.join('\n')}`;
  } catch (e) {
    throw new Error(`按日期查询交易历史失败: ${(e as Error).message}`);
  }
}

/**
 * 获取账户当前余额（基于交易记录计算）
 *
 * @param accountId - 账户 ID
 * @param beforeTransactionId - 可选，计算到指定交易之前的余额
 * @returns 账户余额
 */
export async function getAccountBalance(
  accountId: string,
  beforeTransactionId?: string,
): Promise<string> {
  logger.info(`[business/transaction] getAccountBalance: accountId=${accountId}, beforeTransactionId=${beforeTransactionId}`);

  try {
    const balance = await transactionService.getAccountBalance(
      accountId,
      beforeTransactionId ? parseInt(beforeTransactionId) : undefined,
    );

    return `账户 ${accountId} 当前余额: $${balance.toFixed(2)}`;
  } catch (e) {
    throw new Error(`账户余额获取失败: ${(e as Error).message}`);
  }
}

/**
 * 获取交易记录摘要（Markdown 格式）
 *
 * @param accountId - 账户 ID
 * @param limit - 记录数量限制（默认 50）
 * @returns Markdown 格式的交易摘要
 */
export async function getTransactionSummary(
  accountId: string,
  limit?: number,
): Promise<string> {
  logger.info(`[business/transaction] getTransactionSummary: accountId=${accountId}, limit=${limit}`);

  try {
    return await transactionService.getTransactionSummaryMarkdown(accountId, limit ?? 50);
  } catch (e) {
    throw new Error(`交易摘要获取失败: ${(e as Error).message}`);
  }
}

// ============== Create Operations ==============

/**
 * 添加交易记录
 *
 * @param accountId - 账户 ID
 * @param type - 交易类型: 'deposit' | 'withdrawal' | 'buy' | 'sell'
 * @param amount - 金额（存款/取款时使用）
 * @param sector - 资产类型: 'stock' | 'etf' | 'fund' | 'crypto'
 * @param market - 市场: 'US' | 'CN' | 'HK'
 * @param symbol - 股票代码（买入/卖出时必填）
 * @param quantity - 数量（买入/卖出时必填）
 * @param price - 价格（买入/卖出时必填）
 * @param description - 描述
 * @param tradeTime - 交易时间（ISO 格式字符串）
 * @returns 创建结果
 */
export async function addTransaction(options: {
  accountId?: string;
  type: TransactionType;
  amount?: number;
  sector?: 'stock' | 'etf' | 'fund' | 'crypto';
  market?: 'US' | 'CN' | 'HK';
  symbol?: string;
  quantity?: number;
  price?: number;
  description?: string;
  tradeTime?: string;
}): Promise<string> {
  const { type, amount, sector, market, symbol, quantity, price, description, tradeTime } = options;

  // 自动获取当前用户账户 ID，忽略外部传入的 accountId（防止 AI 编造无效 ID）
  const accountInfo = await authService.getCurrentUserAccount();
  if (!accountInfo) {
    throw new Error('无法获取当前账户信息，请确认用户已登录');
  }
  const accountId = accountInfo.id;

  logger.info(`[business/transaction] addTransaction: accountId=${accountId}, type=${type}, symbol=${symbol}`);

  try {
    const transactionData: any = {
      accountId,
      type,
      sector: sector ?? 'stock',
      market,
      symbol,
      quantity,
      price,
      description,
      tradeTime: tradeTime ? new Date(tradeTime) : undefined,
    };

    if (type === 'deposit' || type === 'withdrawal') {
      if (amount === undefined) {
        throw new Error('存款/取款交易必须提供金额');
      }
      transactionData.amount = amount;
    } else if (type === 'buy' || type === 'sell') {
      if (quantity === undefined || price === undefined) {
        throw new Error('买入/卖出交易必须提供数量和价格');
      }
      if (!symbol) {
        throw new Error('买入/卖出交易必须提供股票代码');
      }
    }

    const result = await transactionService.addTransaction(transactionData);

    return `交易记录创建成功！\nID: ${result.id}\n类型: ${result.type}\n${symbol ? `代码: ${symbol}\n` : ''}${quantity ? `数量: ${quantity}\n` : ''}${price ? `价格: $${price.toFixed(2)}\n` : ''}${amount ? `金额: $${amount.toFixed(2)}\n` : ''}时间: ${result.createdAt?.toISOString() ?? 'N/A'}`;
  } catch (e) {
    throw new Error(`交易记录创建失败: ${(e as Error).message}`);
  }
}
