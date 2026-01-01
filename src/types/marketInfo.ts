
// 定义 AssetMetaDetails 类型，包含资产元数据的详细信息
export type AssetMetaDetails = {
  id: number;
  symbol: string;
  chineseName: string | null;
};

export type AssetMarketInfoType = {
  id: number;
  assetMetaIds: number[];
  assetMetas: AssetMetaDetails[]; // 添加资产元数据详细信息
  title: string;
  symbol: string;
  sentiment: string;
  importance: string;
  summary: string;
  keyTopics: string | null;
  marketImpact: string;
  keyDataPoints: string | null;
  sourceUrl: string | null;
  sourceName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateAssetMarketInfoRequest = {
  assetMetaIds: number[];
  title: string;
  symbol: string;
  sentiment: string;
  importance: string;
  summary: string;
  keyTopics?: string;
  marketImpact: string;
  keyDataPoints?: string;
  sourceUrl?: string;
  sourceName?: string;
};
