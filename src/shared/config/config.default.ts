import { getProjectDir } from '@server/base/env';
import path from 'path';

export type DefaultConfigType = {
  project_dir: string;
  results_dir: string;
  data_dir: string;
  data_cache_dir: string;
  // LLM settings
  llm_provider: string;
  deep_think_llm: string;
  quick_think_llm: string;
  backend_url: string;
  // Debate and discussion settings
  max_debate_rounds: number;
  max_risk_discuss_rounds: number;
  max_recur_limit: number;
  // Tool settings
  online_tools: boolean;
  online_news: boolean;
  realtime_data: boolean;
};

function envBool(key: string, defaultValue = false): boolean {
  const val = process.env[key];
  if (typeof val === 'undefined') return defaultValue;
  return String(val).toLowerCase() === 'true';
}

export const defaultConfig: DefaultConfigType = {
  project_dir: getProjectDir(),
  results_dir: process.env.TRADINGAGENTS_RESULTS_DIR || './results',
  data_dir: path.join(getProjectDir(), 'data'),
  data_cache_dir: path.join(getProjectDir(), 'dataflows', 'data_cache'),

  // LLM settings
  llm_provider: process.env.LLM_PROVIDER || 'openai',
  deep_think_llm: process.env.DEEP_THINK_LLM || 'Kimi-K2-Instruct-0905',
  quick_think_llm: process.env.QUICK_THINK_LLM || 'Qwen3-30B-A3B-Thinking-2507',
  backend_url: process.env.BACKEND_URL || 'https://api.openai.com/v1',

  // Debate and discussion settings
  max_debate_rounds: Number(process.env.MAX_DEBATE_ROUNDS || 1),
  max_risk_discuss_rounds: Number(process.env.MAX_RISK_DISCUSS_ROUNDS || 1),
  max_recur_limit: Number(process.env.MAX_RECUR_LIMIT || 100),

  // Tool settings
  online_tools: envBool('ONLINE_TOOLS_ENABLED', false),
  online_news: envBool('ONLINE_NEWS_ENABLED', true),
  realtime_data: envBool('REALTIME_DATA_ENABLED', false),
};
