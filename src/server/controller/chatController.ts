/**
 * Chat Controller
 *
 * 聊天存储控制器，处理聊天会话、话题、消息的 CRUD 操作
 * 注意：参数验证由 Zod schemas 完成，控制器接收的参数已通过验证
 */
import { WithRequestContext } from '../base/decorators';
import logger from '../base/logger';
import authService from '../service/authService';
import { chatStorageService } from '../service/chatStorageService';
import agentService from '../service/agentService';
import { BaseBizController } from './base';

/**
 * 获取当前用户ID（数字类型）
 * authService 返回 string，数据库使用 number
 */
async function getCurrentUserIdAsNumber(): Promise<number | null> {
  const userId = await authService.getCurrentUserId();
  return userId ? parseInt(userId, 10) : null;
}

export class ChatController extends BaseBizController {
  // ============== Session Operations ==============

  @WithRequestContext()
  async getSessions() {
    try {
      const userId = await getCurrentUserIdAsNumber();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      const sessions = await chatStorageService.getSessions(userId);
      return this.success({ sessions });
    } catch (error) {
      return this.error('获取会话列表失败', 'get_sessions_error');
    }
  }

  @WithRequestContext()
  async getSession(param: { id: string }) {
    try {
      const userId = await getCurrentUserIdAsNumber();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      if (!param.id) {
        return this.error('会话ID不能为空', 'validation_error');
      }

      const session = await chatStorageService.getSession(param.id);
      if (!session) {
        return this.error('会话不存在', 'session_not_found');
      }

      // 验证会话所有权
      if (session.userId !== userId) {
        return this.error('无权访问此会话', 'forbidden');
      }

      return this.success({ session });
    } catch (error) {
      return this.error('获取会话失败', 'get_session_error');
    }
  }

  @WithRequestContext()
  async createSession(body: any) {
    try {
      const userId = await getCurrentUserIdAsNumber();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      // 支持通过 agentSlug 从 Agent 创建 Session
      if (body.agentSlug) {
        return await this.createSessionFromAgent(userId, body.agentSlug, body);
      }

      // 传统方式：直接传入 config 和 meta
      if (!body.slug || !body.type || !body.config || !body.meta) {
        return this.error('缺少必要参数', 'validation_error');
      }

      // 检查是否已存在相同 slug 的会话，避免重复创建
      const existingSession = await chatStorageService.getSessionBySlug(body.slug);
      if (existingSession) {
        // 如果已存在，直接返回现有会话 ID（与 SessionModel.createSessionByConfig 行为一致）
        return this.success({ id: existingSession.id, message: '会话已存在' });
      }

      const id = await chatStorageService.createSession(userId, body);
      return this.success({ id, message: '会话创建成功' });
    } catch (error) {
      logger.error('[ChatController] createSession error', error);
      return this.error('创建会话失败', 'create_session_error');
    }
  }

  /**
   * 从 Agent 创建 Session
   */
  private async createSessionFromAgent(userId: number, agentSlug: string, body: any) {
    // 获取 Agent 配置
    const agent = await agentService.getAgentBySlug(agentSlug);

    // 如果不是数据库中的 Agent，检查是否为 inbox
    if (!agent) {
      if (agentSlug === 'inbox') {
        // inbox 是系统内置 Agent，使用默认配置
        const id = await chatStorageService.createSession(userId, {
          slug: body.slug || `inbox-${Date.now()}`,
          type: 'agent',
          agentId: 'inbox',
          config: body.config || {},
          meta: body.meta || { title: 'Investment Advisor' },
        });
        return this.success({ id, message: '会话创建成功' });
      }
      return this.error(`Agent "${agentSlug}" 不存在`, 'agent_not_found');
    }

    // 从 Agent 配置构建 Session 数据
    const sessionData = {
      slug: body.slug || `${agentSlug}-${Date.now()}`,
      type: 'agent' as const,
      agentId: agentSlug,
      config: {
        ...body.config,
        systemRole: agent.systemRole || body.config?.systemRole,
        openingQuestions: agent.openingQuestions?.length > 0 ? agent.openingQuestions : body.config?.openingQuestions,
      },
      meta: body.meta || {
        title: agent.name,
        description: agent.description,
        avatar: agent.logo,
      },
    };

    const id = await chatStorageService.createSession(userId, sessionData);
    return this.success({ id, message: '会话创建成功' });
  }

