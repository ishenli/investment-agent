
export type AssetMetaType = {
  id: number;
  symbol: string;
  priceCents: number;
  assetType: 'stock' | 'etf' | 'fund' | 'crypto';
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  source: string;
  market: 'CN' | 'US' | 'HK';
  chineseName: string | null;
  investmentMemo: string | null;
};