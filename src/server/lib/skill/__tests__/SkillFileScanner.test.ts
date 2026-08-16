import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const projectRoots: string[] = [];

const writeSkill = (root: string, slug: string, name: string) => {
  const dir = path.join(root, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: ${name} description\n---\n${name} prompt\n`,
    'utf-8',
  );
};

describe('SkillFileScanner', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.IN_ELECTRON = 'N';
  });

  afterEach(() => {
    delete process.env.PROJECT_DIR;
    delete process.env.IN_ELECTRON;
    projectRoots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true }));
  });

  it('scans bundled project skills together with user workspace skills', async () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-scanner-'));
    projectRoots.push(projectRoot);
    process.env.PROJECT_DIR = projectRoot;

    writeSkill(path.join(projectRoot, 'skills'), 'bundled-skill', 'Bundled Skill');
    writeSkill(
      path.join(projectRoot, 'workspace', '1', '.hermes', 'skills'),
      'uploaded-skill',
      'Uploaded Skill',
    );

    const { SkillFileScanner } = await import('../SkillFileScanner');
    const scanner = new SkillFileScanner();

    expect(scanner.getBundledSkillsRoot()).toBe(path.join(projectRoot, 'skills'));
    expect(scanner.scanForUser(1).map((skill) => skill.id).sort()).toEqual([
      'bundled-skill',
      'uploaded-skill',
    ]);
  });
});
