/**
 * SkillGenerator — creates skills for missing dimensions with deduplication.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { buildSkillMarkdown } from '../skill-tools/skill-utils';
import {
  SKILL_FILE_NAME,
  MAX_NAME_LENGTH,
  MAX_SKILL_CONTENT_CHARS,
  VALID_NAME_RE,
} from '../skill-tools/types';
import type { DimensionAudit, SkillDefinition } from './types';

export class SkillGenerator {
  private readonly localSkillsDir: string;
  private readonly onSkillChanged?: (event: { action: 'create'; slug: string }) => void | Promise<void>;

  constructor(
    localSkillsDir: string,
    onSkillChanged?: (event: { action: 'create'; slug: string }) => void | Promise<void>,
  ) {
    this.localSkillsDir = localSkillsDir;
    this.onSkillChanged = onSkillChanged;
  }

  /**
   * Check if a skill with the given slug already exists in localSkillsDir.
   */
  checkExists(slug: string): boolean {
    if (!fs.existsSync(this.localSkillsDir)) return false;
    const skillDir = path.join(this.localSkillsDir, slug);
    return fs.existsSync(path.join(skillDir, SKILL_FILE_NAME));
  }

  /**
   * Build a skill definition for a missing dimension.
   */
  buildSkillDefinition(dimension: DimensionAudit, _evidence?: string): SkillDefinition {
    const slug = dimension.dimensionId;
    const name = dimension.dimensionName;
    const description = dimension.description ?? '';

    const promptTemplate = `当用户询问投资相关问题或需要进行${name}时，请按照以下步骤进行：

1. **明确分析目标**：确认用户关注的具体标的或投资组合。
2. **收集关键数据**：根据${name}的核心指标，收集相关数据和资料。
3. **应用分析框架**：
   - ${description}
4. **形成结论**：基于分析结果给出明确的投资判断或建议。
5. **风险提示**：在结论中适当提及相关的不确定性和风险因素。

注意事项：
- 不要仅停留在表面描述，应深入到具体数值和逻辑推导。
- 如果数据不足，应如实说明并建议补充信息。
- 始终保持客观中立，避免过度乐观或悲观的表述。
`;

    return {
      slug,
      name,
      description,
      category: 'investment',
      promptTemplate,
      version: '1.0.0',
    };
  }

  /**
   * Create a skill file on disk for the given dimension.
   * Returns the created skill slug, or null if skipped (already exists or invalid).
   */
  create(dimension: DimensionAudit, evidence?: string): string | null {
    const definition = this.buildSkillDefinition(dimension, evidence);

    // Validate slug
    if (!this.isValidSlug(definition.slug)) {
      console.warn(`[SkillGenerator] Invalid slug "${definition.slug}", skipping.`);
      return null;
    }

    // Deduplication
    if (this.checkExists(definition.slug)) {
      console.info(`[SkillGenerator] Skill "${definition.slug}" already exists, skipping.`);
      return null;
    }

    // Build SKILL.md content
    const content = buildSkillMarkdown(
      {
        name: definition.name,
        description: definition.description,
        version: definition.version,
        category: definition.category,
      },
      definition.promptTemplate,
    );

    // Validate size
    if (content.length > MAX_SKILL_CONTENT_CHARS) {
      console.warn(
        `[SkillGenerator] Skill "${definition.slug}" exceeds max size (${content.length} > ${MAX_SKILL_CONTENT_CHARS}), skipping.`,
      );
      return null;
    }

    // Write
    try {
      const skillDir = path.join(this.localSkillsDir, definition.slug);
      fs.mkdirSync(skillDir, { recursive: true });

      const filePath = path.join(skillDir, SKILL_FILE_NAME);
      atomicWriteText(filePath, content);

      // Notify
      if (this.onSkillChanged) {
        try {
          this.onSkillChanged({ action: 'create', slug: definition.slug });
        } catch (err) {
          console.warn(`[SkillGenerator] onSkillChanged callback failed for "${definition.slug}":`, err);
        }
      }

      console.info(`[SkillGenerator] Created skill "${definition.slug}" at ${skillDir}`);
      return definition.slug;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[SkillGenerator] Failed to create skill "${definition.slug}": ${msg}`);
      return null;
    }
  }

  private isValidSlug(slug: string): boolean {
    if (!slug || slug.length > MAX_NAME_LENGTH) return false;
    return VALID_NAME_RE.test(slug);
  }
}

/**
 * Atomically write text to a file using temp file + rename.
 */
function atomicWriteText(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  const pid = typeof process !== 'undefined' ? process.pid : 0;
  const tmpPath = path.join(dir, `.${path.basename(filePath)}.tmp.${pid}`);

  fs.mkdirSync(dir, { recursive: true });

  let cleanupNeeded = true;
  try {
    fs.writeFileSync(tmpPath, content, 'utf-8');

    try {
      fs.renameSync(tmpPath, filePath);
      cleanupNeeded = false;
    } catch {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
  } finally {
    if (cleanupNeeded) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        /* noop */
      }
    }
  }
}
