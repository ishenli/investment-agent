import { StockChatState, initialStockChatState } from './slices/chat/initialState';

export type StockStoreState = StockChatState;

export const initialState: StockStoreState = {
  ...initialStockChatState,
};
