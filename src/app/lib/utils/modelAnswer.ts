export interface ModelAnswer {
  answer: string;
  recallData: string[];
  hasRecall: boolean;
  rewrittenQuery?: string;
}

export const parseModelAnswer = (prediction: string | null): ModelAnswer => {
  if (!prediction) {
    return {
      answer: '-',
      recallData: [],
      hasRecall: false,
    };
  }

  try {
    let parsed;
    try {
      const result = JSON.parse(prediction)?.find((item: any) => item.role === 'assistant');
      parsed = {
        content: JSON.parse(result.content),
        extInfo: JSON.parse(result.extInfo),
      };
    } catch (error) {
      parsed = JSON.parse(prediction);
    }

    // 处理prediction数组格式
    if (Array.isArray(parsed)) {
      const answerData = parsed.find((item: any) => item.title === '模板回复内容');
      const recallData = parsed.find((item: any) => item.title === '非引证-知识片段');

      return {
        answer: answerData?.content || '-',
        recallData: recallData?.content || [],
        hasRecall: !!(recallData?.content && recallData.content.length > 0),
        rewrittenQuery: answerData?.rewritten_query || undefined,
      };
    } else if (parsed.content) {
      const recallData = JSON.parse(parsed?.extInfo?.['非引证-知识片段']);
      return {
        answer: parsed?.content?.[0] || '-',
        recallData: recallData || [],
        hasRecall: !!(recallData && recallData.length > 0),
        rewrittenQuery: parsed?.extInfo?.['query改写']?.[0] || '',
      };
    }

    // 处理直接字符串格式
    return {
      answer: typeof parsed === 'string' ? parsed : '-',
      recallData: [],
      hasRecall: false,
    };
  } catch (error) {
    // 处理字符串格式
    return {
      answer: prediction,
      recallData: [],
      hasRecall: false,
    };
  }
};
