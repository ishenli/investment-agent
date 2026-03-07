import path from 'path';
import fs from 'fs';
import { listWindowsCommandPaths } from './command';
import { normalizeFolderName } from './file';
import { appendEnvPath, getProjectRoot, isElectron } from '../base/env';
import extractZip from 'extract-zip';


export type NormalizedGitSource = {
  repoUrl: string;
  sourceSubpath?: string;
  ref?: string;
  repoNameHint?: string;
};

export type GithubRepoSource = {
  owner: string;
  repo: string;
};


export const parseGithubTreeOrBlobUrl = (source: string): NormalizedGitSource | null => {
  try {
    const parsedUrl = new URL(source);
    if (!['github.com', 'www.github.com'].includes(parsedUrl.hostname)) {
      return null;
    }

    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    if (segments.length < 5) {
      return null;
    }

    const [owner, repoRaw, mode, ref, ...rest] = segments;
    if (!owner || !repoRaw || !ref || (mode !== 'tree' && mode !== 'blob')) {
      return null;
    }

    const repo = repoRaw.replace(/\.git$/i, '');
    const sourceSubpath = normalizeGithubSubpath(rest.join('/'));
    if (!repo || !sourceSubpath) {
      return null;
    }

    return {
      repoUrl: `https://github.com/${owner}/${repo}.git`,
      sourceSubpath,
      ref: decodeURIComponent(ref),
      repoNameHint: repo,
    };
  } catch {
    return null;
  }
};

const normalizeGithubSubpath = (value: string): string | null => {
  const trimmed = value.trim().replace(/^\/+|\/+$/g, '');
  if (!trimmed) return null;
  const segments = trimmed
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    return null;
  }
  return segments.join('/');
};

