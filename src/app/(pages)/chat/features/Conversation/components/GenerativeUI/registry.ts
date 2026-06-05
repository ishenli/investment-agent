import { type ComponentType, lazy } from 'react';

import type { UIArtifactType } from './schemas';

type ArtifactComponentMap = Record<UIArtifactType, ComponentType<any>>;

export const ARTIFACT_COMPONENTS: Partial<ArtifactComponentMap> = {
  stock_quote_card: lazy(() => import('./StockQuoteCard')),
  fund_detail_panel: lazy(() => import('./FundDetailPanel')),
  data_chart: lazy(() => import('./DataChart')),
  trade_intent_card: lazy(() => import('./TradeIntentCard')),
};

export function getArtifactComponent(type: string): ComponentType<any> | undefined {
  return (ARTIFACT_COMPONENTS as Record<string, ComponentType<any>>)[type];
}
