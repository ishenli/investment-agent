export interface AgentStatusEntry {
  /** 状态消息内容 */
  message: string;
  /** 节点/步骤名 */
  step?: string;
  /** 进度 0-100 */
  progress?: number;
  /** 时间戳 */
  timestamp: number;
}

export interface StockChatState {
  messages: any[];
  /** Agent 执行进度日志（status 事件） */
  statusLog: AgentStatusEntry[];
  requestAbortController?: AbortController;
  loading: boolean;
}

export const initialStockChatState: StockChatState = {
  messages: [],
  statusLog: [],
  loading: false,
};
