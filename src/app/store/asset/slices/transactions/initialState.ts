import { TransactionRecordType } from '@typings/transaction';

export interface AssetTransactionsState {
  transactions: TransactionRecordType[];
  totalCount: number;
  transactionsLoading: boolean;
  transactionsError: string | null;
  addTransactionsError: string | null;
}

export const initialAssetTransactionsState: AssetTransactionsState = {
  transactions: [],
  totalCount: 0,
  transactionsLoading: false,
  transactionsError: null,
  addTransactionsError: null,
};
