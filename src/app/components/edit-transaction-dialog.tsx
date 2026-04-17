'use client';

import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Modal } from '@renderer/components/ui/modal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { useAssetStore } from '@renderer/store/asset/store';
import { TransactionRecordType, TransactionType } from '@typings/index';
import { AssetType, MarketType } from '@typings/asset';
import { useState, useEffect } from 'react';
import { CURRENCY_SYMBOLS } from '@shared/constant';
import { useQueryClient } from '@tanstack/react-query';
import { useExchangeRates } from '@/app/hooks/useExchangeRates';

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionRecordType | null;
}

export function EditTransactionDialog({
  open,
  onOpenChange,
  transaction,
}: EditTransactionDialogProps) {
  const [type, setType] = useState<TransactionType>('buy');
  const [assetType, setAssetType] = useState<AssetType>('stock');
  const [marketType, setMarketType] = useState<MarketType>('US');
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [tradeTime, setTradeTime] = useState('');
  const [loading, setLoading] = useState(false);
  const fetchTransactions = useAssetStore((state) => state.fetchTransactions);
  const updateTransaction = useAssetStore((state) => state.updateTransaction);
  const queryClient = useQueryClient();
  const { convertToUSD } = useExchangeRates();

  // 资金类型状态
  const [currencyType, setCurrencyType] = useState<MarketType>('US');

  const isFund = assetType === 'fund';

  // 获取当前市场对应的货币符号
  const getCurrencySymbol = (market: MarketType) => {
    return CURRENCY_SYMBOLS[market] || '$';
  };

  // 将市场类型转换为货币代码
  const marketToCurrency = (market: MarketType): string => {
    switch (market) {
      case 'HK':
        return 'HKD';
      case 'CN':
        return 'CNY';
      default:
        return 'USD';
    }
  };

  // 初始化表单数据
  useEffect(() => {
    if (transaction && open) {
      console.info('Transaction data:', transaction);
      setType(transaction.type);
      setMarketType(transaction.market || 'US');
      setCurrencyType(transaction.market || 'US');
      setAssetType((transaction.sector as AssetType) || 'stock');
      setSymbol(transaction.symbol || '');
      setAmount(transaction.amount.toString());
      setQuantity(transaction.quantity?.toString() || '');
      setPrice(transaction.price?.toString() || '');
      setDescription(transaction.description || '');

      // 设置交易时间
      if (transaction.tradeTime) {
        const date = new Date(transaction.tradeTime);
        // 转换为本地时间格式
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        setTradeTime(localDate.toISOString().slice(0, 16));
      } else if (transaction.createdAt) {
        const date = new Date(transaction.createdAt);
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        setTradeTime(localDate.toISOString().slice(0, 16));
      }
    }
  }, [transaction, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;

    setLoading(true);

    try {
      // 将前端类型映射到后端类型
      let transactionData: any; // 使用 any 类型以避免类型检查问题

      // 处理出入金
      if (type === 'deposit' || type === 'withdrawal') {
        const originalAmount = parseFloat(amount);
        const usdAmount = convertToUSD(originalAmount, marketToCurrency(currencyType));

        transactionData = {
          type: type,
          amount: usdAmount,
          description,
          market: currencyType, // 存储资金类型
          tradeTime: tradeTime ? new Date(tradeTime) : undefined,
        };
      } else {
        // 对于买入和卖出，我们需要计算总金额
        const originalQuantity = parseFloat(quantity);
        const originalPrice = parseFloat(price);
        const originalTotalAmount = originalQuantity * originalPrice;

        // 人民币基金以 CNY 原始价格存储，不做 USD 转换
        const isCnyFund = assetType === 'fund' && marketType === 'CN';
        const finalPrice = isCnyFund ? originalPrice : convertToUSD(originalPrice, marketType);
        const finalTotalAmount = isCnyFund ? originalTotalAmount : convertToUSD(originalTotalAmount, marketType);

        transactionData = {
          type,
          amount: finalTotalAmount,
          description,
          symbol,
          quantity: originalQuantity,
          price: finalPrice,
          sector: assetType,
          market: marketType,
          tradeTime: tradeTime ? new Date(tradeTime) : undefined,
        };
      }

      await updateTransaction(transaction.id, transactionData);

      // 失效 React Query 缓存，确保账户余额、持仓、摘要数据得到刷新
      queryClient.invalidateQueries({ queryKey: ['account'] });
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });

      onOpenChange(false);
      fetchTransactions();
    } catch (error) {
      console.error('Failed to update transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="编辑交易记录"
      onSubmit={handleSubmit}
      submitText={loading ? '保存中...' : '保存'}
      cancelText="取消"
    >
      <div className="grid gap-4 py-4">
        {type !== 'deposit' && type !== 'withdrawal' && (
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="market" className="text-right">
              市场类型
            </Label>
          <Select key={marketType} value={marketType} onValueChange={(value: MarketType) => setMarketType(value)}>
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="选择市场" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="US">美股</SelectItem>
              <SelectItem value="HK">港股</SelectItem>
              <SelectItem value="CN">A股</SelectItem>
            </SelectContent>
          </Select>
        </div>
        )}
        {type !== 'deposit' && type !== 'withdrawal' && (
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="assetType" className="text-right">
              资产类型
            </Label>
            <Select key={assetType} value={assetType} onValueChange={(value: AssetType) => {
              setAssetType(value);
              if (value === 'fund') {
                setMarketType('CN');
              }
            }}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stock">股票</SelectItem>
                <SelectItem value="crypto">加密货币</SelectItem>
                <SelectItem value="fund">基金</SelectItem>
                <SelectItem value="etf">etf</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {type !== 'deposit' && type !== 'withdrawal' && assetType === 'fund' && marketType === 'CN' && (
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="col-span-1" />
            <div className="col-span-3 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-3 py-1.5 rounded-md">
              人民币计价：价格以人民币输入，持仓以人民币展示
            </div>
          </div>
        )}
        {(type === 'deposit' || type === 'withdrawal') && (
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="currency" className="text-right">
              资金类型
            </Label>
            <Select key={`currency-${type}`} value={currencyType} onValueChange={(value: MarketType) => setCurrencyType(value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="选择资金类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">美元 (USD)</SelectItem>
                <SelectItem value="HK">港币 (HKD)</SelectItem>
                <SelectItem value="CN">人民币 (CNY)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="transactionType" className="text-right">
            类型
          </Label>
          <Select
            key={type}
            value={type}
            onValueChange={(value: 'buy' | 'sell' | 'deposit' | 'withdrawal') => setType(value)}
          >
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder="选择类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buy">买入</SelectItem>
              <SelectItem value="sell">卖出</SelectItem>
              <SelectItem value="deposit">入金</SelectItem>
              <SelectItem value="withdrawal">出金</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {type === 'deposit' || type === 'withdrawal' ? (
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              金额 ({getCurrencySymbol(currencyType)})
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
              className="col-span-3"
              placeholder={`请输入金额 (${getCurrencySymbol(currencyType)})`}
              required
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="symbol" className="text-right">
                {isFund ? '基金代码' : '股票代码'}
              </Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSymbol(e.target.value)}
                className="col-span-3"
                placeholder={isFund ? '请输入基金代码，如 110011' : '请输入股票代码，如 AAPL'}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                {isFund ? '份额' : '数量'}
              </Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(e.target.value)}
                className="col-span-3"
                placeholder={isFund ? '请输入基金份额' : '请输入数量'}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                {isFund ? `单位净值 (${getCurrencySymbol(marketType)})` : '价格'}
              </Label>
              <Input
                id="price"
                type="number"
                step={isFund ? '0.0001' : '0.01'}
                value={price}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(e.target.value)}
                className="col-span-3"
                placeholder={isFund ? `请输入单位净值 (${getCurrencySymbol(marketType)})` : '请输入价格'}
                required
              />
            </div>
          </>
        )}

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="tradeTime" className="text-right">
            交易时间
          </Label>
          <Input
            id="tradeTime"
            type="datetime-local"
            value={tradeTime}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTradeTime(e.target.value)}
            className="col-span-3"
            placeholder="请选择交易时间"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="description" className="text-right">
            描述
          </Label>
          <Input
            id="description"
            value={description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
            className="col-span-3"
            placeholder="请输入交易描述"
          />
        </div>
      </div>
    </Modal>
  );
}
