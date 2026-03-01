/**
 * Chat Storage Service
 *
 * 统一聊天存储服务，封装所有聊天相关的业务逻辑
 * 对应原有的 ClientService 层，但使用服务端 Repository
 */
import {
  sessionRepository,
  sessionGroupRepository,
  topicRepository,
  messageRepository,
  threadRepository,
  fileRepository,
  pluginRepository,
  type CreateSessionParams,
  type UpdateSessionParams,
  type CreateTopicParams,
  type UpdateTopicParams,
  type CreateMessageParams,
  type UpdateMessageParams,
  type QueryMessageParams,
  type CreateThreadParams,
  type UpdateThreadParams,
  type CreateFileParams,
  type CreatePluginParams,
} from '@server/repository/chat';
import type { ChatMessage } from '@drizzle/schema/chat';
import { INBOX_SESSION_ID } from '@/app/const/session';

export class ChatStorageService {
  // ============== Session Operations ==============

  /**
   * 创建会话
   */
  async createSession(userId: number, data: CreateSessionParams): Promise<string> {
    return sessionRepository.create({ ...data, userId });
  }

  /**
   * 获取用户的所有会话
   */
  async getSessions(userId: number) {
    return sessionRepository.findByUserId(userId);
  }

  /**
   * 根据 ID 获取会话
   * 如果 id 是 'inbox'，则使用 slug 查询对应的会话
   */
  async getSession(id: string) {
    if (id === INBOX_SESSION_ID) {
      return sessionRepository.findBySlug(INBOX_SESSION_ID);
    }
    return sessionRepository.findById(id);
  }

  /**
   * 根据 slug 获取会话
   */
  async getSessionBySlug(slug: string) {
    return sessionRepository.findBySlug(slug);
  }

  /**
   * 获取用户的置顶会话
   */
  async getPinnedSessions(userId: number) {
    return sessionRepository.findPinnedByUserId(userId);
  }

  /**
   * 更新会话
   */
  async updateSession(id: string, data: UpdateSessionParams): Promise<boolean> {
    return sessionRepository.update(id, data);
  }

  /**
   * 更新会话配置
   */
  async updateSessionConfig(
    id: string,
    config: Record<string, unknown>
  ): Promise<boolean> {
    return sessionRepository.updateConfig(id, config as any);
  }

  /**
   * 更新会话元数据
   */
  async updateSessionMeta(
    id: string,
    meta: { title?: string; description?: string; avatar?: string }
  ): Promise<boolean> {
    return sessionRepository.updateMeta(id, meta as any);
  }

  /**
   * 切换会话置顶状态
   */
  async toggleSessionPinned(id: string): Promise<boolean> {
    return sessionRepository.togglePinned(id);
  }

  /**
   * 删除会话（级联删除话题和消息）
   */
  async deleteSession(id: string): Promise<boolean> {
    return sessionRepository.delete(id);
  }

  /**
   * 批量删除会话
   */
  async deleteSessions(ids: string[]): Promise<void> {
    return sessionRepository.deleteMany(ids);
  }

  // ============== Session Group Operations ==============

  /**
   * 获取所有会话分组
   */
  async getSessionGroups() {
    return sessionGroupRepository.findAll();
  }

  /**
   * 创建会话分组
   */
  async createSessionGroup(data: { name: string; sort?: number }): Promise<string> {
    return sessionGroupRepository.create(data);
  }

  /**
   * 更新会话分组
   */
  async updateSessionGroup(
    id: string,
    data: { name?: string; sort?: number }
  ): Promise<boolean> {
    return sessionGroupRepository.update(id, data);
  }

  /**
   * 删除会话分组
   */
  async deleteSessionGroup(id: string): Promise<boolean> {
    return sessionGroupRepository.delete(id);
  }

  // ============== Topic Operations ==============

  /**
   * 创建话题
   */
  async createTopic(data: CreateTopicParams): Promise<string> {
    return topicRepository.create(data);
  }

