import { AssetAccountState, initialAssetAccountState } from './slices/account/initialState';
import {
  AssetTransactionsState,
  initialAssetTransactionsState,
} from './slices/transactions/initialState';
import { AssetRevenueState, initialAssetRevenueState } from './slices/revenue/initialState';
import { AssetSummaryState, initialAssetSummaryState } from './slices/summary/initialState';

export type AssetStoreState = AssetAccountState &
  AssetTransactionsState &
  AssetRevenueState &
  AssetSummaryState;

export const initialState: AssetStoreState = {
  ...initialAssetAccountState,
  ...initialAssetTransactionsState,
  ...initialAssetRevenueState,
  ...initialAssetSummaryState,
};
