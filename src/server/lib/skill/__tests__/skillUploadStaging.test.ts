import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanupStagedSkillUpload, stageSkillUploadFormData } from '../skillUploadStaging';

const stagedRoots: string[] = [];

const track = <T extends { cleanupPath: string }>(staged: T): T => {
  stagedRoots.push(staged.cleanupPath);
  return staged;
};

afterEach(async () => {
  await Promise.all(
    stagedRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })),
  );
});

describe('stageSkillUploadFormData', () => {
  it('stages a zip upload as a single installable zip file path', async () => {
    const formData = new FormData();
    formData.append('uploadMethod', 'zip');
    formData.append('files', new File(['zip-bytes'], 'sample-skill.zip', { type: 'application/zip' }));

    const staged = track(await stageSkillUploadFormData(formData));

    expect(staged.uploadMethod).toBe('zip');
    expect(staged.source).toBe(path.join(staged.cleanupPath, 'sample-skill.zip'));
    await expect(fs.readFile(staged.source, 'utf-8')).resolves.toBe('zip-bytes');
  });

  it('stages a folder upload preserving browser-provided relative paths', async () => {
    const formData = new FormData();
    formData.append('uploadMethod', 'folder');
    formData.append('files', new File(['---\nname: Folder Skill\n---\nPrompt\n'], 'folder-skill/SKILL.md'));
    formData.append('files', new File(['helper'], 'folder-skill/scripts/helper.sh'));

    const staged = track(await stageSkillUploadFormData(formData));

    expect(staged.uploadMethod).toBe('folder');
    expect(staged.source).toBe(staged.cleanupPath);
    await expect(fs.readFile(path.join(staged.source, 'folder-skill', 'SKILL.md'), 'utf-8'))
      .resolves
      .toContain('Folder Skill');
    await expect(fs.readFile(path.join(staged.source, 'folder-skill', 'scripts', 'helper.sh'), 'utf-8'))
      .resolves
      .toBe('helper');
  });

  it('rejects folder entries that try to escape the staging directory', async () => {
    const formData = new FormData();
    formData.append('uploadMethod', 'folder');
    formData.append('files', new File(['bad'], '../SKILL.md'));

    await expect(stageSkillUploadFormData(formData)).rejects.toThrow('Invalid target path');
  });

  it('removes staged upload files after cleanup', async () => {
    const formData = new FormData();
    formData.append('uploadMethod', 'zip');
    formData.append('files', new File(['zip-bytes'], 'cleanup-skill.zip', { type: 'application/zip' }));

    const staged = await stageSkillUploadFormData(formData);
    expect(staged.cleanupPath).toContain(path.join(os.tmpdir(), 'skill-upload-'));

    await cleanupStagedSkillUpload(staged);

    await expect(fs.access(staged.cleanupPath)).rejects.toThrow();
  });
});
