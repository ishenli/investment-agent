/**
 * Agent Repository
 *
 * Agent 数据访问层，继承 BaseIntRepository
 */
import { BaseIntRepository, type BaseEntity } from './base';
import { agent } from '@drizzle/schema';
import { eq, and } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

/**
 * Agent 实体类型
 */
export type AgentEntity = typeof agent.$inferSelect;

/**
 * Agent 创建数据类型
 */
export type CreateAgentData = Omit<AgentEntity, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Agent 更新数据类型
 */
export type UpdateAgentData = Partial<Omit<AgentEntity, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * Agent Repository
 *
 * 提供 Agent 表的数据访问操作
 */
export class AgentRepository extends BaseIntRepository<AgentEntity> {
  constructor() {
    super(agent);
  }

  /**
   * 根据 slug 查找 Agent
   */
  async findBySlug(slug: string): Promise<AgentEntity | null> {
    return this.findOne(eq(agent.slug, slug));
  }

  /**
   * 根据 isBuiltin 标志查找 Agent 列表
   */
  async findByIsBuiltin(isBuiltin: boolean): Promise<AgentEntity[]> {
    return this.findMany(eq(agent.isBuiltin, isBuiltin));
  }

  /**
   * 检查指定 slug 和 isBuiltin 标志的 Agent 是否存在
   */
  async existsBySlugAndIsBuiltin(slug: string, isBuiltin: boolean): Promise<boolean> {
    return this.exists(
      and(eq(agent.slug, slug), eq(agent.isBuiltin, isBuiltin))!
    );
  }

  /**
   * 根据 slug 更新 Agent
   */
  async updateBySlug(slug: string, data: UpdateAgentData): Promise<AgentEntity | null> {
    const existing = await this.findBySlug(slug);
    if (!existing) return null;
    return this.update(existing.id, data);
  }

  /**
   * 根据 slug 删除 Agent
   */
  async deleteBySlug(slug: string): Promise<boolean> {
    const existing = await this.findBySlug(slug);
    if (!existing) return false;
    return this.delete(existing.id);
  }

  /**
   * 查询所有非内置 Agent（用户自定义）
   */
  async findCustomAgents(): Promise<AgentEntity[]> {
    return this.findByIsBuiltin(false);
  }

  /**
   * 查询所有内置 Agent
   */
  async findBuiltinAgents(): Promise<AgentEntity[]> {
    return this.findByIsBuiltin(true);
  }
}

// 导出单例实例
export const agentRepository = new AgentRepository();