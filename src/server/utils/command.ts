import { spawn, spawnSync } from "child_process";

export const listWindowsCommandPaths = (command: string): string[] => {
  if (process.platform !== 'win32') return [];

  try {
    const result = spawnSync('cmd.exe', ['/d', '/s', '/c', command], {
      encoding: 'utf8',
      windowsHide: true,
    });
    if (result.status !== 0) return [];
    return result.stdout
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};

export const runCommand = (
  command: string,
  args: string[],
  options?: { cwd?: string; env?: NodeJS.ProcessEnv }
): Promise<void> => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    cwd: options?.cwd,
    env: options?.env,
    windowsHide: true,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', chunk => {
    stderr += chunk.toString();
  });
  child.on('error', error => reject(error));
  child.on('close', code => {
    if (code === 0) {
      resolve();
      return;
    }
    reject(new Error(stderr.trim() || `Command failed with exit code ${code}`));
  });
});