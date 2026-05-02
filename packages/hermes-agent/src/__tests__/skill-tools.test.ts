/**
 * Tests for skill-tools module.
 *
 * Uses a temp directory to create/read/modify skills without touching real files.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  parseFrontmatter as parseSkillFrontmatter,
  buildSkillMarkdown,
  skillMatchesPlatform,
  scanSkills,
  findSkillDir,
  parseSkillMetadata,
  parseSkillContent,
  listSkillDirs,
  listSupportingFiles,
} from '../skill-tools/skill-utils';
import {
  preprocessSkillContent,
  substituteTemplateVars,
} from '../skill-tools/skill-preprocessing';
import { createSkillsListHandler } from '../skill-tools/skills-list';
import { createSkillViewHandler } from '../skill-tools/skill-view';
import { createSkillManageHandler } from '../skill-tools/skill-manage';

// ============== Test Helpers ==============

let tmpDir: string;

function createSkillDir(name: string, content: string, subdir?: string): string {
  const base = subdir ? path.join(tmpDir, subdir, name) : path.join(tmpDir, name);
  fs.mkdirSync(base, { recursive: true });
  fs.writeFileSync(path.join(base, 'SKILL.md'), content, 'utf-8');
  return base;
}

function makeSkillMd(name: string, description: string, prompt: string): string {
  return `---\nname: ${name}\ndescription: ${description}\n---\n\n${prompt}\n`;
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-tools-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ============== skill-utils tests ==============

describe('parseFrontmatter', () => {
  it('parses YAML frontmatter from markdown', () => {
    const raw = '---\nname: test\ndescription: A test skill\n---\n\nHello world';
    const { frontmatter, content } = parseSkillFrontmatter(raw);
    expect(frontmatter.name).toBe('test');
    expect(frontmatter.description).toBe('A test skill');
    expect(content.trim()).toBe('Hello world');
  });

  it('returns empty frontmatter when no frontmatter present', () => {
    const raw = 'Just some content';
    const { frontmatter, content } = parseSkillFrontmatter(raw);
    expect(frontmatter).toEqual({});
    expect(content).toBe('Just some content');
  });

  it('handles BOM', () => {
    const raw = '\uFEFF---\nname: bom\n---\ncontent';
    const { frontmatter } = parseSkillFrontmatter(raw);
    expect(frontmatter.name).toBe('bom');
  });
});

describe('buildSkillMarkdown', () => {
  it('builds markdown with frontmatter', () => {
    const result = buildSkillMarkdown({ name: 'test', description: 'desc' }, 'prompt');
    expect(result).toContain('---');
    expect(result).toContain('name: test');
    expect(result).toContain('description: desc');
    expect(result).toContain('prompt');
  });

  it('returns plain prompt when no frontmatter', () => {
    const result = buildSkillMarkdown({}, 'just a prompt');
    expect(result).toBe('just a prompt\n');
    expect(result).not.toContain('---');
  });
});

describe('skillMatchesPlatform', () => {
  it('returns true when no platform restrictions', () => {
    expect(skillMatchesPlatform({})).toBe(true);
  });

  it('returns true when current platform is listed', () => {
    const currentPlatform = os.platform();
    const platformName = currentPlatform === 'darwin' ? 'macos' : currentPlatform;
    expect(skillMatchesPlatform({ platforms: [platformName] })).toBe(true);
  });

  it('returns false when current platform is not listed', () => {
    const otherPlatform = os.platform() === 'darwin' ? 'windows' : 'macos';
    expect(skillMatchesPlatform({ platforms: [otherPlatform] })).toBe(false);
  });
});

describe('listSkillDirs', () => {
  it('finds directories containing SKILL.md', () => {
    createSkillDir('skill-a', makeSkillMd('A', 'Skill A', 'prompt A'));
    createSkillDir('skill-b', makeSkillMd('B', 'Skill B', 'prompt B'));
    fs.mkdirSync(path.join(tmpDir, 'not-a-skill'), { recursive: true });

    const dirs = listSkillDirs(tmpDir);
    expect(dirs).toHaveLength(2);
    expect(dirs.map((d) => path.basename(d)).sort()).toEqual(['skill-a', 'skill-b']);
  });

  it('returns empty for nonexistent root', () => {
    expect(listSkillDirs('/nonexistent-path')).toEqual([]);
  });
});

describe('parseSkillMetadata', () => {
  it('extracts metadata from SKILL.md', () => {
    const dir = createSkillDir('my-skill', makeSkillMd('My Skill', 'Does things', 'prompt'));
    const meta = parseSkillMetadata(dir);

    expect(meta).not.toBeNull();
    expect(meta!.name).toBe('my-skill');
    expect(meta!.displayName).toBe('My Skill');
    expect(meta!.description).toBe('Does things');
  });

  it('returns null for missing SKILL.md', () => {
    const dir = path.join(tmpDir, 'no-skill');
    fs.mkdirSync(dir, { recursive: true });
    expect(parseSkillMetadata(dir)).toBeNull();
  });
});

describe('parseSkillContent', () => {
  it('includes prompt and supporting files', () => {
    const dir = createSkillDir('full-skill', makeSkillMd('Full', 'Full skill', 'The prompt'));

    // Add a supporting file
    fs.mkdirSync(path.join(dir, 'references'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'references', 'guide.md'), '# Guide', 'utf-8');

    const skill = parseSkillContent(dir);
    expect(skill).not.toBeNull();
    expect(skill!.prompt).toBe('The prompt');
    expect(skill!.supportingFiles).toContain('references/guide.md');
  });
});

describe('scanSkills', () => {
  it('scans multiple roots with deduplication', () => {
    const root1 = path.join(tmpDir, 'root1');
    const root2 = path.join(tmpDir, 'root2');
    fs.mkdirSync(root1, { recursive: true });
    fs.mkdirSync(root2, { recursive: true });

    createSkillDir('shared', makeSkillMd('Shared V1', 'V1', 'old'), 'root1');
    createSkillDir('shared', makeSkillMd('Shared V2', 'V2', 'new'), 'root2');
    createSkillDir('unique', makeSkillMd('Unique', 'Only in root1', 'prompt'), 'root1');

    const skills = scanSkills([root1, root2]);
    expect(skills).toHaveLength(2);

    const shared = skills.find((s) => s.name === 'shared');
    expect(shared).toBeDefined();
    // root2 is later, so it should override
    expect(shared!.displayName).toBe('Shared V2');
  });
});

describe('findSkillDir', () => {
  it('finds skill by name across roots', () => {
    const root = path.join(tmpDir, 'roots');
    createSkillDir('target', makeSkillMd('Target', 'Found', 'prompt'), 'roots');

    const found = findSkillDir('target', [root]);
    expect(found).not.toBeNull();
    expect(path.basename(found!)).toBe('target');
  });

  it('returns null for missing skill', () => {
    expect(findSkillDir('nonexistent', [tmpDir])).toBeNull();
  });
});

// ============== skill-preprocessing tests ==============

describe('substituteTemplateVars', () => {
  it('replaces HERMES_SKILL_DIR', () => {
    const result = substituteTemplateVars(
      'Run ${HERMES_SKILL_DIR}/scripts/setup.sh',
      '/path/to/skill',
    );
    expect(result).toBe('Run /path/to/skill/scripts/setup.sh');
  });

  it('replaces HERMES_SESSION_ID', () => {
    const result = substituteTemplateVars(
      'Session: ${HERMES_SESSION_ID}',
      '/skill',
      'abc-123',
    );
    expect(result).toBe('Session: abc-123');
  });
});

describe('preprocessSkillContent', () => {
  it('applies template vars by default', () => {
    const result = preprocessSkillContent(
      'Dir: ${HERMES_SKILL_DIR}',
      '/my/skill',
    );
    expect(result).toBe('Dir: /my/skill');
  });

  it('skips template vars when disabled', () => {
    const result = preprocessSkillContent(
      'Dir: ${HERMES_SKILL_DIR}',
      '/my/skill',
      undefined,
      { templateVars: false },
    );
    expect(result).toBe('Dir: ${HERMES_SKILL_DIR}');
  });
});

// ============== skills_list tool tests ==============

describe('skills_list handler', () => {
  it('lists all skills', async () => {
    createSkillDir('alpha', makeSkillMd('Alpha', 'First skill', 'prompt'));
    createSkillDir('beta', makeSkillMd('Beta', 'Second skill', 'prompt'));

    const handler = createSkillsListHandler([tmpDir]);
    const result = await handler('call-1', {});

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('alpha');
    expect(result.content[0].text).toContain('beta');
  });

  it('returns no-skills message for empty directory', async () => {
    const handler = createSkillsListHandler([tmpDir]);
    const result = await handler('call-2', {});

    expect(result.content[0].text).toContain('No skills');
  });
});

// ============== skill_view tool tests ==============

describe('skill_view handler', () => {
  it('loads full skill content', async () => {
    createSkillDir('my-skill', makeSkillMd('My Skill', 'A skill', 'Do something smart'));

    const handler = createSkillViewHandler([tmpDir]);
    const result = await handler('call-1', { name: 'my-skill' });

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('My Skill');
    expect(result.content[0].text).toContain('Do something smart');
  });

  it('loads a supporting file', async () => {
    const dir = createSkillDir('ref-skill', makeSkillMd('Ref', 'Has refs', 'prompt'));
    fs.mkdirSync(path.join(dir, 'references'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'references', 'data.md'), '# Data Guide', 'utf-8');

    const handler = createSkillViewHandler([tmpDir]);
    const result = await handler('call-2', {
      name: 'ref-skill',
      file_path: 'references/data.md',
    });

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('Data Guide');
  });

  it('rejects invalid file_path subdirectory', async () => {
    createSkillDir('sec-skill', makeSkillMd('Sec', 'Secure', 'prompt'));

    const handler = createSkillViewHandler([tmpDir]);
    const result = await handler('call-3', {
      name: 'sec-skill',
      file_path: 'src/secret.ts',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('must start with');
  });

  it('returns error for unknown skill', async () => {
    const handler = createSkillViewHandler([tmpDir]);
    const result = await handler('call-4', { name: 'ghost' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('not found');
  });
});

// ============== skill_manage tool tests ==============

describe('skill_manage handler', () => {
  let handler: ReturnType<typeof createSkillManageHandler>;

  beforeEach(() => {
    handler = createSkillManageHandler(tmpDir, [tmpDir]);
  });

  describe('create', () => {
    it('creates a new skill', async () => {
      const content = makeSkillMd('New Skill', 'Created by agent', 'Do the thing');
      const result = await handler('call-1', {
        action: 'create',
        name: 'new-skill',
        content,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Created');
      expect(fs.existsSync(path.join(tmpDir, 'new-skill', 'SKILL.md'))).toBe(true);
    });

    it('rejects duplicate skill name', async () => {
      createSkillDir('existing', makeSkillMd('Existing', 'Already here', 'prompt'));

      const result = await handler('call-2', {
        action: 'create',
        name: 'existing',
        content: makeSkillMd('Dup', 'Duplicate', 'prompt'),
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('already exists');
    });

    it('rejects invalid name', async () => {
      const result = await handler('call-3', {
        action: 'create',
        name: 'INVALID NAME!',
        content: makeSkillMd('Bad', 'Bad name', 'prompt'),
      });

      expect(result.isError).toBe(true);
    });

    it('rejects missing frontmatter', async () => {
      const result = await handler('call-4', {
        action: 'create',
        name: 'no-fm',
        content: 'Just plain content, no frontmatter',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('frontmatter');
    });
  });

  describe('edit', () => {
    it('replaces skill content', async () => {
      createSkillDir('edit-me', makeSkillMd('Edit Me', 'Original', 'Old prompt'));

      const newContent = makeSkillMd('Edit Me', 'Updated desc', 'New prompt');
      const result = await handler('call-1', {
        action: 'edit',
        name: 'edit-me',
        content: newContent,
      });

      expect(result.isError).toBeFalsy();
      const written = fs.readFileSync(path.join(tmpDir, 'edit-me', 'SKILL.md'), 'utf-8');
      expect(written).toContain('New prompt');
    });
  });

  describe('patch', () => {
    it('performs exact match patch', async () => {
      createSkillDir('patch-me', makeSkillMd('Patch', 'Patchable', 'Step 1: do A\nStep 2: do B'));

      const result = await handler('call-1', {
        action: 'patch',
        name: 'patch-me',
        old_string: 'Step 1: do A',
        new_string: 'Step 1: do X',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Patched');

      const content = fs.readFileSync(path.join(tmpDir, 'patch-me', 'SKILL.md'), 'utf-8');
      expect(content).toContain('Step 1: do X');
      expect(content).toContain('Step 2: do B');
    });

    it('performs fuzzy match with whitespace differences', async () => {
      createSkillDir(
        'fuzzy-me',
        makeSkillMd('Fuzzy', 'Fuzzy target', '  Step 1: do A  \n  Step 2: do B  '),
      );

      const result = await handler('call-2', {
        action: 'patch',
        name: 'fuzzy-me',
        old_string: 'Step 1: do A\nStep 2: do B',
        new_string: 'Step 1: do X\nStep 2: do Y',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('fuzzy');
    });

    it('rejects patch on nonexistent skill', async () => {
      const result = await handler('call-3', {
        action: 'patch',
        name: 'ghost',
        old_string: 'abc',
        new_string: 'def',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });
  });

  describe('delete', () => {
    it('deletes a local skill', async () => {
      createSkillDir('delete-me', makeSkillMd('Delete', 'Deletable', 'prompt'));

      const result = await handler('call-1', {
        action: 'delete',
        name: 'delete-me',
      });

      expect(result.isError).toBeFalsy();
      expect(fs.existsSync(path.join(tmpDir, 'delete-me'))).toBe(false);
    });

    it('rejects deleting non-local skill', async () => {
      const otherRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'other-root-'));
      createSkillDir('external', makeSkillMd('External', 'Not local', 'prompt'));
      // Move to other root
      const externalDir = path.join(otherRoot, 'external');
      fs.cpSync(path.join(tmpDir, 'external'), externalDir, { recursive: true });
      fs.rmSync(path.join(tmpDir, 'external'), { recursive: true });

      const handler2 = createSkillManageHandler(tmpDir, [otherRoot]);
      const result = await handler2('call-2', {
        action: 'delete',
        name: 'external',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('only local');

      fs.rmSync(otherRoot, { recursive: true, force: true });
    });
  });

  describe('write_file', () => {
    it('writes a supporting file', async () => {
      createSkillDir('file-skill', makeSkillMd('Files', 'Has files', 'prompt'));

      const result = await handler('call-1', {
        action: 'write_file',
        name: 'file-skill',
        file_path: 'references/guide.md',
        file_content: '# Guide\nSome content',
      });

      expect(result.isError).toBeFalsy();
      const written = fs.readFileSync(
        path.join(tmpDir, 'file-skill', 'references', 'guide.md'),
        'utf-8',
      );
      expect(written).toContain('Guide');
    });

    it('rejects invalid subdirectory', async () => {
      createSkillDir('bad-path', makeSkillMd('Bad', 'Bad paths', 'prompt'));

      const result = await handler('call-2', {
        action: 'write_file',
        name: 'bad-path',
        file_path: 'src/hack.ts',
        file_content: 'bad',
      });

      expect(result.isError).toBe(true);
    });
  });

  describe('remove_file', () => {
    it('removes a supporting file', async () => {
      const dir = createSkillDir('rm-file', makeSkillMd('RM', 'Removable', 'prompt'));
      fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'assets', 'old.txt'), 'old data', 'utf-8');

      const result = await handler('call-1', {
        action: 'remove_file',
        name: 'rm-file',
        file_path: 'assets/old.txt',
      });

      expect(result.isError).toBeFalsy();
      expect(fs.existsSync(path.join(dir, 'assets', 'old.txt'))).toBe(false);
    });
  });
});