  @WithRequestContext()
  async updateSession(body: any) {
    try {
      const userId = await getCurrentUserIdAsNumber();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      if (!body.id) {
        return this.error('会话ID不能为空', 'validation_error');
      }

      // 验证会话所有权
      const session = await chatStorageService.getSession(body.id);
      if (!session) {
        return this.error('会话不存在', 'session_not_found');
      }
      if (session.userId !== userId) {
        return this.error('无权修改此会话', 'forbidden');
      }

      const { id, ...updateData } = body;
      const result = await chatStorageService.updateSession(session.id, updateData);

      if (!result) {
        return this.error('更新会话失败', 'update_session_error');
      }

      return this.success({ message: '会话更新成功' });
    } catch (error) {
      logger.error('[ChatController] updateSession error', error);
      return this.error('更新会话失败', 'update_session_error');
    }
  }

  @WithRequestContext()
  async deleteSession(body: { id: string }) {
    try {
      const userId = await getCurrentUserIdAsNumber();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      if (!body.id) {
        return this.error('会话ID不能为空', 'validation_error');
      }

      // 验证会话所有权
      const session = await chatStorageService.getSession(body.id);
      if (!session) {
        return this.error('会话不存在', 'session_not_found');
      }
      if (session.userId !== userId) {
        return this.error('无权删除此会话', 'forbidden');
      }

      const result = await chatStorageService.deleteSession(session.id);
      if (!result) {
        return this.error('删除会话失败', 'delete_session_error');
      }

      return this.success({ message: '会话删除成功' });
    } catch (error) {
      return this.error('删除会话失败', 'delete_session_error');
    }
  }

  // ============== Topic Operations ==============

  @WithRequestContext()
  async getTopics(param: { sessionId: string }) {
    try {
      const userId = await getCurrentUserIdAsNumber();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      if (!param.sessionId) {
        return this.error('会话ID不能为空', 'validation_error');
      }

      // 验证会话所有权
      const session = await chatStorageService.getSession(param.sessionId);
      if (!session) {
        return this.error('会话不存在', 'session_not_found');
      }
      if (session.userId !== userId) {
        return this.error('无权访问此会话', 'forbidden');
      }

      const topics = await chatStorageService.getTopics(session.id);
      return this.success({ topics });
    } catch (error) {
      logger.error('[ChatController] getTopics error', error);
      return this.error('获取话题列表失败', 'get_topics_error');
    }
  }

  @WithRequestContext()
  async createTopic(body: { sessionId: string; title: string; favorite?: boolean; messages?: string[] }) {
    try {
      const userId = await getCurrentUserIdAsNumber();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      if (!body.sessionId || !body.title) {
        return this.error('缺少必要参数', 'validation_error');
      }

      // 验证会话所有权
      const session = await chatStorageService.getSession(body.sessionId);
      if (!session) {
        return this.error('会话不存在', 'session_not_found');
      }
      if (session.userId !== userId) {
        return this.error('无权访问此会话', 'forbidden');
      }

      const id = await chatStorageService.createTopic({
        sessionId: session.id,
        title: body.title,
        favorite: body.favorite,
        messages: body.messages,
      });
      return this.success({ id, message: '话题创建成功' });
    } catch (error) {
      logger.error('[ChatController] createTopic error', error);
      return this.error('创建话题失败', 'create_topic_error');
    }
  }

  @WithRequestContext()
  async updateTopic(body: { id: string; title?: string; favorite?: boolean }) {
    try {
      const userId = await getCurrentUserIdAsNumber();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      if (!body.id) {
        return this.error('话题ID不能为空', 'validation_error');
      }

      // 验证话题所有权（通过会话）
      const topic = await chatStorageService.getTopic(body.id);
      if (!topic) {
        return this.error('话题不存在', 'topic_not_found');
      }

      const session = await chatStorageService.getSession(topic.sessionId);
      if (!session || session.userId !== userId) {
        return this.error('无权修改此话题', 'forbidden');
      }

      const { id, ...updateData } = body;
      const result = await chatStorageService.updateTopic(id, updateData);

      if (!result) {
        return this.error('更新话题失败', 'update_topic_error');
      }

      return this.success({ message: '话题更新成功' });
    } catch (error) {
      return this.error('更新话题失败', 'update_topic_error');
    }
  }

