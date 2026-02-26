import { TransactionRecordType, TransactionType } from '@typings/transaction';
import logger from '@server/base/logger';
import positionService from './positionService';
import { AssetType } from '@typings/asset';
import { transactionRepository, type CreateTransactionData, type UpdateTransactionData } from '../repository/transactionRepository';
import { accountFundRepository } from '../repository/accountFundRepository';

export class TransactionService {
  constructor() {
    // Repository 已经封装了数据库操作
  }

  /**
   * Get transaction history
   * @param accountId Account ID
   * @param limit Number of transactions to return (default: 50)
   * @param offset Number of transactions to skip (default: 0)
   * @returns Transaction history
   */
  async getTransactionHistory(
    accountId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ transactions: TransactionRecordType[]; totalCount: number }> {
    try {
      // Get total count using repository
      const totalCount = await transactionRepository.countByAccountId(parseInt(accountId));

      // Get transactions using repository
      const transactionRecords = await transactionRepository.findByAccountId(
        parseInt(accountId),
        limit,
        offset,
      );

      // Calculate balance after each transaction
      const transactionsWithBalance = transactionRecords.map((record) => {
        return {
          id: record.id.toString(),
          accountId: record.accountId?.toString() || '',
          type: record.type as TransactionType,
          amount: (record.totalAmountCents ?? 0) / 100,
          description: record.description || '',
          referenceId: record.id.toString(),
          createdAt: record.createdAt,
          tradeTime: record.tradeTime,
          quantity: record.quantity || 0,
          price: record.priceCents ? (record.priceCents ?? 0) / 100 : 0,
          symbol: record.symbol || '',
          market: record.market as 'US' | 'CN' | 'HK' | undefined,
        };
      });

      return {
        transactions: transactionsWithBalance,
        totalCount: totalCount || 0,
      };
    } catch (error) {
      logger.error(`Failed to get transaction history for account ${accountId}: ${error}`);
      return { transactions: [], totalCount: 0 };
    }
  }

  private dataTypeToDBType(type: TransactionType): TransactionType {
    switch (type) {
      case 'deposit':
        return 'deposit';
      case 'withdrawal':
        return 'withdrawal';
      case 'buy':
        return 'buy';
      case 'sell':
        return 'sell';
    }
  }

