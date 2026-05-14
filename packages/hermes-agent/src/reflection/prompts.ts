/**
 * Prompt templates for the reflection auditor.
 */

import type { FrameworkConfig } from './types';

/** Unique delimiter for user content — 20 random alphanumerics */
const USER_DELIMITER = 'u6Kx9mNpQc3vLw8rJt5h';
const RESPONSE_DELIMITER = 'a7Bz4eYfDq2wVs1xUp0g';

/**
 * Escape XML-like tags and delimiter strings inside user content
 * so they cannot break out of the wrapper.
 */
function escapeUserContent(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(new RegExp(USER_DELIMITER, 'g'), '[REDACTED]')
    .replace(new RegExp(RESPONSE_DELIMITER, 'g'), '[REDACTED]');
}

/**
 * Build the audit prompt that asks the LLM to evaluate coverage of framework dimensions.
 */
export function buildAuditPrompt(
  framework: FrameworkConfig,
  userMessages: string[],
  finalResponse: string,
): string {
  const dimensionsText = framework.dimensions
    .map(
      (d) =>
        `- ${d.id}: ${d.name}\n  描述: ${d.description}\n  检测关键词: ${d.keywords.join(', ')}`,
    )
    .join('\n');

  const escapedUserMessages = userMessages.map((m, i) => `[用户消息 ${i + 1}]\n${escapeUserContent(m)}`).join('\n\n');
  const escapedFinalResponse = escapeUserContent(finalResponse);

  return `你是一个投资分析质量审计员。你的任务是评估下面的 Agent 回答是否覆盖了投资分析的各个维度。

## 审计维度清单

${dimensionsText}

## 对话上下文

<user-content-${USER_DELIMITER}>
${escapedUserMessages}
</user-content-${USER_DELIMITER}>

## Agent 最终回答

<agent-response-${RESPONSE_DELIMITER}>
${escapedFinalResponse}
</agent-response-${RESPONSE_DELIMITER}>

## 指令

请分析 Agent 的回答，判断上述每个维度是否被覆盖。一个维度被覆盖的标准是：回答中明确包含该维度相关的分析思路、数据引用或判断逻辑（而不仅仅是提及关键词）。

对每个维度，给出以下信息：
- covered: true/false（是否被覆盖）
- evidence: 简短说明为什么认为被覆盖或未被覆盖（1-2句话）

输出格式必须是合法的 JSON，不包含 markdown 代码块标记：

{
  "domainRelevant": true,
  "dimensions": [
    {
      "dimensionId": "fundamental-analysis",
      "covered": true,
      "evidence": "分析了公司营收和EPS增长情况"
    },
    ...
  ]
}

如果整个对话明显与投资无关，返回 {"domainRelevant": false, "dimensions": []}。
`;
}
