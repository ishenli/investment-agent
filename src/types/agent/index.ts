import { LLMParams } from '../llm';
import { LobeAgentChatConfig } from './chatConfig';

export type TTSServer = 'openai' | 'edge' | 'microsoft';

/**
 * AI 引擎类型 — 单一来源定义，所有文件统一引用
 */
export const ENGINE_TYPES = ['deepagents', 'claude', 'hermes'] as const;
export type EngineType = (typeof ENGINE_TYPES)[number];

/**
 * 权限模式等级 — Hermes 引擎工具执行权限控制
 */
export const PERMISSION_LEVELS = ['safe', 'standard', 'power', 'unrestricted'] as const;
export type PermissionLevelType = (typeof PERMISSION_LEVELS)[number];

export interface LobeAgentTTSConfig {
  showAllLocaleVoice?: boolean;
  sttLocale: 'auto' | string;
  ttsService: TTSServer;
  voice: {
    edge?: string;
    microsoft?: string;
    openai: string;
  };
}

export interface LobeAgentConfig {
  chatConfig: LobeAgentChatConfig;
  id?: string;
  /**
   * 角色所使用的语言模型
   * @default gpt-4o-mini
   */
  model: string;

  /**
   * AI 引擎类型
   * @default deepagents
   */
  engineType?: EngineType;

  /**
   * Claude SDK 模式
   * @default code
   */
  claudeMode?: 'code' | 'plan' | 'ask';

  /**
   * Hermes 引擎权限等级
   * @default standard
   */
  permissionLevel?: PermissionLevelType;

  /**
   * 开场白
   */
  openingMessage?: string;
  /**
   * 开场问题
   */
  openingQuestions?: string[];

  /**
   * 语言模型参数
   */
  params: LLMParams;
  /**
   * 启用的插件
   */
  plugins?: string[];

  /**
   *  模型供应商
   */
  provider?: string;

  /**
   * 系统角色
   */
  systemRole: string;

  /**
   * 语音服务
   */
  tts?: LobeAgentTTSConfig;
}

export type LobeAgentConfigKeys =
  | keyof LobeAgentConfig
  | ['params', keyof LobeAgentConfig['params']];

export * from './chatConfig';
export * from './agentType';
