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
import { CURRENCY_SYMBOLS } from '@shared/constant';
import { TransactionType } from '@/types';
import { AssetType, MarketType } from '@typings/asset';
import { useState } from 'react';
import { Alert, AlertTitle } from './ui/alert';
import { AlertCircleIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useExchangeRates } from '@/app/hooks/useExchangeRates';

interface AddTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTransactionDialog({ open, onOpenChange }: AddTransactionDialogProps) {
  const { t } = useTranslation('transaction');
  const [type, setType] = useState<TransactionType>('buy');
  const [assetType, setAssetType] = useState<AssetType>('stock');
  const [marketType, setMarketType] = useState<MarketType>('US');
  const [currencyType, setCurrencyType] = useState<MarketType>('US'); // 资金类型：USD/HKD/CNY
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [tradeTime, setTradeTime] = useState('');
  const [loading, setLoading] = useState(false);
  const addTransaction = useAssetStore((state) => state.addTransaction);
  const addTransactionsError = useAssetStore((state) => state.addTransactionsError);
  const queryClient = useQueryClient();
  const { convertToUSD } = useExchangeRates();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        const usdTotalAmount = convertToUSD(originalTotalAmount, marketToCurrency(marketType));
        const usdPrice = convertToUSD(originalPrice, marketToCurrency(marketType));

        // 人民币基金以 CNY 原始价格存储，不做 USD 转换
        const isCnyFund = assetType === 'fund' && marketType === 'CN';
        const finalPrice = isCnyFund ? originalPrice : usdPrice;
        const finalTotalAmount = isCnyFund ? originalTotalAmount : usdTotalAmount

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

      await addTransaction(transactionData);

      // 失效 React Query 缓存，确保账户余额、持仓、摘要数据得到刷新
      queryClient.invalidateQueries({ queryKey: ['account'] });
      queryClient.invalidateQueries({ queryKey: ['positions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
    
      // 重置表单
      setType('buy');
      setMarketType('US');
      setCurrencyType('US');
      setAmount('');
      setQuantity('');
      setPrice('');
      setSymbol('');
      setDescription('');
      setTradeTime('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to add transaction', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={t('dialog.title')}
      onSubmit={handleSubmit}
      submitText={loading ? t('dialog.submitting') : t('dialog.addButton')}
      cancelText={t('dialog.cancel')}
    >
      <div className="grid gap-4">
        {addTransactionsError && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>请求参数错误.</AlertTitle>
          </Alert>
        )}
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="type" className="text-right">
            {t('dialog.tradeType')}
          </Label>
          <Select
            value={type}
            onValueChange={(value: 'buy' | 'sell' | 'deposit' | 'withdrawal') => setType(value)}
          >
            <SelectTrigger className="col-span-3">
              <SelectValue placeholder={t('dialog.tradeTypePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buy">{t('dialog.type.buy')}</SelectItem>
              <SelectItem value="sell">{t('dialog.type.sell')}</SelectItem>
              <SelectItem value="deposit">{t('dialog.type.deposit')}</SelectItem>
              <SelectItem value="withdrawal">{t('dialog.type.withdrawal')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {type !== 'deposit' && type !== 'withdrawal' && (
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="market" className="text-right">
              {t('dialog.marketType')}
            </Label>
            <Select value={marketType} onValueChange={(value: MarketType) => setMarketType(value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={t('history.market.US')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">{t('history.market.US')}</SelectItem>
                <SelectItem value="HK">{t('history.market.HK')}</SelectItem>
                <SelectItem value="CN">{t('history.market.CN')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {type !== 'deposit' && type !== 'withdrawal' && (
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              {t('dialog.assetType')}
            </Label>
            <Select value={assetType} onValueChange={(value: AssetType) => {
              setAssetType(value);
              if (value === 'fund') {
                setMarketType('CN');
              }
            }}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={t('dialog.tradeTypePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stock">{t('dialog.stock')}</SelectItem>
                <SelectItem value="crypto">{t('dialog.crypto')}</SelectItem>
                <SelectItem value="fund">{t('dialog.fund')}</SelectItem>
                <SelectItem value="etf">{t('dialog.etf')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {type !== 'deposit' && type !== 'withdrawal' && assetType === 'fund' && marketType === 'CN' && (
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="col-span-1" />
            <div className="col-span-3 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 px-3 py-1.5 rounded-md">
              {t('dialog.cnyFundHint', '人民币计价：价格以人民币输入，持仓以人民币展示')}
            </div>
          </div>
        )}
        {(type === 'deposit' || type === 'withdrawal') && (
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="currency" className="text-right">
              {t('dialog.currencyType')}
            </Label>
            <Select key={`currency-${type}`} value={currencyType} onValueChange={(value: MarketType) => setCurrencyType(value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={t('dialog.tradeTypePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="US">美元 (USD)</SelectItem>
                <SelectItem value="HK">港幣 (HKD)</SelectItem>
                <SelectItem value="CN">人民幣 (CNY)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {type === 'deposit' || type === 'withdrawal' ? (
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              {t('dialog.amount')} ({getCurrencySymbol(currencyType)})
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
              className="col-span-3"
              placeholder={`${t('dialog.amount')} (${getCurrencySymbol(currencyType)})`}
              required
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="symbol" className="text-right">
                {isFund ? t('dialog.fundCode') : t('dialog.symbol')}
              </Label>
              <Input
                id="symbol"
                value={symbol}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSymbol(e.target.value)}
                className="col-span-3"
                placeholder={isFund ? t('dialog.fundCodePlaceholder') : t('dialog.symbolPlaceholder')}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">
                {isFund ? t('dialog.fundQuantity') : t('dialog.quantity')}
              </Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuantity(e.target.value)}
                className="col-span-3"
                placeholder={isFund ? t('dialog.fundQuantityPlaceholder') : t('dialog.quantityPlaceholder')}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                {isFund ? t('dialog.fundPrice') : t('dialog.price')} ({getCurrencySymbol(marketType)})
              </Label>
              <Input
                id="price"
                type="number"
                step="0.0001"
                value={price}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(e.target.value)}
                className="col-span-3"
                placeholder={isFund
                  ? t('dialog.fundPricePlaceholder', { symbol: getCurrencySymbol(marketType) })
                  : t('dialog.pricePlaceholder', { symbol: getCurrencySymbol(marketType) })}
                required
              />
            </div>
          </>
        )}

        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="tradeTime" className="text-right">
            {t('dialog.time')}
          </Label>
          <Input
            id="tradeTime"
            type="datetime-local"
            value={tradeTime}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTradeTime(e.target.value)}
            className="col-span-3"
            placeholder={t('dialog.timePlaceholder')}
            required
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="description" className="text-right">
            {t('dialog.description')}
          </Label>
          <Input
            id="description"
            value={description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
            className="col-span-3"
            placeholder={t('dialog.descriptionPlaceholder')}
          />
        </div>
      </div>
    </Modal>
  );
}
