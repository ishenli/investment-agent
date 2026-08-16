import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { isZipFile, resolveWithin } from '../../utils/file';

type UploadMethod = 'zip' | 'folder';

export type StagedSkillUpload = {
  cleanupPath: string;
  source: string;
  uploadMethod: UploadMethod;
};

const getFileRelativePath = (file: File): string => {
  const maybePath = (file as File & {
    webkitRelativePath?: string;
  }).webkitRelativePath;

  return maybePath || file.name;
};

const writeFile = async (root: string, relativePath: string, file: File): Promise<string> => {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const destination = resolveWithin(root, normalized);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, Buffer.from(await file.arrayBuffer()));
  return destination;
};

export const stageSkillUploadFormData = async (formData: FormData): Promise<StagedSkillUpload> => {
  const uploadMethod = formData.get('uploadMethod');
  if (uploadMethod !== 'zip' && uploadMethod !== 'folder') {
    throw new Error('Unsupported upload method');
  }

  const files = formData.getAll('files').filter((file): file is File => file instanceof File);
  if (files.length === 0) {
    throw new Error('No upload files provided');
  }

  const cleanupPath = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-upload-'));

  try {
    if (uploadMethod === 'zip') {
      if (files.length !== 1) {
        throw new Error('ZIP upload requires exactly one file');
      }
      const file = files[0];
      if (!isZipFile(file.name)) {
        throw new Error('ZIP upload requires a .zip file');
      }

      const source = await writeFile(cleanupPath, file.name, file);
      return { cleanupPath, source, uploadMethod };
    }

    for (const file of files) {
      await writeFile(cleanupPath, getFileRelativePath(file), file);
    }

    return { cleanupPath, source: cleanupPath, uploadMethod };
  } catch (error) {
    await fs.rm(cleanupPath, { recursive: true, force: true });
    throw error;
  }
};

export const cleanupStagedSkillUpload = async (staged: StagedSkillUpload): Promise<void> => {
  await fs.rm(staged.cleanupPath, { recursive: true, force: true });
};
