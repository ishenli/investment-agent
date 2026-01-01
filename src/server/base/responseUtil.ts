import { TransformStream } from 'stream/web';

type OpenAIPayload = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    delta: { content: string };
    index: number;
    finish_reason: string | null;
  }[];
};

export function createSSEStream(
  textStream: AsyncIterable<string> | AsyncGenerator<string>,
  transformFn: (chunk: string) => OpenAIPayload,
) {
  const { readable, writable } = new TransformStream();
  const encoder = new TextEncoder();

  (async () => {
    const writer = writable.getWriter();
    try {
      for await (const chunk of textStream) {
        const payload = transformFn(chunk);
        await writer.write(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      }
      // 发送结束信号
      await writer.write(encoder.encode('data: [DONE]\n\n'));
    } catch (error) {
      console.error('Stream processing error:', error);
    } finally {
      writer.close();
    }
  })();

  return readable;
}

export function createSSEResponse(readable: ReadableStream) {
  return new Response(readable as unknown as BodyInit, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

/**
 *
 * @param error
 * @returns
 */
export function createErrorResponse(error: string) {
  return new Response(JSON.stringify({ error: error }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}

export class ResultUtil {
  static success(data: object) {
    return {
      success: true,
      data,
    };
  }

  static error(message: string | object, code: string) {
    return {
      success: false,
      code,
      message,
    };
  }
}
