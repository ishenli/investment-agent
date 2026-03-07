import fs from 'fs-extra';
import path from 'path';
import { getProjectDir } from '../base/env';

export function recordPrompt(prompt: string, filePath: string) {
  fs.outputFile(path.join(getProjectDir(), 'run/prompt', filePath), prompt, 'utf8');
}

export const isZipFile = (filePath: string): boolean => path.extname(filePath).toLowerCase() === '.zip';


export const normalizeFolderName = (name: string): string => {
  const normalized = name.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || 'skill';
};


export const resolveWithin = (root: string, target: string): string => {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(root, target);
  if (resolvedTarget === resolvedRoot) return resolvedTarget;
  if (!resolvedTarget.startsWith(resolvedRoot + path.sep)) {
    throw new Error('Invalid target path');
  }
  return resolvedTarget;
};