  /**
   * Add a new transaction
   * @param transactionData Transaction data
   * @returns Created transaction record
   */
  async addTransaction(transactionData: {
    accountId: string;
    type: TransactionType;
    amount: number;
    sector: AssetType;
    market?: 'US' | 'CN' | 'HK';
    description?: string;
    symbol?: string;
    quantity?: number;
    price?: number;
    createdAt?: Date;
    tradeTime?: Date;
  }): Promise<TransactionRecordType> {
    try {
      const dbType = this.dataTypeToDBType(transactionData.type);

      // 验证必填字段
      if (transactionData.type === 'buy' || transactionData.type === 'sell') {
        if (transactionData.quantity === undefined || transactionData.price === undefined) {
          throw new Error('买入/卖出交易必须提供数量和价格');
        }
      } else if (transactionData.type === 'deposit' || transactionData.type === 'withdrawal') {
        if (transactionData.amount === undefined) {
          throw new Error('存款/取款交易必须提供金额');
        }
      }

      // Determine quantity/price/total and convert to cents for DB
      const quantity = transactionData.quantity ?? 0;
      const price = transactionData.price ?? 0;
      const symbol = transactionData.symbol ?? '';

      const totalAmount =
        transactionData.type === 'buy' || transactionData.type === 'sell'
          ? quantity * price
          : Math.abs(transactionData.amount);

      const totalAmountCents = Math.round(totalAmount * 100);
      const priceCents =
        transactionData.price !== undefined ? Math.round(transactionData.price * 100) : undefined;
      const feeCents = 0;

      // Insert transaction into database using Repository
      const newTransaction = await transactionRepository.createTransaction({
        accountId: parseInt(transactionData.accountId),
        type: dbType,
        symbol: symbol || undefined,
        quantity: quantity || undefined,
        priceCents: priceCents ?? undefined,
        totalAmountCents: totalAmountCents,
        market: transactionData.market,
        description: transactionData.description,
        feeCents,
        tradeTime: transactionData.tradeTime,
      });

      // 如果是出入金交易，同步更新账户资金余额
      if (transactionData.type === 'deposit' || transactionData.type === 'withdrawal') {
        // 使用 Repository 查询账户资金
        const accountFund = await accountFundRepository.findByAccountId(parseInt(transactionData.accountId));

        if (accountFund) {
          // 计算新的余额：入金增加，出金减少
          const balanceChange = transactionData.type === 'deposit' ? totalAmountCents : -totalAmountCents;
          const newAmountCents = accountFund.amountCents + balanceChange;

          // 更新账户资金余额
          await accountFundRepository.updateBalance(parseInt(transactionData.accountId), newAmountCents);

          logger.info(
            `Account balance updated for deposit/withdrawal: accountId=${transactionData.accountId}, type=${transactionData.type}, change=${balanceChange / 100}, newBalance=${newAmountCents / 100}`
          );
        } else {
          // 如果没有 accountFunds 记录，创建一条新的（入金时）
          if (transactionData.type === 'deposit') {
            await accountFundRepository.createAccountFund({
              accountId: parseInt(transactionData.accountId),
              amountCents: totalAmountCents,
              currency: transactionData.market === 'HK' ? 'HKD' :
                       transactionData.market === 'CN' ? 'CNY' : 'USD',
              leverage: 1,
            });
            logger.info(
              `Created new account funds record for deposit: accountId=${transactionData.accountId}, amount=${totalAmountCents / 100}`
            );
          }
        }
      }

      // 如果是股票交易，则更新仓位
      if (transactionData.type === 'buy' || transactionData.type === 'sell') {
        await positionService.processTransaction(
          parseInt(transactionData.accountId),
          transactionData.symbol || '',
          transactionData.quantity || 0,
          priceCents || 0,
          transactionData.type,
          transactionData.sector,
        );
      }

      return {
        id: newTransaction.id.toString(),
        accountId: newTransaction.accountId.toString(),
        symbol: newTransaction.symbol || '',
        quantity: newTransaction.quantity || 0,
        price: newTransaction.priceCents ? (newTransaction.priceCents ?? 0) / 100 : 0,
        type: dbType,
        amount: (newTransaction.totalAmountCents ?? 0) / 100,
        description: `${newTransaction.type} ${newTransaction.symbol}`,
        referenceId: newTransaction.id.toString(),
        createdAt: newTransaction.createdAt,
        tradeTime: newTransaction.tradeTime as Date | undefined,
        market: newTransaction.market as 'US' | 'CN' | 'HK' | undefined,
      };
    } catch (error) {
      logger.error(`Failed to add transaction: ${error}`);
      throw new Error(`Failed to add transaction: ${error}`);
    }
  }

