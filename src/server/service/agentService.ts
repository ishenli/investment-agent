import { db } from '@server/lib/db';
import { agent } from '@/drizzle/schema';
import { eq, like, asc, desc } from 'drizzle-orm';
import logger from '@server/base/logger';
import {
  AgentType,
  AgentTypeResponse,
  CreateAgentRequestType,
  UpdateAgentRequestType,
} from '@typings/agent';

export class AgentService {
  constructor() {
    // 数据库连接已经在 db.ts 中初始化
  }

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

      return {
        id: result.id,
        slug: result.slug,
        name: result.name,
        description: result.description,
        systemRole: result.systemRole,
        logo: result.logo,
        apiKey: result.apiKey,
        apiUrl: result.apiUrl,
        openingQuestions: result.openingQuestions as string[],
        type: result.type as 'LOCAL' | 'LINGXI',
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      };
    } catch (error) {
      logger.error(`Failed to read agent ${agentId}: ${error}`);
      return null;
    }
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

      return results.map((result) => ({
        id: result.id,
        slug: result.slug,
        name: result.name,
        description: result.description,
        systemRole: result.systemRole,
        logo: result.logo,
        apiKey: result.apiKey,
        apiUrl: result.apiUrl,
        openingQuestions: result.openingQuestions as string[],
        type: result.type as 'LOCAL' | 'LINGXI',
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      }));
    } catch (error) {
      logger.error(`Failed to list agents: ${error}`);
      return [];
    }
  }

  /**
   * Create a new agent
   * @param request Create agent request data
   * @returns Created agent
   */
  async createAgent(request: CreateAgentRequestType): Promise<AgentTypeResponse> {
    try {
      const [newAgent] = await db
        .insert(agent)
        .values({
          name: request.name,
          slug: request.slug,
          description: request.description,
          systemRole: request.systemRole,
          logo: request.logo,
          apiKey: request.apiKey,
          apiUrl: request.apiUrl,
          openingQuestions: request.openingQuestions || [],
          type: request.type,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      logger.info(`Agent created successfully: ${newAgent.id}`);

      return {
        id: newAgent.id,
        slug: newAgent.slug,
        name: newAgent.name,
        description: newAgent.description,
        systemRole: newAgent.systemRole,
        logo: newAgent.logo,
        apiKey: newAgent.apiKey,
        apiUrl: newAgent.apiUrl,
        openingQuestions: newAgent.openingQuestions as string[],
        type: newAgent.type as 'LOCAL' | 'LINGXI',
        createdAt: newAgent.createdAt.toISOString(),
        updatedAt: newAgent.updatedAt.toISOString(),
      };
    } catch (error) {
      logger.error(`Failed to create agent: ${error}`);
      throw error;
    }
  }

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

      const [updatedAgent] = await db
        .update(agent)
        .set({
          name: request.name,
          slug: request.slug,
          description: request.description,
          systemRole: request.systemRole,
          logo: request.logo,
          apiKey: request.apiKey,
          apiUrl: request.apiUrl,
          openingQuestions: request.openingQuestions,
          type: request.type,
          updatedAt: new Date(),
        })
        .where(eq(agent.id, agentId))
        .returning();

      logger.info(`Agent ${agentId} updated successfully`);

      return {
        id: updatedAgent.id,
        slug: updatedAgent.slug,
        name: updatedAgent.name,
        description: updatedAgent.description,
        systemRole: updatedAgent.systemRole,
        logo: updatedAgent.logo,
        apiKey: updatedAgent.apiKey,
        apiUrl: updatedAgent.apiUrl,
        openingQuestions: updatedAgent.openingQuestions as string[],
        type: updatedAgent.type as 'LOCAL' | 'LINGXI',
        createdAt: updatedAgent.createdAt.toISOString(),
        updatedAt: updatedAgent.updatedAt.toISOString(),
      };
    } catch (error) {
      logger.error(`Failed to update agent ${agentId}: ${error}`);
      return null;
    }
  }

  /**
   * Delete agent
   * @param agentId Agent ID
   * @returns boolean indicating success
   */
  async deleteAgent(agentId: number): Promise<boolean> {
    try {
      await db.delete(agent).where(eq(agent.id, agentId));
      logger.info(`Agent ${agentId} deleted successfully`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete agent ${agentId}: ${error}`);
      return false;
    }
  }
}

const agentService = new AgentService();

export default agentService;
