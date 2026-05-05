/**
 * GET /api/chat/observability-stream (SSE)
 *
 * 实时推送观测事件到前端。
 * 此端点复用现有 SSEEmitter 基础设施，通过 sendResult/sendAgentEvent 推送
 * trace_start / span_start / span_end / trace_end / metric 事件。
 *
 * 注意：前端通过独立的 EventSource 连接此端点，与 hermes chat SSE 流分离。
 */
import { NextRequest } from 'next/server';
import { SSEEmitter } from '@server/base/sseEmitter';
import { createSSEResponse } from '@server/base/responseUtil';
import logger from '@server/base/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const sseEmitter = new SSEEmitter();

  // Send initial connection event
  sseEmitter.send({ type: 'observability_connected', timestamp: Date.now() });

  // Keep connection alive with periodic heartbeat
  const heartbeatInterval = setInterval(() => {
    if (sseEmitter.isConnectionClosed()) {
      clearInterval(heartbeatInterval);
      return;
    }
    sseEmitter.send({ type: 'heartbeat', timestamp: Date.now() });
  }, 30000);

  // Clean up when client disconnects
  request.signal.addEventListener('abort', () => {
    clearInterval(heartbeatInterval);
    sseEmitter.close().catch((err) => {
      logger.error('[ObservabilityStream] close error:', err);
    });
  });

  return createSSEResponse(sseEmitter.readable);
}
