import { AssetAccountAction } from './slices/account/action';
import { AssetAccountState } from './slices/account/initialState';
import { AssetTransactionsAction } from './slices/transactions/action';
import { AssetTransactionsState } from './slices/transactions/initialState';
import { AssetRevenueAction } from './slices/revenue/action';
import { AssetRevenueState } from './slices/revenue/initialState';
import { AssetSummaryAction } from './slices/summary/action';
import { AssetSummaryState } from './slices/summary/initialState';

export type AssetStore = AssetAccountState &
  AssetAccountAction &
  AssetTransactionsState &
  AssetTransactionsAction &
  AssetRevenueState &
  AssetRevenueAction &
  AssetSummaryState &
  AssetSummaryAction;