export const deriveRepoName = (source: string): string => {
  const cleaned = source.replace(/[#?].*$/, '');
  const base = cleaned.split('/').filter(Boolean).pop() || 'skill';
  return normalizeFolderName(base.replace(/\.git$/, ''));
};

const resolveWindowsGitExecutable = (): string | null => {
  if (process.platform !== 'win32') return null;

  const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
  const localAppData = process.env.LOCALAPPDATA || '';
  const userProfile = process.env.USERPROFILE || '';

  const installedCandidates = [
    path.join(programFiles, 'Git', 'cmd', 'git.exe'),
    path.join(programFiles, 'Git', 'bin', 'git.exe'),
    path.join(programFilesX86, 'Git', 'cmd', 'git.exe'),
    path.join(programFilesX86, 'Git', 'bin', 'git.exe'),
    path.join(localAppData, 'Programs', 'Git', 'cmd', 'git.exe'),
    path.join(localAppData, 'Programs', 'Git', 'bin', 'git.exe'),
    path.join(userProfile, 'scoop', 'apps', 'git', 'current', 'cmd', 'git.exe'),
    path.join(userProfile, 'scoop', 'apps', 'git', 'current', 'bin', 'git.exe'),
    'C:\\Git\\cmd\\git.exe',
    'C:\\Git\\bin\\git.exe',
  ];

  for (const candidate of installedCandidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const whereCandidates = listWindowsCommandPaths('where git');
  for (const candidate of whereCandidates) {
    const normalized = candidate.trim();
    if (!normalized) continue;
    if (normalized.toLowerCase().endsWith('git.exe') && fs.existsSync(normalized)) {
      return normalized;
    }
  }

  const bundledRoots = isElectron()
    ? [path.join(getProjectRoot(), 'mingit')]
    : [
        path.join(__dirname, '..', '..', 'resources', 'mingit'),
        path.join(process.cwd(), 'resources', 'mingit'),
      ];

  for (const root of bundledRoots) {
    const bundledCandidates = [
      path.join(root, 'cmd', 'git.exe'),
      path.join(root, 'bin', 'git.exe'),
      path.join(root, 'mingw64', 'bin', 'git.exe'),
      path.join(root, 'usr', 'bin', 'git.exe'),
    ];
    for (const candidate of bundledCandidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
  }

  return null;
};

export const resolveGitCommand = (): { command: string; env?: NodeJS.ProcessEnv } => {
  if (process.platform !== 'win32') {
    return { command: 'git' };
  }

  const gitExe = resolveWindowsGitExecutable();
  if (!gitExe) {
    return { command: 'git' };
  }

  const env: NodeJS.ProcessEnv = { ...process.env };
  const gitDir = path.dirname(gitExe);
  const gitRoot = path.dirname(gitDir);
  const candidateDirs = [
    gitDir,
    path.join(gitRoot, 'cmd'),
    path.join(gitRoot, 'bin'),
    path.join(gitRoot, 'mingw64', 'bin'),
    path.join(gitRoot, 'usr', 'bin'),
  ].filter((dir) => fs.existsSync(dir));

  env.PATH = appendEnvPath(env.PATH, candidateDirs);
  return { command: gitExe, env };
};


export const parseGithubRepoSource = (repoUrl: string): GithubRepoSource | null => {
  const trimmed = repoUrl.trim();

  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?\/?$/i);
  if (sshMatch) {
    return {
      owner: sshMatch[1],
      repo: sshMatch[2],
    };
  }

  try {
    const parsedUrl = new URL(trimmed);
    if (!['github.com', 'www.github.com'].includes(parsedUrl.hostname.toLowerCase())) {
      return null;
    }

    const segments = parsedUrl.pathname
      .replace(/\.git$/i, '')
      .split('/')
      .filter(Boolean);
    if (segments.length < 2) {
      return null;
    }

    return {
      owner: segments[0],
      repo: segments[1],
    };
  } catch {
    return null;
  }
};


export const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

export const downloadGithubArchive = async (
  source: GithubRepoSource,
  tempRoot: string,
  ref?: string
): Promise<string> => {
  const encodedRef = ref ? encodeURIComponent(ref) : '';
  const archiveUrlCandidates: Array<{ url: string; headers: Record<string, string> }> = [];

  if (encodedRef) {
    archiveUrlCandidates.push(
      {
        url: `https://github.com/${source.owner}/${source.repo}/archive/refs/heads/${encodedRef}.zip`,
        headers: { 'User-Agent': 'LobsterAI Skill Downloader' },
      },
      {
        url: `https://github.com/${source.owner}/${source.repo}/archive/refs/tags/${encodedRef}.zip`,
        headers: { 'User-Agent': 'LobsterAI Skill Downloader' },
      },
      {
        url: `https://github.com/${source.owner}/${source.repo}/archive/${encodedRef}.zip`,
        headers: { 'User-Agent': 'LobsterAI Skill Downloader' },
      }
    );
  }

  archiveUrlCandidates.push({
    url: `https://api.github.com/repos/${source.owner}/${source.repo}/zipball${encodedRef ? `/${encodedRef}` : ''}`,
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'LobsterAI Skill Downloader',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  let buffer: Buffer | null = null;
  let lastError: string | null = null;

  for (const candidate of archiveUrlCandidates) {
    try {
      const response = await fetch(candidate.url, {
        method: 'GET',
        headers: candidate.headers,
      });

      if (!response.ok) {
        const detail = (await response.text()).trim();
        lastError = `Archive download failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ''}`;
        continue;
      }

      buffer = Buffer.from(await response.arrayBuffer());
      break;
    } catch (error) {
      lastError = extractErrorMessage(error);
    }
  }

  if (!buffer) {
    throw new Error(lastError || 'Archive download failed');
  }

  const zipPath = path.join(tempRoot, 'github-archive.zip');
  const extractRoot = path.join(tempRoot, 'github-archive');
  fs.writeFileSync(zipPath, buffer);
  fs.mkdirSync(extractRoot, { recursive: true });
  await extractZip(zipPath, { dir: extractRoot });

  const extractedDirs = fs.readdirSync(extractRoot)
    .map(entry => path.join(extractRoot, entry))
    .filter(entryPath => {
      try {
        return fs.statSync(entryPath).isDirectory();
      } catch {
        return false;
      }
    });

  if (extractedDirs.length === 1) {
    return extractedDirs[0];
  }

  return extractRoot;
};