  /**
   * Update an existing transaction
   * @param transactionId Transaction ID
   * @param transactionData Transaction data to update
   * @returns Updated transaction record
   */
  async updateTransaction(
    transactionId: string,
    transactionData: Partial<{
      type: TransactionType;
      amount: number;
      sector: AssetType;
      market: 'US' | 'CN' | 'HK';
      description?: string;
      symbol: string;
      quantity: number;
      price: number;
      timestamp?: Date;
      tradeTime?: Date;
    }>,
  ): Promise<TransactionRecordType> {
    try {
      // Get existing transaction using Repository
      const existingTransaction = await transactionRepository.findById(parseInt(transactionId));

      if (!existingTransaction) {
        throw new Error('Transaction not found');
      }

      // Prepare update data
      const updateData: any = {};

      if (transactionData.type !== undefined) {
        updateData.type = this.dataTypeToDBType(transactionData.type);
      }

      if (transactionData.symbol !== undefined) {
        updateData.symbol = transactionData.symbol || undefined;
      }

      if (transactionData.quantity !== undefined) {
        updateData.quantity = transactionData.quantity || undefined;
      }

      if (transactionData.price !== undefined) {
        updateData.priceCents =
          transactionData.price !== undefined ? Math.round(transactionData.price * 100) : undefined;
      }

      if (transactionData.market !== undefined) {
        updateData.market = transactionData.market;
      }

      if (transactionData.description !== undefined) {
        updateData.description = transactionData.description;
      }

      if (transactionData.tradeTime !== undefined) {
        updateData.tradeTime = new Date(transactionData.tradeTime);
      }

      // 验证必填字段
      const transactionType = transactionData.type || existingTransaction.type;
      if (transactionType === 'buy' || transactionType === 'sell') {
        // 对于买入/卖出交易，必须提供数量和价格
        const quantity =
          transactionData.quantity !== undefined
            ? transactionData.quantity
            : existingTransaction.quantity;
        const price =
          transactionData.price !== undefined
            ? transactionData.price
            : existingTransaction.priceCents
              ? existingTransaction.priceCents / 100
              : undefined;

        if (quantity === null || quantity === undefined || price === undefined) {
          throw new Error('买入/卖出交易必须提供数量和价格');
        }

        const totalAmount = (quantity as number) * (price as number);
        updateData.totalAmountCents = Math.round(totalAmount * 100);
      } else if (transactionType === 'deposit' || transactionType === 'withdrawal') {
        // 对于存款/取款交易，必须提供金额
        const amount = transactionData.amount;
        if (amount === undefined) {
          throw new Error('存款/取款交易必须提供金额');
        }

        updateData.totalAmountCents = Math.round(Math.abs(amount) * 100);
      }

      // Update transaction in database using Repository
      const updatedTransaction = await transactionRepository.updateTransaction(
        parseInt(transactionId),
        updateData as UpdateTransactionData,
      );

      if (!updatedTransaction) {
        throw new Error('Failed to update transaction');
      }

      // 如果交易类型或相关字段被更新，需要相应地调整仓位或余额
      // 修复：正确处理仓位更新，确保平均价格计算准确
      const originalType = existingTransaction.type as TransactionType;
      const originalQuantity = existingTransaction.quantity || 0;
      const originalPriceCents = existingTransaction.priceCents || 0;
      const originalSymbol = existingTransaction.symbol || '';
      const originalTotalAmountCents = existingTransaction.totalAmountCents || 0;

      // 获取更新后的交易信息
      const newType = transactionData.type || originalType;
      const newQuantity =
        transactionData.quantity !== undefined ? transactionData.quantity : originalQuantity;
      const newPriceCents =
        transactionData.price !== undefined
          ? Math.round(transactionData.price * 100)
          : originalPriceCents;
      const newSymbol = transactionData.symbol || originalSymbol;
      const newTotalAmountCents = updatedTransaction.totalAmountCents || 0;

      // 处理出入金交易对余额的影响
      if (originalType === 'deposit' || originalType === 'withdrawal' ||
          newType === 'deposit' || newType === 'withdrawal') {
        // 使用 Repository 查询账户资金
        const accountFund = await accountFundRepository.findByAccountId(existingTransaction.accountId);

        if (accountFund) {
          let balanceChangeCents = 0;

          // 撤销原交易的影响
          if (originalType === 'deposit') {
            balanceChangeCents -= originalTotalAmountCents;  // 入金要减去
          } else if (originalType === 'withdrawal') {
            balanceChangeCents += originalTotalAmountCents;  // 出金要加回
          }

          // 应用新交易的影响
          if (newType === 'deposit') {
            balanceChangeCents += newTotalAmountCents;
          } else if (newType === 'withdrawal') {
            balanceChangeCents -= newTotalAmountCents;
          }

          if (balanceChangeCents !== 0) {
            const newAmountCents = accountFund.amountCents + balanceChangeCents;

            // 使用 Repository 更新账户资金余额
            await accountFundRepository.updateBalance(existingTransaction.accountId, newAmountCents);

            logger.info(
              `Account balance updated for transaction update: accountId=${existingTransaction.accountId}, balanceChange=${balanceChangeCents / 100}, newBalance=${newAmountCents / 100}`
            );
          }
        }
      }

      // 如果交易类型或相关字段被更新，需要相应地调整仓位
      if (
        transactionData.type !== undefined ||
        transactionData.quantity !== undefined ||
        transactionData.price !== undefined ||
        transactionData.symbol !== undefined
      ) {
        // 如果原交易是股票交易，需要移除其对仓位的影响
        if (originalType === 'buy' || originalType === 'sell') {
          // 获取原交易对应的仓位信息
          const originalPosition = await positionService.getPositionBySymbol(
            existingTransaction.accountId,
            originalSymbol,
          );

          if (originalPosition) {
            // 保存原始仓位信息
            const originalPositionQuantity = originalPosition.quantity;
            const originalPositionAvgPrice = originalPosition.averagePriceCents;

            // 计算移除原交易影响后的仓位
            if (originalType === 'buy') {
              // 如果原交易是买入，我们需要减少相应数量
              const newQuantity = originalPositionQuantity - originalQuantity;

              if (newQuantity <= 0) {
                // 如果数量为0或负数，删除仓位
                await positionService.deletePosition(originalPosition.id);
              } else {
                // 重新计算平均价格
                // 原总成本 = 原平均价格 * 原数量
                const originalTotalCost = originalPositionAvgPrice * originalPositionQuantity;
                // 移除的成本 = 原交易价格 * 原交易数量
                const removedCost = originalPriceCents * originalQuantity;
                // 新的总成本 = 原总成本 - 移除的成本
                const newTotalCost = originalTotalCost - removedCost;
                // 新的平均价格 = 新的总成本 / 新数量
                const newAveragePriceCents = Math.round(newTotalCost / newQuantity);

                await positionService.updatePosition(originalPosition.id, {
                  quantity: newQuantity,
                  averagePriceCents: newAveragePriceCents,
                });
              }
            } else if (originalType === 'sell') {
              // 如果原交易是卖出，我们需要增加相应数量（撤销卖出）
              const newQuantity = originalPositionQuantity + originalQuantity;
              // 卖出不影响平均价格，只需增加数量
              await positionService.updatePosition(originalPosition.id, {
                quantity: newQuantity,
              });
            }
          }
        }

        // 应用新交易对仓位的影响
        if (newType === 'buy' || newType === 'sell') {
          // 获取新交易对应的资产类型
          let newSector: AssetType = 'stock'; // 默认值
          if (transactionData.sector) {
            newSector = transactionData.sector;
          }

          await positionService.processTransaction(
            existingTransaction.accountId,
            newSymbol,
            newQuantity,
            newPriceCents,
            newType,
            newSector,
          );
        }
      }

      return {
        id: updatedTransaction.id.toString(),
        accountId: updatedTransaction.accountId.toString(),
        symbol: updatedTransaction.symbol || '',
        quantity: updatedTransaction.quantity || 0,
        price: updatedTransaction.priceCents ? (updatedTransaction.priceCents ?? 0) / 100 : 0,
        type: updatedTransaction.type as TransactionType,
        amount: (updatedTransaction.totalAmountCents ?? 0) / 100,
        description:
          updatedTransaction.description ||
          `${updatedTransaction.type} ${updatedTransaction.symbol}`,
        referenceId: updatedTransaction.id.toString(),
        createdAt: updatedTransaction.createdAt,
        tradeTime: updatedTransaction.tradeTime || (undefined as Date | undefined),
        market: updatedTransaction.market as 'US' | 'CN' | 'HK' | undefined,
      };
    } catch (error) {
      logger.error(`Failed to update transaction ${transactionId}: ${error}`);
      throw new Error(`Failed to update transaction: ${error}`);
    }
  }

