import { describe, expect, it } from 'vitest';
import { buildSkillUploadFormData } from '../skillUploadFormData';

describe('buildSkillUploadFormData', () => {
  it('builds multipart payload for zip skill upload', () => {
    const zipFile = new File(['zip-bytes'], 'skill.zip', { type: 'application/zip' });

    const formData = buildSkillUploadFormData('zip', [zipFile]);

    expect(formData.get('uploadMethod')).toBe('zip');
    expect(formData.getAll('files')).toEqual([zipFile]);
  });

  it('builds multipart payload for folder skill upload', () => {
    const skillFile = new File(['skill'], 'my-skill/SKILL.md');
    const scriptFile = new File(['script'], 'my-skill/scripts/run.sh');

    const formData = buildSkillUploadFormData('folder', [skillFile, scriptFile]);

    expect(formData.get('uploadMethod')).toBe('folder');
    expect(formData.getAll('files')).toEqual([skillFile, scriptFile]);
  });
});
