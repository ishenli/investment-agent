import settingService from '@/server/service/settingService';
import { XStream } from '@ant-design/x';

export const llmOptions = {
  model: 'DeepSeek-V3',
  baseURL: '',
};

export async function requestSSE({
  api,
  body,
  headers,
  onUpdate,
  onSuccess,
  onError,
  abortRef,
  signal,
}: {
  api: string;
  body: object;
  headers?: object;
  onUpdate: (data: string) => void;
  onSuccess: (data: string) => void;
  onError?: (error: Error) => void;
  abortRef?: any;

  signal?: AbortSignal;
}) {
  const response = await fetch(api, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body || {}),
    signal: signal || null,
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  if (!response.body) {
    throw new Error('ReadableStream not supported');
  }

  const stream = XStream({
    readableStream: response.body,
  });
  const reader = stream.getReader();

  // 保存取消函数，并处理取消后的错误
  let isCancelled = false;
  abortRef.current = () => {
    isCancelled = true;
    reader.cancel().catch((err) => {
      // 忽略取消请求导致的错误
      console.log('Cancel operation error:', err.message);
    });
  };

  let current = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        onSuccess(current);
        break;
      }
      if (!value) continue;
      onUpdate(value.data);
    }
  } catch (err: any) {
    // 流读取过程中被中断（如手动调用 abort）
    if (err.name === 'AbortError' || isCancelled) {
      // 请求被取消，这是预期行为
      onError?.(new Error('Request was aborted'));
    } else {
      // 其他错误才需要抛出
      onError?.(err);
    }
  }
}

export async function bailingChat({
  body,
  onUpdate,
  onSuccess,
  onError,
  abortRef,
  signal,
}: {
  body: object;
  onUpdate: (data: string) => void;
  onSuccess: (data: string) => void;
  onError?: (error: Error) => void;
  abortRef?: any;

  signal?: AbortSignal;
}) {
  // 通过 setting 获取 llmOptions
  const modelServiceApiUrl = await settingService.getModelServiceApiUrl();

  if (!modelServiceApiUrl) {
    throw new Error('Model service API URL not found');
  }
  
  await requestSSE({
    api: `${modelServiceApiUrl}/v1/chat/completions`,
    body: {
      stream: true,
      model: llmOptions.model,
      ...body,
    },
    // headers: {
    //   Authorization: llmOptions.dangerouslyApiKey,
    // },
    onUpdate,
    onSuccess,
    onError,
    abortRef,
    signal,
  });
}