  /**
   * Get account balance at a specific point in time
   * @param accountId Account ID
   * @param beforeTransactionId Transaction ID to calculate balance before (optional)
   * @returns Account balance
   */
  async getAccountBalance(accountId: string, beforeTransactionId?: number): Promise<number> {
    try {
      // 使用 Repository 查询账户资金
      const accountFund = await accountFundRepository.findByAccountId(parseInt(accountId));

      if (!accountFund) {
        return 0;
      }

      // Start with initial balance (convert cents -> dollars)
      let balance = (accountFund.amountCents ?? 0) / 100;

      // Get all transactions up to the specified point using repository
      let transactionRecords: any[];
      
      if (beforeTransactionId) {
        transactionRecords = await transactionRepository.findBeforeTransactionId(
          parseInt(accountId),
          beforeTransactionId,
        );
      } else {
        transactionRecords = await transactionRepository.findByAccountId(parseInt(accountId));
      }

      // Calculate balance based on transactions (use cents -> dollars)
      for (const transaction of transactionRecords) {
        const amt = (transaction.totalAmountCents ?? 0) / 100;
        if (transaction.type === 'deposit') {
          balance += amt;
        } else if (transaction.type === 'withdrawal') {
          balance -= amt;
        } else if (transaction.type === 'buy') {
          balance -= amt;
        } else if (transaction.type === 'sell') {
          balance += amt;
        }
      }

      return balance;
    } catch (error) {
      logger.error(`Failed to get account balance for account ${accountId}: ${error}`);
      return 0;
    }
  }
}

const transactionService = new TransactionService();

export default transactionService;