  /**
   * 获取会话的所有话题
   */
  async getTopics(sessionId: string) {
    return topicRepository.findBySessionId(sessionId);
  }

  /**
   * 根据 ID 获取话题
   */
  async getTopic(id: string) {
    return topicRepository.findById(id);
  }

  /**
   * 获取收藏的话题
   */
  async getFavoriteTopics(sessionId: string) {
    return topicRepository.findFavorites(sessionId);
  }

  /**
   * 更新话题
   */
  async updateTopic(id: string, data: UpdateTopicParams): Promise<boolean> {
    return topicRepository.update(id, data);
  }

  /**
   * 更新话题标题
   */
  async updateTopicTitle(id: string, title: string): Promise<boolean> {
    return topicRepository.updateTitle(id, title);
  }

  /**
   * 切换话题收藏状态
   */
  async toggleTopicFavorite(id: string): Promise<boolean> {
    return topicRepository.toggleFavorite(id);
  }

  /**
   * 删除话题（级联删除消息）
   */
  async deleteTopic(id: string): Promise<boolean> {
    return topicRepository.delete(id);
  }

  /**
   * 批量删除话题
   */
  async deleteTopics(ids: string[]): Promise<number> {
    return topicRepository.deleteMany(ids);
  }

  // ============== Message Operations ==============

  /**
   * 创建消息
   */
  async createMessage(data: CreateMessageParams): Promise<string> {
    return messageRepository.create(data);
  }

  /**
   * 批量创建消息
   */
  async batchCreateMessages(messages: CreateMessageParams[]): Promise<string[]> {
    return messageRepository.batchCreate(messages);
  }

  /**
   * 获取消息列表
   */
  async getMessages(params: QueryMessageParams): Promise<ChatMessage[]> {
    return messageRepository.query(params);
  }

  /**
   * 根据 ID 获取消息
   */
  async getMessage(id: string) {
    return messageRepository.findById(id);
  }

  /**
   * 获取会话的所有消息
   */
  async getMessagesBySessionId(sessionId: string): Promise<ChatMessage[]> {
    return messageRepository.findBySessionId(sessionId);
  }

  /**
   * 获取话题的所有消息
   */
  async getMessagesByTopicId(topicId: string): Promise<ChatMessage[]> {
    return messageRepository.findByTopicId(topicId);
  }

  /**
   * 更新消息
   */
  async updateMessage(id: string, data: UpdateMessageParams): Promise<boolean> {
    return messageRepository.update(id, data);
  }

  /**
   * 更新消息内容
   */
  async updateMessageContent(id: string, content: string): Promise<boolean> {
    return messageRepository.updateContent(id, content);
  }

  /**
   * 更新消息错误信息
   */
  async updateMessageError(id: string, error: unknown): Promise<boolean> {
    return messageRepository.updateError(id, error);
  }

  /**
   * 更新消息点赞状态
   */
  async updateMessageLikeStatus(
    id: string,
    userLikeTag: 'like' | 'dislike' | 'unknown',
    dislikeReason?: string
  ): Promise<boolean> {
    return messageRepository.updateLikeStatus(id, userLikeTag, dislikeReason);
  }

  /**
   * 绑定消息到话题
   */
  async bindMessagesToTopic(
    messageIds: string[],
    topicId: string
  ): Promise<number> {
    return messageRepository.bindToTopic(messageIds, topicId);
  }

  /**
   * 删除消息
   */
  async deleteMessage(id: string): Promise<boolean> {
    return messageRepository.delete(id);
  }

  /**
   * 批量删除消息
   */
  async deleteMessages(ids: string[]): Promise<number> {
    return messageRepository.deleteMany(ids);
  }

  /**
   * 删除会话-话题下的所有消息
   */
  async deleteMessagesBySessionAndTopic(
    sessionId: string,
    topicId?: string | null
  ): Promise<number> {
    return messageRepository.deleteBySessionAndTopic(sessionId, topicId);
  }

