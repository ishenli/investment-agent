import fs from 'fs-extra';
import path from 'path';
import { getProjectDir } from '@/shared';

export function recordPrompt(prompt: string, filePath: string) {
  fs.outputFile(path.join(getProjectDir(), 'run/prompt', filePath), prompt, 'utf8');
}
