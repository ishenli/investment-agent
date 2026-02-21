// 内容处理模式：ai_summary（AI摘要）或 original（原文保留）
export type ContentMode = 'ai_summary' | 'original';

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
  originalContent: string | null; // 原始文章内容（原文保留模式）
  contentMode: ContentMode; // 内容处理模式
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
  originalContent?: string; // 原始文章内容（原文保留模式）
  contentMode: ContentMode; // 内容处理模式
};