  /**
   * 统计消息数量
   */
  async countMessages(sessionId?: string, topicId?: string): Promise<number> {
    return messageRepository.count(sessionId, topicId);
  }

  /**
   * 检查是否有消息
   */
  async hasMessages(): Promise<boolean> {
    return messageRepository.hasMessages();
  }

  // ============== Thread Operations ==============

  /**
   * 创建线程
   */
  async createThread(data: CreateThreadParams): Promise<string> {
    return threadRepository.create(data);
  }

  /**
   * 获取话题的所有线程
   */
  async getThreads(topicId: string) {
    return threadRepository.findByTopicId(topicId);
  }

  /**
   * 获取活跃线程
   */
  async getActiveThreads(topicId: string) {
    return threadRepository.findActiveByTopicId(topicId);
  }

  /**
   * 根据 ID 获取线程
   */
  async getThread(id: string) {
    return threadRepository.findById(id);
  }

  /**
   * 更新线程状态
   */
  async updateThreadStatus(
    id: string,
    status: 'active' | 'deprecated' | 'archived'
  ): Promise<boolean> {
    return threadRepository.updateStatus(id, status);
  }

  /**
   * 更新线程最后活跃时间
   */
  async touchThread(id: string): Promise<boolean> {
    return threadRepository.touch(id);
  }

  /**
   * 删除线程
   */
  async deleteThread(id: string): Promise<boolean> {
    return threadRepository.delete(id);
  }

  // ============== File Operations ==============

  /**
   * 创建文件记录
   */
  async createFile(data: CreateFileParams): Promise<string> {
    return fileRepository.create(data);
  }

  /**
   * 批量创建文件记录
   */
  async batchCreateFiles(files: CreateFileParams[]): Promise<string[]> {
    return fileRepository.batchCreate(files);
  }

  /**
   * 根据消息 ID 获取文件
   */
  async getFilesByMessageId(messageId: string) {
    return fileRepository.findByMessageId(messageId);
  }

  /**
   * 根据会话 ID 获取所有文件
   */
  async getFilesBySessionId(sessionId: string) {
    return fileRepository.findBySessionId(sessionId);
  }

  /**
   * 关联文件到消息
   */
  async bindFilesToMessage(
    fileIds: string[],
    messageId: string
  ): Promise<number> {
    return fileRepository.bindToMessage(fileIds, messageId);
  }

  /**
   * 删除文件
   */
  async deleteFile(id: string): Promise<boolean> {
    return fileRepository.delete(id);
  }

  /**
   * 批量删除文件
   */
  async deleteFiles(ids: string[]): Promise<number> {
    return fileRepository.deleteMany(ids);
  }

  // ============== Plugin Operations ==============

  /**
   * 创建插件
   */
  async createPlugin(data: CreatePluginParams): Promise<string> {
    return pluginRepository.create(data);
  }

  /**
   * 获取所有插件
   */
  async getPlugins() {
    return pluginRepository.findAll();
  }

  /**
   * 根据标识符获取插件
   */
  async getPluginByIdentifier(identifier: string) {
    return pluginRepository.findByIdentifier(identifier);
  }

  /**
   * 更新插件设置
   */
  async updatePluginSettings(
    id: string,
    settings: Record<string, unknown>
  ): Promise<boolean> {
    return pluginRepository.updateSettings(id, settings);
  }

  /**
   * 删除插件
   */
  async deletePlugin(id: string): Promise<boolean> {
    return pluginRepository.delete(id);
  }

  /**
   * 根据标识符删除插件
   */
  async deletePluginByIdentifier(identifier: string): Promise<boolean> {
    return pluginRepository.deleteByIdentifier(identifier);
  }
}

// Export singleton instance
export const chatStorageService = new ChatStorageService();