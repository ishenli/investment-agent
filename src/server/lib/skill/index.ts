/**
 * Skill infrastructure — unified export entry point.
 *
 * External code should import from here rather than from individual files
 * inside this directory.
 *
 * Architecture overview:
 *
 *   SkillFileScanner  — discovers and parses SKILL.md files from the filesystem
 *   SkillInstaller    — downloads and installs skills from GitHub/ZIP/local paths
 *   SkillRegistry     — merges filesystem data + DB preferences into ResolvedSkill[]
 *                       and serves as the single API for both management UI and Agent runtime
 */

export { SkillFileScanner, skillFileScanner } from './SkillFileScanner';
export { SkillInstaller, skillInstaller } from './SkillInstaller';
export { SkillRegistry, skillRegistry } from './SkillRegistry';

export type { ParsedSkill, ResolvedSkill } from '@/types/skill';
