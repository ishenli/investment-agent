/**
 * Agent Service
 *
 * Agent 业务逻辑层，处理 Agent 初始化、查询和管理操作
 */
import { db } from '@server/lib/db';
import { agent } from '@/drizzle/schema';
import { eq, asc } from 'drizzle-orm';
import logger from '@server/base/logger';
import { agentRepository, type AgentEntity, type CreateAgentData } from '@server/repository/agentRepository';
import { BUILTIN_AGENTS_CONFIG, BUILTIN_AGENT_SLUGS } from '@/shared/config/builtinAgents';
import {
  AgentTypeResponse,
  CreateAgentRequestType,
  UpdateAgentRequestType,
} from '@typings/agent';

/**
 * 检查是否为内置 Agent slug
 */
export function isBuiltinAgentSlug(slug: string): boolean {
  return BUILTIN_AGENT_SLUGS.includes(slug);
}

/**
 * 将 AgentEntity 转换为响应类型
 */
function toAgentResponse(entity: AgentEntity): AgentTypeResponse {
  return {
    id: entity.id,
    slug: entity.slug,
    name: entity.name,
    description: entity.description,
    systemRole: entity.systemRole,
    logo: entity.logo,
    openingQuestions: entity.openingQuestions as string[],
    type: entity.type as 'LOCAL' | 'LINGXI',
    isBuiltin: entity.isBuiltin,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

export class AgentService {
  constructor() {
    // 数据库连接已经在 db.ts 中初始化
  }

  // ============== 内置 Agent 初始化 ==============

  /**
   * 初始化内置 Agent（幂等）
   *
   * 在系统启动时调用，检查并创建缺失的内置 Agent
   */
  async initializeBuiltinAgents(): Promise<void> {
    logger.info('[AgentService] Starting builtin agents initialization...');

    let created = 0;
    let skipped = 0;

    for (const config of BUILTIN_AGENTS_CONFIG) {
      try {
        // 检查是否已存在
        const exists = await agentRepository.existsBySlugAndIsBuiltin(config.slug, true);

        if (exists) {
          skipped++;
          logger.debug(`[AgentService] Builtin agent "${config.slug}" already exists, skipping.`);
          continue;
        }

        // 创建内置 Agent
        const createData: CreateAgentData = {
          slug: config.slug,
          name: config.name,
          description: config.description || null,
          systemRole: config.systemRole || null,
          logo: config.logo || null,
          openingQuestions: config.openingQuestions || [],
          type: 'LOCAL',
          isBuiltin: true,
        };

        await agentRepository.create(createData);
        created++;
        logger.info(`[AgentService] Created builtin agent: ${config.slug}`);
      } catch (error) {
        logger.error(`[AgentService] Failed to create builtin agent "${config.slug}":`, error);
      }
    }

    logger.info(
      `[AgentService] Builtin agents initialization completed. Created: ${created}, Skipped: ${skipped}`
    );
  }

  // ============== 查询操作 ==============

  /**
   * Get agent by ID
   * @param agentId Agent ID
   * @returns Agent
   */
  async getAgent(agentId: number): Promise<AgentTypeResponse | null> {
    try {
      const result = await db.query.agent.findFirst({
        where: eq(agent.id, agentId),
      });

      if (!result) return null;

      return toAgentResponse(result);
    } catch (error) {
      logger.error(`Failed to read agent ${agentId}: ${error}`);
      return null;
    }
  }

  /**
   * 根据 slug 获取 Agent
   *
   * 注意：inbox Agent 不在数据库中，需要特殊处理
   */
  async getAgentBySlug(slug: string): Promise<AgentTypeResponse | null> {
    // inbox 是硬编码的系统基础 Agent，不在数据库中
    if (slug === 'inbox') {
      return null;
    }

    const entity = await agentRepository.findBySlug(slug);
    return entity ? toAgentResponse(entity) : null;
  }

  /**
   * Get all agents
   * @returns List of agents
   */
  async getAllAgents(): Promise<AgentTypeResponse[]> {
    try {
      const results = await db.query.agent.findMany({
        orderBy: [asc(agent.name)],
      });

      return results.map(toAgentResponse);
    } catch (error) {
      logger.error(`Failed to list agents: ${error}`);
      return [];
    }
  }

  /**
   * 获取 Agent 列表（支持按 isBuiltin 过滤）
   *
   * @param options 过滤选项
   */
  async listAgents(options?: { isBuiltin?: boolean }): Promise<AgentTypeResponse[]> {
    try {
      let results;

      if (options?.isBuiltin !== undefined) {
        results = await db.query.agent.findMany({
          where: eq(agent.isBuiltin, options.isBuiltin),
          orderBy: [asc(agent.name)],
        });
      } else {
        results = await db.query.agent.findMany({
          orderBy: [asc(agent.name)],
        });
      }

      return results.map(toAgentResponse);
    } catch (error) {
      logger.error(`Failed to list agents: ${error}`);
      return [];
    }
  }

  /**
   * 获取所有内置 Agent
   */
  async listBuiltinAgents(): Promise<AgentTypeResponse[]> {
    return this.listAgents({ isBuiltin: true });
  }

  /**
   * 获取所有自定义 Agent
   */
  async listCustomAgents(): Promise<AgentTypeResponse[]> {
    return this.listAgents({ isBuiltin: false });
  }

  // ============== 创建操作 ==============

  /**
   * Create a new agent
   * @param request Create agent request data
   * @returns Created agent
   */
  async createAgent(request: CreateAgentRequestType): Promise<AgentTypeResponse> {
    try {
      // 检查 slug 是否为内置 Agent 的 slug
      if (isBuiltinAgentSlug(request.slug)) {
        throw new Error(`Slug "${request.slug}" is reserved for builtin agent`);
      }

      // 检查 slug 是否为 inbox
      if (request.slug === 'inbox') {
        throw new Error('Slug "inbox" is reserved for system agent');
      }

      const [newAgent] = await db
        .insert(agent)
        .values({
          name: request.name,
          slug: request.slug,
          description: request.description,
          systemRole: request.systemRole,
          logo: request.logo,
          openingQuestions: request.openingQuestions || [],
          type: request.type,
          isBuiltin: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      logger.info(`Agent created successfully: ${newAgent.id}`);

      return toAgentResponse(newAgent);
    } catch (error) {
      logger.error(`Failed to create agent: ${error}`);
      throw error;
    }
  }

  // ============== 更新操作 ==============

  /**
   * Update agent
   * @param agentId Agent ID
   * @param request Update request data
   * @returns Updated agent
   */
  async updateAgent(
    agentId: number,
    request: UpdateAgentRequestType,
  ): Promise<AgentTypeResponse | null> {
    try {
      // Check if agent exists
      const existingAgent = await this.getAgent(agentId);
      if (!existingAgent) {
        return null;
      }

      // 对于内置 Agent，只允许更新部分字段
      if (existingAgent.isBuiltin) {
        const [updatedAgent] = await db
          .update(agent)
          .set({
            description: request.description,
            systemRole: request.systemRole,
            logo: request.logo,
            openingQuestions: request.openingQuestions,
            updatedAt: new Date(),
          })
          .where(eq(agent.id, agentId))
          .returning();

        logger.info(`Builtin agent ${agentId} updated (limited fields)`);

        return toAgentResponse(updatedAgent);
      }

      // 自定义 Agent 可以更新所有字段
      const [updatedAgent] = await db
        .update(agent)
        .set({
          name: request.name,
          slug: request.slug,
          description: request.description,
          systemRole: request.systemRole,
          logo: request.logo,
          openingQuestions: request.openingQuestions,
          type: request.type,
          updatedAt: new Date(),
        })
        .where(eq(agent.id, agentId))
        .returning();

      logger.info(`Agent ${agentId} updated successfully`);

      return toAgentResponse(updatedAgent);
    } catch (error) {
      logger.error(`Failed to update agent ${agentId}: ${error}`);
      return null;
    }
  }

  // ============== 删除操作 ==============

  /**
   * Delete agent
   * @param agentId Agent ID
   * @returns boolean indicating success
   */
  async deleteAgent(agentId: number): Promise<{ success: boolean; reason?: string }> {
    try {
      // 检查是否为内置 Agent
      const existingAgent = await this.getAgent(agentId);
      if (!existingAgent) {
        return { success: false, reason: 'Agent not found' };
      }

      if (existingAgent.isBuiltin) {
        return { success: false, reason: 'Cannot delete builtin agent' };
      }

      await db.delete(agent).where(eq(agent.id, agentId));
      logger.info(`Agent ${agentId} deleted successfully`);
      return { success: true };
    } catch (error) {
      logger.error(`Failed to delete agent ${agentId}: ${error}`);
      return { success: false, reason: 'Internal error' };
    }
  }
}

const agentService = new AgentService();

export default agentService;