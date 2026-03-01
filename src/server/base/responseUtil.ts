import { TransformStream } from 'stream/web';

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
  static success(data: any) {
    return {
      success: true,
      data,
      message: '',
      code: '',
    };
  }

  static error(message: string | object, code: string) {
    return {
      success: false,
      code,
      message,
      data: null,
    };
  }
}
