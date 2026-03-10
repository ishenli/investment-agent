/**
 * Claude Service
 *
 * 统一管理 Claude SDK 的配置获取和验证
 * 为 reportService、/api/chat/claude 等模块提供复用
 */
import { modelProviderResolver } from './modelProviderResolver';
import logger from '@server/base/logger';
import type { ModelProvider, ProviderModel } from '@/types/modelProvider';
import { getProjectRoot } from '../base/env';
import path from 'path';
import fs from 'fs/promises';

/**
 * Claude SDK 配置对象
 */
export interface ClaudeConfig {
  modelSlug: string;
  provider: {
    id: number;
    name: string;
    baseUrl: string;
    apiKey: string | null;
    isActive: boolean;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * Claude SDK 环境变量配置
 */
export interface ClaudeEnvConfig {
  modelSlug: string;
  env: {
    ANTHROPIC_API_KEY?: string;
    ANTHROPIC_BASE_URL?: string;
  };
}

/**
 * Claude 工作空间上下文数据
 *
 * 用于将交易记录、持仓和市场信息等业务数据写入本地目录，
 * 供 Claude Agent SDK 通过内置文件工具读取。
 */
export interface ClaudeWorkspaceContext {
  title?: string;
  description?: string;
  /**
   * 已经预先组织好的 Markdown 内容（可选）。
   * 如果不提供，将根据其他字段生成一个简单的说明文档。
   */
  summaryMarkdown?: string;
  positions?: string;
  transactions?: string;
  marketInfo?: string;
  /**
   * 额外的结构化数据文件，key 为文件名（不含扩展名），value 为 JSON 可序列化对象。
   */
  extraFiles?: Record<string, string>;
}

export class ClaudeService {
  private logger = logger;
  private workspaceRoot: string;

  constructor() {
    const projectRoot = getProjectRoot();
    this.workspaceRoot = path.join(projectRoot, 'memory', 'claude');
  }

  /**
   * 获取 Claude SDK 配置
   *
   * @param userId - 用户 ID
   * @param modelSlug - 模型 slug,如果未指定则使用默认模型
   * @returns Claude SDK 配置对象
   */
  async getClaudeConfig(userId: number, modelSlug?: string): Promise<ClaudeConfig> {
    try {
      let config: { provider: ModelProvider; model: ProviderModel } | null;

      // 1. 尝试获取指定模型或默认模型
      if (modelSlug) {
        config = await modelProviderResolver.getActiveModelConfig(userId, modelSlug);
        if (!config) {
          this.logger.warn(`[ClaudeService] Model ${modelSlug} not found, falling back to default`);
          config = await modelProviderResolver.getDefaultModelConfig(userId);
        }
      } else {
        config = await modelProviderResolver.getDefaultModelConfig(userId);
      }

      if (!config) {
        throw new Error('No active model provider configuration found');
      }

      // 2. 构建 ClaudeConfig 对象
      const claudeConfig: ClaudeConfig = {
        modelSlug: config.model.slug,
        provider: {
          id: config.provider.id,
          name: config.provider.name,
          baseUrl: config.provider.anthropicUrl || config.provider.baseUrl, // 使用专门的 anthropicUrl，如果不存在则回退到 baseUrl
          apiKey: config.provider.apiKey,
          isActive: config.provider.isActive,
          description: config.provider.description,
          createdAt: config.provider.createdAt,
          updatedAt: config.provider.updatedAt,
        },
      };

      // 3. 验证配置
      this.validateConfig(claudeConfig);

      this.logger.info(
        `[ClaudeService] Using model ${claudeConfig.modelSlug} from provider ${claudeConfig.provider.name}`
      );

      return claudeConfig;
    } catch (error) {
      this.logger.error('[ClaudeService] Failed to get Claude config:', error);
      throw error;
    }
  }

  /**
   * 获取 Claude SDK 环境变量格式的配置
   *
   * @param userId - 用户 ID
   * @param modelSlug - 模型 slug,如果未指定则使用默认模型
   * @returns 环境变量格式的配置对象
   */
  async getEnvConfig(userId: number, modelSlug?: string): Promise<ClaudeEnvConfig> {
    const config = await this.getClaudeConfig(userId, modelSlug);

    // The SDK expects ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL environment variables
    // We map our provider config to these expected variables
    return {
      modelSlug: config.modelSlug,
      env: {
        ANTHROPIC_API_KEY: config.provider.apiKey || undefined,
        ANTHROPIC_BASE_URL: config.provider.baseUrl || undefined,
      },
    };
  }

  /**
   * 验证 Claude 配置
   *
   * @param config - Claude 配置对象
   * @throws 如果配置无效则抛出错误
   */
  private validateConfig(config: ClaudeConfig): void {
    if (!config.provider.apiKey) {
      throw new Error(
        `Provider ${config.provider.name} is missing API key. Please configure it in Model Provider settings.`
      );
    }

    if (!config.provider.baseUrl) {
      throw new Error(
        `Provider ${config.provider.name} is missing base URL. Please configure it in Model Provider settings.`
      );
    }

    if (!config.provider.isActive) {
      throw new Error(`Provider ${config.provider.name} is not active.`);
    }
  }

  /**
   * 将 ClaudeConfig 转换为 streamClaude 所需的 provider 对象
   *
   * @param config - Claude 配置对象
   * @returns streamClaude provider 对象
   */
  toStreamClaudeProvider(config: ClaudeConfig): {
    id: string;
    name: string;
    provider_type: string;
    base_url: string;
    api_key: string;
    is_active: number;
    sort_order: number;
    extra_env: string;
    notes: string;
    created_at: string;
    updated_at: string;
  } {
    return {
      id: config.provider.id.toString(),
      name: config.provider.name,
      provider_type: 'anthropic',
      base_url: config.provider.baseUrl,
      api_key: config.provider.apiKey || '',
      is_active: config.provider.isActive ? 1 : 0,
      sort_order: 0,
      extra_env: '{}',
      notes: config.provider.description || '',
      created_at: config.provider.createdAt.toISOString(),
      updated_at: config.provider.updatedAt.toISOString(),
    };
  }

  /**
   * 获取 Claude 工作空间根目录
   */
  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  /**
   * 创建一个 Claude 工作空间目录，将业务数据落盘为上下文文件
   *
   * @param userId - 用户 ID，用于隔离不同用户的工作空间
   * @param workspaceId - 工作空间标识，例如 'portfolio-memory'
   * @param context - 要写入的上下文数据
   * @returns 创建好的工作空间绝对路径
   */
  async createWorkspace(
    userId: number,
    workspaceId: string,
    context: ClaudeWorkspaceContext,
  ): Promise<string> {
    const userRoot = path.join(this.workspaceRoot, String(userId));
    const workDir = path.join(userRoot, workspaceId);

    await fs.mkdir(workDir, { recursive: true });

    this.logger.info(`[ClaudeService] Created workspace directory: ${workDir}`);

    const tasks: Promise<void>[] = [];

    // 主上下文说明文件
    tasks.push(this.writeContextFile(workDir, context));

    // 结构化业务数据文件
    if (context.positions) {
      tasks.push(this.writeMarkdownFile(workDir, 'positions.md', context.positions));
    }

    if (context.transactions) {
      tasks.push(this.writeMarkdownFile(workDir, 'transactions.md', context.transactions));
    }

    if (context.marketInfo) {
      tasks.push(this.writeMarkdownFile(workDir, 'market-info.md', context.marketInfo));
    }

    if (context.extraFiles) {
      for (const [name, value] of Object.entries(context.extraFiles)) {
        tasks.push(this.writeMarkdownFile(workDir, `${name}.md`, value));
      }
    }

    await Promise.all(tasks);

    this.logger.info(
      `[ClaudeService] Workspace context files created for user ${userId} workspace ${workspaceId}`,
    );

    return workDir;
  }

  /**
   * 清理指定的 Claude 工作空间目录
   */
  async cleanupWorkspace(userId: number, workspaceId: string): Promise<void> {
    const userRoot = path.join(this.workspaceRoot, String(userId));
    const workDir = path.join(userRoot, workspaceId);

    try {
      await fs.rm(workDir, { recursive: true, force: true });
      this.logger.info(`[ClaudeService] Cleaned up workspace: ${workDir}`);
    } catch (error) {
      this.logger.warn(`[ClaudeService] Failed to cleanup workspace ${workDir}: ${error}`);
    }
  }

  /**
   * 返回用户工作空间根目录（memory/claude/{userId}/）。
   *
   * 此目录作为 Claude Agent SDK 的 cwd：
   *   - 投资上下文文件居于子目录 invest-advisor/
   *   - 技能文件部署到 .claude/skills/，SDK 可在 {cwd}/.claude/skills/ 自动发现
   */
  getUserWorkspaceRoot(userId: number): string {
    return path.join(this.workspaceRoot, String(userId));
  }

  /**
   * 写入 context.md 说明文件
   */
  private async writeContextFile(workDir: string, context: ClaudeWorkspaceContext): Promise<void> {
    const content = context.summaryMarkdown ?? this.buildContextMarkdown(context);
    await fs.writeFile(path.join(workDir, 'context.md'), content, 'utf-8');
  }

  /**
   * 写入通用 JSON 文件
   */
  private async writeJsonFile(workDir: string, fileName: string, data: unknown): Promise<void> {
    const content = JSON.stringify(data ?? null, null, 2);
    await fs.writeFile(path.join(workDir, fileName), content, 'utf-8');
  }

  private async writeMarkdownFile(workDir: string, fileName: string, data: string): Promise<void> {
    await fs.writeFile(path.join(workDir, fileName), data, 'utf-8');
  }

  /**
   * 构建一个通用的 context.md 内容，供 Claude 作为工作空间说明
   */
  private buildContextMarkdown(context: ClaudeWorkspaceContext): string {
    const title = context.title || 'Claude 内存工作空间上下文';
    const description =
      context.description ||
      '本目录包含交易记录、持仓和市场信息等业务数据文件，供 Claude Agent SDK 作为上下文读取。';

    const sections: string[] = [];

    sections.push(`# ${title}`, '', description, '');

    sections.push('## 数据文件说明', '');

    sections.push('- `context.md`: 本说明文件及摘要信息');

    if (context.positions) {
      sections.push('- `positions.json`: 持仓相关结构化数据');
    }
    if (context.transactions) {
      sections.push('- `transactions.json`: 交易记录结构化数据');
    }
    if (context.marketInfo) {
      sections.push('- `market-info.json`: 市场行情或资产信息');
    }
    if (context.extraFiles && Object.keys(context.extraFiles).length > 0) {
      sections.push('- 其它 `*.json`: 额外上下文数据');
    }

    sections.push(
      '',
      '## 使用建议',
      '',
      '在调用 Claude Agent SDK 时，将本目录挂载为工作空间，让模型通过文件工具读取这些数据，再结合实时查询工具进行分析和决策。',
    );

    return sections.join('\n');
  }
}

// Export singleton instance
export const claudeService = new ClaudeService();
