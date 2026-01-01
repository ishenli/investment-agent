export type AdviceType = {
  id: string;
  title: string;
  description: string;
  recommended: boolean;
};

export type RecommendationType = {
  id: string;
  assetId: string;
  assetSymbol: string;
  assetName: string;
  amount: number;
  correlation: number;
  liquidityScore: number;
  reason: string;
};
