import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';

vi.mock('@earendil-works/pi-ai/compat', () => ({
  complete: vi.fn(),
  stream: vi.fn(),
}));

import { complete } from '@earendil-works/pi-ai/compat';
import { ReflectionAuditor } from '../auditor';

const FRAMEWORKS_PATH = path.join(__dirname, '../frameworks/investment-analysis.json');

function makeAssistant(text: string) {
  return { role: 'assistant' as const, content: text, timestamp: Date.now() };
}

describe('ReflectionAuditor.generateFollowUpQuestions', () => {
  let auditor: ReflectionAuditor;

  beforeEach(() => {
    auditor = new ReflectionAuditor(FRAMEWORKS_PATH);
    // mockReset 会清掉上一用例可能遗留的 mockResolvedValueOnce 队列
    vi.mocked(complete).mockReset();
  });

  it('投资域相关时生成 1–3 条追问', async () => {
    const messages = ['帮我分析一下苹果股票的基本面'];
    const reply = '苹果目前市盈率偏低，营收增长稳定。';
    vi.mocked(complete).mockResolvedValueOnce(
      makeAssistant('["能再对比一下特斯拉的估值吗", "明年营收预期如何"]'),
    );

    const items = await auditor.generateFollowUpQuestions(
      { id: 'mock-model' } as never,
      messages,
      reply,
      { apiKey: 'k' },
    );

    expect(items).toEqual(['能再对比一下特斯拉的估值吗', '明年营收预期如何']);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('非投资域对话不调用 LLM 并返回空数组', async () => {
    const messages = ['今天天气怎么样'];
    const reply = '明天晴转多云。';

    const items = await auditor.generateFollowUpQuestions(
      { id: 'mock-model' } as never,
      messages,
      reply,
    );

    expect(items).toEqual([]);
    expect(complete).not.toHaveBeenCalled();
  });

  it('模型输出超过 3 条时截断为 3', async () => {
    const messages = ['怎么看新能源车板块'];
    const reply = '短期注意估值，长期逻辑成立。';
    vi.mocked(complete).mockResolvedValueOnce(
      makeAssistant('["追问1", "追问2", "追问3", "追问4", "追问5"]'),
    );

    const items = await auditor.generateFollowUpQuestions(
      { id: 'mock-model' } as never,
      messages,
      reply,
    );

    expect(items).toHaveLength(3);
  });

  it('模型输出无法解析时返回空数组', async () => {
    const messages = ['这只股票最近能买吗'];
    const reply = '短线投资风险较高。';
    vi.mocked(complete).mockResolvedValueOnce(makeAssistant('这不是 JSON'));

    const items = await auditor.generateFollowUpQuestions(
      { id: 'mock-model' } as never,
      messages,
      reply,
    );

    expect(items).toEqual([]);
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('LLM 调用异常时返回空数组且不抛出', async () => {
    const messages = ['这只基金怎么样'];
    const reply = '规模和管理费适中。';
    vi.mocked(complete).mockRejectedValueOnce(new Error('timeout'));

    await expect(
      auditor.generateFollowUpQuestions({ id: 'mock-model' } as never, messages, reply),
    ).resolves.toEqual([]);
  });

  it('对象包裹的数组（{"questions":[...]}）也能解析', async () => {
    const messages = ['怎么看创业板股票'];
    const reply = '波动大但景气度上行。';
    vi.mocked(complete).mockResolvedValueOnce(
      makeAssistant('{"questions": ["追涨还是等回调", "影响要多久"]}'),
    );

    const items = await auditor.generateFollowUpQuestions(
      { id: 'mock-model' } as never,
      messages,
      reply,
    );

    expect(items).toEqual(['追涨还是等回调', '影响要多久']);
  });

  it('无 JSON 的编号列表能解析并去掉前缀', async () => {
    const messages = ['汇率政策对出口影响大吗'];
    const reply = '有一定影响，可关注央行表态。';
    vi.mocked(complete).mockResolvedValueOnce(makeAssistant('1. 后续走势怎么看\n2. 对出口影响多久'));

    const items = await auditor.generateFollowUpQuestions(
      { id: 'mock-model' } as never,
      messages,
      reply,
    );

    expect(items).toEqual(['后续走势怎么看', '对出口影响多久']);
  });
});
