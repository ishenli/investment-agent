import { ChatOpenAI } from '@langchain/openai';

export function chatModelOpenAI(model?: ModelNameType) {
  return new ChatOpenAI({
    model: model,
    configuration: {
      baseURL: process.env.MODEL_PROVIDER_URL,
      apiKey: process.env.MODEL_PROVIDER_API_KEY,
    },
  });
}


export const ModelMap = {
  'Kimi-K2-Instruct': 'Kimi-K2-Instruct',
  'Qwen3-Next-80B-A3B-Instruct': 'Qwen3-Next-80B-A3B-Instruct',
  'Qwen3-235B-A22B-Instruct-2507': 'Qwen3-235B-A22B-Instruct-2507',
} as const;


export type ModelNameType = keyof typeof ModelMap;
