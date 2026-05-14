/**
 * LearningRecorder — formats and persists reflection learning records.
 */

import type { AuditResult, LearningRecord } from './types';

function randomSuffix(length = 4): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export class LearningRecorder {
  private turnNumber: number;

  constructor(turnNumber = 1) {
    this.turnNumber = turnNumber;
  }

  /**
   * Build a LearningRecord from an audit result.
   */
  buildRecord(
    frameworkName: string,
    auditResult: AuditResult,
    skillsCreated: string[],
    error?: string,
  ): LearningRecord {
    const now = new Date();
    const id = `learn-${now.getTime()}-${randomSuffix()}`;

    return {
      id,
      timestamp: now.getTime(),
      turnNumber: this.turnNumber,
      frameworkName,
      dimensionsChecked: auditResult.dimensions.length,
      dimensionsCovered: auditResult.covered.map((d) => d.dimensionName),
      dimensionsMissing: auditResult.missing.map((d) => d.dimensionName),
      skillsCreated,
      error,
    };
  }

  /**
   * Format a LearningRecord as a human-readable text block for MEMORY.md.
   */
  formatForMemory(record: LearningRecord): string {
    const date = new Date(record.timestamp);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

    const parts: string[] = [
      `[${dateStr}] 投资分析审计`,
      `- 回合: ${record.turnNumber}`,
      `- 已检查维度: ${record.dimensionsChecked}`,
      `- 已覆盖: ${record.dimensionsCovered.join('、') || '无'}`,
      `- 缺失: ${record.dimensionsMissing.join('、') || '无'}`,
    ];

    if (record.skillsCreated.length > 0) {
      parts.push(`- 已创建 skills: ${record.skillsCreated.join('、')}`);
    }

    if (record.error) {
      parts.push(`- 错误: ${record.error}`);
    }

    return parts.join('\n');
  }
}
