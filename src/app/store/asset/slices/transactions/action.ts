import { StateCreator } from 'zustand';
import { AssetStore } from '../../types';
import { TransactionRecordType } from '@/types';

export interface AssetTransactionsAction {
  fetchTransactions: (limit?: number, offset?: number) => Promise<void>;
  addTransaction: (
    transaction: Omit<TransactionRecordType, 'id' | 'accountId' | 'createdAt'>,
  ) => Promise<void>;
  updateTransaction: (
    transactionId: string,
    transaction: Partial<Omit<TransactionRecordType, 'id' | 'accountId' | 'createdAt'>>,
  ) => Promise<void>;
  reverseTransaction: (transactionId: string) => Promise<void>;
  setTransactions: (transactions: TransactionRecordType[], totalCount: number) => void;
  setTransactionsLoading: (loading: boolean) => void;
  setTransactionsError: (error: string | null) => void;
}

export const createAssetTransactionsSlice: StateCreator<
  AssetStore,
  [['zustand/devtools', never]],
  [],
  AssetTransactionsAction
> = (set, get) => ({
  fetchTransactions: async (limit: number = 50, offset: number = 0) => {
    set((state: AssetStore) => ({
      ...state,
      transactionsLoading: true,
      transactionsError: null,
    }));
    try {
      const response = await fetch(
        `/api/asset/transactions?limit=${limit}&offset=${offset}`,
      );
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const data = await response.json();
      set((state: AssetStore) => ({
        ...state,
        transactions: data.data.transactions,
        totalCount: data.data.totalCount,
        transactionsLoading: false,
      }));
    } catch (error) {
      set((state: AssetStore) => ({
        ...state,
        transactionsError: (error as Error).message,
        transactionsLoading: false,
      }));
    }
  },

  addTransaction: async (transactionData) => {
    set((state: AssetStore) => ({
      ...state,
      transactionsLoading: true,
      transactionsError: null,
    }));
    try {
      const response = await fetch(`/api/asset/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        throw new Error('Failed to add transaction');
      }

      const newTransactionRep = await response.json();
      if (!newTransactionRep.success) {
        throw new Error(newTransactionRep.message || 'Failed to add transaction');
      }
      const newTransaction = newTransactionRep.data as TransactionRecordType;

      // 更新本地状态
      set((state: AssetStore) => ({
        ...state,
        transactions: [newTransaction, ...state.transactions],
        addTransactionsError: null,
        transactionsLoading: false,
      }));

      // 交易成功后，刷新账户余额和资产摘要数据
      await Promise.all([
        get().fetchAccount(''),
        get().fetchSummary(''),
      ]);
    } catch (error) {
      set((state: AssetStore) => ({
        ...state,
        addTransactionsError: (error as Error).message,
        transactionsLoading: false,
      }));
      throw error;
    }
  },

  updateTransaction: async (transactionId, transactionData) => {
    set((state: AssetStore) => ({
      ...state,
      transactionsLoading: true,
      transactionsError: null,
    }));
    try {
      const response = await fetch(`/api/asset/transactions/${transactionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        throw new Error('Failed to update transaction');
      }

      const updatedTransactionRep = await response.json();
      const updatedTransaction = updatedTransactionRep.data as TransactionRecordType;

      // 更新本地状态
      set((state: AssetStore) => ({
        ...state,
        transactions: state.transactions.map((transaction) =>
          transaction.id === transactionId ? updatedTransaction : transaction,
        ),
        transactionsLoading: false,
      }));

      // 交易更新成功后，刷新账户余额和资产摘要数据
      await Promise.all([
        get().fetchAccount(''),
        get().fetchSummary(''),
      ]);
    } catch (error) {
      set((state: AssetStore) => ({
        ...state,
        transactionsError: (error as Error).message,
        transactionsLoading: false,
      }));
      throw error;
    }
  },

  setTransactions: (transactions: TransactionRecordType[], totalCount: number) => {
    set((state: AssetStore) => ({ ...state, transactions, totalCount }));
  },

  reverseTransaction: async (transactionId: string) => {
    set((state: AssetStore) => ({
      ...state,
      transactionsLoading: true,
      transactionsError: null,
    }));
    try {
      const response = await fetch(`/api/asset/transactions/${transactionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to reverse transaction');
      }

      const rep = await response.json();
      if (!rep.success) {
        throw new Error(rep.message || 'Failed to reverse transaction');
      }

      // 从本地列表移除该条记录
      set((state: AssetStore) => ({
        ...state,
        transactions: state.transactions.filter((t) => t.id !== transactionId),
        transactionsLoading: false,
      }));

      // 刷新账户余额和资产摘要
      await Promise.all([
        get().fetchAccount(''),
        get().fetchSummary(''),
      ]);
    } catch (error) {
      set((state: AssetStore) => ({
        ...state,
        transactionsError: (error as Error).message,
        transactionsLoading: false,
      }));
      throw error;
    }
  },

  setTransactionsLoading: (loading: boolean) => {
    set((state: AssetStore) => ({ ...state, transactionsLoading: loading }));
  },

  setTransactionsError: (error: string | null) => {
    set((state: AssetStore) => ({ ...state, transactionsError: error }));
  },
});
