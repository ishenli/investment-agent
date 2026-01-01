import {
  ChatMessage,
  ChatMessageError,
  ChatTTS,
  ChatTranslate,
  CreateMessageParams,
  MessageItem,
  ModelRankItem,
  UpdateMessageParams,
} from '@typings/message';

export interface IMessageService {
  createMessage(data: CreateMessageParams): Promise<string>;
  batchCreateMessages(messages: MessageItem[]): Promise<any>;

  getMessages(sessionId: string, topicId?: string): Promise<ChatMessage[]>;
  getAllMessages(): Promise<ChatMessage[]>;
  getAllMessagesInSession(sessionId: string): Promise<ChatMessage[]>;
  countMessages(params?: {
    endDate?: string;
    range?: [string, string];
    startDate?: string;
  }): Promise<number>;
  countWords(params?: {
    endDate?: string;
    range?: [string, string];
    startDate?: string;
  }): Promise<number>;
  rankModels(): Promise<ModelRankItem[]>;
  updateMessageError(id: string, error: ChatMessageError): Promise<any>;
  updateMessage(id: string, message: Partial<UpdateMessageParams>): Promise<any>;
  updateMessageTTS(id: string, tts: Partial<ChatTTS> | false): Promise<any>;
  updateMessageTranslate(id: string, translate: Partial<ChatTranslate> | false): Promise<any>;
  removeMessage(id: string): Promise<any>;
  removeMessages(ids: string[]): Promise<any>;
  removeMessagesByAssistant(assistantId: string, topicId?: string): Promise<any>;
  removeAllMessages(): Promise<any>;
  messageCountToCheckTrace(): Promise<boolean>;
  hasMessages(): Promise<boolean>;
}
