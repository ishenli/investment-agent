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
import { CURRENCY_SYMBOLS, EXCHANGE_RATES } from '@shared/constant';
import { TransactionRecordBaseType, TransactionType } from '@/types';
import { AssetType, MarketType } from '@typings/asset';
import { useState } from 'react';
import { Alert, AlertTitle } from './ui/alert';
import { AlertCircleIcon } from 'lucide-react';

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}


export function AddTransactionDialog({ open, onOpenChange }: AddTransactionDialogProps) {
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
  const addTransaction = useAssetStore((state) => state.addTransaction);
  const addTransactionsError = useAssetStore((state) => state.addTransactionsError);
  

  // 获取当前市场对应的货币符号
  const getCurrencySymbol = (market: MarketType) => {
    return CURRENCY_SYMBOLS[market] || '$';
  };

  // 将金额转换为美元
  const convertToUSD = (amount: number, market: MarketType): number => {
    switch (market) {
      case 'HK':
        return amount * EXCHANGE_RATES.HKD_TO_USD;
      case 'CN':
        return amount * EXCHANGE_RATES.CNY_TO_USD;
      default:
        return amount; // USD 不需要转换
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 将前端类型映射到后端类型
      let transactionData: any; // 使用 any 类型以避免类型检查问题

      // 处理出入金
      if (type === 'deposit' || type === 'withdrawal') {
        const originalAmount = parseFloat(amount);
        const usdAmount = convertToUSD(originalAmount, marketType);

        transactionData = {
          type: type,
          amount: usdAmount,
          description,
          market: marketType,
          tradeTime: tradeTime ? new Date(tradeTime) : undefined,
        };
      } else {
        // 对于买入和卖出，我们需要计算总金额
        const originalQuantity = parseFloat(quantity);
        const originalPrice = parseFloat(price);
        const originalTotalAmount = originalQuantity * originalPrice;
        const usdTotalAmount = convertToUSD(originalTotalAmount, marketType);
        const usdPrice = convertToUSD(originalPrice, marketType);

        transactionData = {
          type,
          amount: usdTotalAmount,
          description,
          symbol,
          quantity: originalQuantity,
          price: usdPrice,
          sector: assetType,
          market: marketType,
          tradeTime: tradeTime ? new Date(tradeTime) : undefined,
        };
      }

      await addTransaction(transactionData);
      // 重置表单
      setType('buy');
      setMarketType('US');
      setAmount('');
      setQuantity('');
      setPrice('');
      setSymbol('');
      setDescription('');
      setTradeTime('');
      onOpenChange(false);
      fetchTransactions();
    } catch (error) {
      console.error('Failed to add transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="添加交易记录"
      onSubmit={handleSubmit}
      submitText={loading ? '添加中...' : '添加交易'}
      cancelText="取消"
    >
      <div className="grid gap-4">
        { addTransactionsError && <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>请求参数错误.</AlertTitle>
        </Alert>}
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="market" className="text-right">
            市场类型
          </Label>
          <Select value={marketType} onValueChange={(value: MarketType) => setMarketType(value)}>
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
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="type" className="text-right">
            资产类型
          </Label>
          <Select value={assetType} onValueChange={(value: AssetType) => setAssetType(value)}>
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
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="type" className="text-right">
            类型
          </Label>
          <Select
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
              金额 ({getCurrencySymbol(marketType)})
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
              className="col-span-3"
              placeholder={`请输入金额 (${getCurrencySymbol(marketType)})`}
              required
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="symbol" className="text-right">
                股票代码
              </Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSymbol(e.target.value)}
                className="col-span-3"
                placeholder="请输入股票代码，如 AAPL"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                数量
              </Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(e.target.value)}
                className="col-span-3"
                placeholder="请输入数量"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                价格 ({getCurrencySymbol(marketType)})
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(e.target.value)}
                className="col-span-3"
                placeholder={`请输入价格 (${getCurrencySymbol(marketType)})`}
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