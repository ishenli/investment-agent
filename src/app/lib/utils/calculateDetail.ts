export interface CalculateDetail {
  score: number;
  detail: {
    statement: string;
    reason: string;
    verdict: 0 | 1;
  }[];
  classification?: {
    TP: Array<{ statement: string; reason: string }>;
    FP: Array<{ statement: string; reason: string }>;
    FN: Array<{ statement: string; reason: string }>;
  };
  answer?: string;
  ground_truth?: string;
}

export const parseCalculateOutput = (
  calculateOutputResult: string | null,
): CalculateDetail | null => {
  if (!calculateOutputResult) return null;

  try {
    const parsed = JSON.parse(calculateOutputResult);

    // 处理数组格式
    if (Array.isArray(parsed)) {
      // 标准格式：[{"score": 91.0, "detail": [...]}]
      const firstItem = parsed[0];
      if (firstItem && firstItem.score !== undefined) {
        return firstItem;
      }
    }

    // 处理对象格式
    if (parsed.score !== undefined) {
      return parsed;
    }

    return null;
  } catch (error) {
    return null;
  }
};

export const formatVerdict = (verdict: 0 | 1): string => {
  return verdict === 1 ? '✅ 正确' : '❌ 错误';
};

export const getVerdictColor = (verdict: 0 | 1): string => {
  return verdict === 1 ? 'green' : 'red';
};
