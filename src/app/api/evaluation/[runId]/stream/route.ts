import { createSSEResponse } from '@server/base/responseUtil';
import evaluationService from '@server/service/evaluationService';
import logger from '@server/base/logger';

export async function GET(_request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // stream closed
        }
      };

      try {
        const poll = async () => {
          let lastStatus = '';
          for (let i = 0; i < 600; i++) {
            const run = await evaluationService.getRunById(runId);
            if (!run) {
              send({ type: 'error', message: '评测记录不存在' });
              break;
            }

            if (run.status !== lastStatus) {
              lastStatus = run.status;
              send({
                type: 'status',
                runId,
                status: run.status,
                score: run.score,
                totalCases: run.totalCases,
                passedCases: run.passedCases,
                failedCases: run.failedCases,
              });
            }

            if (run.status === 'completed' || run.status === 'failed') {
              if (run.status === 'completed') {
                const detail = await evaluationService.getRunDetail(runId);
                if (detail) {
                  send({ type: 'result', ...detail });
                }
              }
              send({ type: 'done' });
              break;
            }

            await new Promise((r) => setTimeout(r, 2000));
          }
        };

        await poll();
      } catch (error) {
        logger.error(`[EvaluationStream] SSE error for ${runId}:`, error);
        send({ type: 'error', message: error instanceof Error ? error.message : String(error) });
      } finally {
        controller.close();
      }
    },
  });

  return createSSEResponse(stream);
}
