import { StockStoreState } from '../../initialState';

export const currentMessage = (s: StockStoreState) => s.messages;
export const isLoading = (s: StockStoreState) => s.loading;

export const stockChatSelectors = {
  isLoading,
  currentMessage,
};
