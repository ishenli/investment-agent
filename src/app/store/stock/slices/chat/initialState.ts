
export interface StockChatState {
  messages: any[];
  requestAbortController?: AbortController;
  loading: boolean;
}

export const initialStockChatState: StockChatState = {
  messages: [],
  loading: false,
};