  @WithRequestContext()
  async deleteTopic(body: { id: string }) {
    try {
      const userId = await getCurrentUserIdAsNumber();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      if (!body.id) {
        return this.error('话题ID不能为空', 'validation_error');
      }

      // 验证话题所有权
      const topic = await chatStorageService.getTopic(body.id);
      if (!topic) {
        return this.error('话题不存在', 'topic_not_found');
      }

      const session = await chatStorageService.getSession(topic.sessionId);
      if (!session || session.userId !== userId) {
        return this.error('无权删除此话题', 'forbidden');
      }

      const result = await chatStorageService.deleteTopic(body.id);
      if (!result) {
        return this.error('删除话题失败', 'delete_topic_error');
      }

      return this.success({ message: '话题删除成功' });
    } catch (error) {
      return this.error('删除话题失败', 'delete_topic_error');
    }
  }

  // ============== Message Operations ==============

  @WithRequestContext()
  async getMessages(param: { sessionId: string; topicId?: string; pageSize?: string; cursor?: string }) {
    try {
      const userId = await getCurrentUserIdAsNumber();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      if (!param.sessionId) {
        return this.error('会话ID不能为空', 'validation_error');
      }

      // 验证会话所有权
      const session = await chatStorageService.getSession(param.sessionId);
      if (!session) {
        return this.error('会话不存在', 'session_not_found');
      }
      if (session.userId !== userId) {
        return this.error('无权访问此会话', 'forbidden');
      }

      const messages = await chatStorageService.getMessages({
        sessionId: session.id,
        topicId: param.topicId,
        pageSize: param.pageSize ? parseInt(param.pageSize) : 50,
        cursor: param.cursor,
      });

      return this.success({ messages });
    } catch (error) {
      return this.error('获取消息列表失败', 'get_messages_error');
    }
  }

  @WithRequestContext()
  async createMessage(body: {
    sessionId: string;
    topicId?: string;
    parentId?: string;
    role: 'user' | 'system' | 'assistant' | 'tool';
    content: string;
    files?: string[];
    model?: string;
    provider?: string;
    traceId?: string;
  }) {
    try {
      const userId = await getCurrentUserIdAsNumber();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      if (!body.sessionId || !body.role || !body.content) {
        return this.error('缺少必要参数', 'validation_error');
      }

      // 验证会话所有权
      const session = await chatStorageService.getSession(body.sessionId);
      if (!session) {
        return this.error('会话不存在', 'session_not_found');
      }
      if (session.userId !== userId) {
        return this.error('无权访问此会话', 'forbidden');
      }

      const id = await chatStorageService.createMessage({
        sessionId: session.id,
        topicId: body.topicId,
        role: body.role,
        content: body.content,
        parentId: body.parentId,
        files: body.files,
        model: body.model,
        provider: body.provider,
        traceId: body.traceId,
      });
      return this.success({ id, message: '消息创建成功' });
    } catch (error) {
      logger.error('[ChatController] createMessage error', error);
      return this.error('创建消息失败', 'create_message_error');
    }
  }

  @WithRequestContext()
  async updateMessage(body: { id: string; content?: string; userLikeTag?: 'like' | 'dislike' | 'unknown' }) {
    try {
      const userId = await getCurrentUserIdAsNumber();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      if (!body.id) {
        return this.error('消息ID不能为空', 'validation_error');
      }

      // 验证消息所有权
      const message = await chatStorageService.getMessage(body.id);
      if (!message) {
        return this.error('消息不存在', 'message_not_found');
      }

      const session = await chatStorageService.getSession(message.sessionId);
      if (!session || session.userId !== userId) {
        return this.error('无权修改此消息', 'forbidden');
      }

      const { id, ...updateData } = body;
      const result = await chatStorageService.updateMessage(id, updateData);

      if (!result) {
        return this.error('更新消息失败', 'update_message_error');
      }

      return this.success({ message: '消息更新成功' });
    } catch (error) {
      return this.error('更新消息失败', 'update_message_error');
    }
  }

  @WithRequestContext()
  async deleteMessage(body: { id: string }) {
    try {
      const userId = await getCurrentUserIdAsNumber();
      if (!userId) {
        return this.error('用户未登录', 'unauthorized');
      }

      if (!body.id) {
        return this.error('消息ID不能为空', 'validation_error');
      }

      // 验证消息所有权
      const message = await chatStorageService.getMessage(body.id);
      if (!message) {
        return this.error('消息不存在', 'message_not_found');
      }

      const session = await chatStorageService.getSession(message.sessionId);
      if (!session || session.userId !== userId) {
        return this.error('无权删除此消息', 'forbidden');
      }

      const result = await chatStorageService.deleteMessage(body.id);
      if (!result) {
        return this.error('删除消息失败', 'delete_message_error');
      }

      return this.success({ message: '消息删除成功' });
    } catch (error) {
      return this.error('删除消息失败', 'delete_message_error');
    }
  }
}