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

  // 初始化表单数据
  useEffect(() => {
    if (transaction && open) {
      setType(transaction.type);
      setMarketType(transaction.market || 'US');
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
        transactionData = {
          type: type,
          amount: parseFloat(amount),
          description,
          market: marketType,
          tradeTime: tradeTime ? new Date(tradeTime) : undefined,
        };
      } else {
        // 对于买入和卖出，我们需要计算总金额
        const totalAmount = parseFloat(quantity) * parseFloat(price);

        transactionData = {
          type,
          amount: totalAmount,
          description,
          symbol,
          quantity: parseFloat(quantity),
          price: parseFloat(price),
          sector: assetType,
          market: marketType,
          tradeTime: tradeTime ? new Date(tradeTime) : undefined,
        };
      }

      await updateTransaction(transaction.id, transactionData);
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
              金额
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
              className="col-span-3"
              placeholder="请输入金额"
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
                价格
              </Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(e.target.value)}
                className="col-span-3"
                placeholder="请输入价格"
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
