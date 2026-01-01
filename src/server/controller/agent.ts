import { WithRequestContext } from '@server/base/decorators';
import agentService from '@server/service/agentService';
import logger from '@server/base/logger';
import { z } from 'zod';
import { BaseBizController } from './base';
import type {
  AgentTypeResponse,
  CreateAgentRequestType,
  UpdateAgentRequestType
} from '@typings/agent';

// 定义 agent 数据的 Zod 验证模式
const AgentSchema = z.object({
  id: z.number().optional(),
  slug: z.string().min(1, 'Slug 不能为空'),
  name: z.string().min(1, '名称不能为空'),
  description: z.string().nullable().optional(),
  systemRole: z.string().nullable().optional(),
  logo: z.string().nullable().optional(),
  apiKey: z.string().min(1, 'API密钥不能为空'),
  apiUrl: z.string().min(1, 'API地址不能为空'),
  openingQuestions: z.array(z.string()).optional().default([]),
  type: z.enum(['LOCAL', 'LINGXI']),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

const CreateAgentRequestSchema = AgentSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

const UpdateAgentRequestSchema = AgentSchema.partial().omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export class AgentBizController extends BaseBizController {
  @WithRequestContext()
  async createAgent(body: CreateAgentRequestType) {
    try {
      // 1. 参数验证
      const validationResult = CreateAgentRequestSchema.safeParse(body);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }
      const validatedBody = validationResult.data;

      // 2. 创建 Agent
      const result = await agentService.createAgent(validatedBody);

      // 3. 返回成功响应
      return this.success(result as AgentTypeResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }

      logger.error('[AgentBizController] 创建 Agent 失败:', error);
      return this.error('创建 Agent 失败', 'create_agent_error');
    }
  }

  @WithRequestContext()
  async getAgent(query: { agentId?: string }) {
    try {
      const { agentId } = query;

      if (agentId) {
        // 获取单个 Agent 信息
        const id = parseInt(agentId);
        if (isNaN(id)) {
          return this.error('无效的 Agent ID', 'invalid_agent_id');
        }

        const agent = await agentService.getAgent(id);
        if (!agent) {
          return this.error('Agent 不存在', 'agent_not_found');
        }

        return this.success(agent as AgentTypeResponse);
      } else {
        // 获取所有 Agent 列表
        const agents = await agentService.getAllAgents();
        return this.success(agents as AgentTypeResponse[]);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }

      logger.error('[AgentBizController] 获取 Agent 信息失败:', error);
      return this.error('获取 Agent 信息失败', 'get_agent_error');
    }
  }

  @WithRequestContext()
  async updateAgent(request: { agentId?: string } & UpdateAgentRequestType) {
    try {
      const { agentId, ...body } = request;

      if (!agentId) {
        return this.error('缺少 agentId 参数', 'missing_agent_id');
      }

      const id = parseInt(agentId);
      if (isNaN(id)) {
        return this.error('无效的 Agent ID', 'invalid_agent_id');
      }

      // 参数验证
      const validationResult = UpdateAgentRequestSchema.safeParse(body);
      if (!validationResult.success) {
        return this.responseValidateError(validationResult.error);
      }
      const validatedBody = validationResult.data;

      const updatedAgent = await agentService.updateAgent(id, validatedBody);
      if (!updatedAgent) {
        return this.error('Agent 不存在', 'agent_not_found');
      }

      return this.success(updatedAgent as AgentTypeResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return this.responseValidateError(error);
      }

      logger.error('[AgentBizController] 更新 Agent 失败:', error);
      return this.error('更新 Agent 失败', 'update_agent_error');
    }
  }

  @WithRequestContext()
  async deleteAgent(query: { agentId?: string }) {
    try {
      const { agentId } = query;

      if (!agentId) {
        return this.error('缺少 agentId 参数', 'missing_agent_id');
      }

      const id = parseInt(agentId);
      if (isNaN(id)) {
        return this.error('无效的 Agent ID', 'invalid_agent_id');
      }

      const result = await agentService.deleteAgent(id);
      if (!result) {
        return this.error('删除 Agent 失败', 'delete_agent_error');
      }

      return this.success({ message: 'Agent 删除成功' });
    } catch (error) {
      logger.error('[AgentBizController] 删除 Agent 失败:', error);
      return this.error('删除 Agent 失败', 'delete_agent_error');
    }
  }
}