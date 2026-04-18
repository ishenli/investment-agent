#!/usr/bin/env tsx
/**
 * Release Script
 *
 * 自动升级 package.json 版本号，创建 git tag，并推送到 GitHub 远程分支。
 *
 * Usage:
 *   pnpm release          # 交互式选择版本类型
 *   pnpm release patch     # 0.10.0 -> 0.10.1
 *   pnpm release minor     # 0.10.0 -> 0.11.0
 *   pnpm release major     # 0.10.0 -> 1.0.0
 *   pnpm release 1.2.3     # 指定具体版本号
 *   pnpm release --dry-run # 预览变更，不实际执行
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as readline from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PKG_PATH = resolve(ROOT, 'package.json');

// ─── Helpers ───────────────────────────────────────────────────

function run(cmd: string, dryRun = false): string {
  console.log(`  $ ${cmd}`);
  if (dryRun) return '';
  return execSync(cmd, { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe' }).trim();
}

function readPkg(): { version: string; [k: string]: unknown } {
  return JSON.parse(readFileSync(PKG_PATH, 'utf-8'));
}

function writePkg(pkg: Record<string, unknown>) {
  writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
}

function bumpVersion(
  current: string,
  type: 'patch' | 'minor' | 'major',
): string {
  const parts = current.split('.').map(Number);
  if (type === 'major') return `${parts[0] + 1}.0.0`;
  if (type === 'minor') return `${parts[0]}.${parts[1] + 1}.0`;
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}

function isValidSemver(v: string): boolean {
  return /^\d+\.\d+\.\d+(-[\w.]+)?$/.test(v);
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ─── Pre-flight checks ────────────────────────────────────────

function preflight() {
  // 检查是否在 git 仓库中
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: ROOT,
      stdio: 'pipe',
    });
  } catch {
    console.error('❌ Not inside a git repository');
    process.exit(1);
  }

  // 检查工作区是否干净（忽略 untracked files）
  const status = execSync('git status --porcelain', {
    cwd: ROOT,
    encoding: 'utf-8',
  }).trim();

  if (status) {
    console.error('❌ Working directory is not clean. Please commit or stash changes first.');
    console.error(status);
    process.exit(1);
  }

  // 检查当前分支
  const branch = execSync('git branch --show-current', {
    cwd: ROOT,
    encoding: 'utf-8',
  }).trim();

  if (branch !== 'main') {
    console.warn(`⚠️  Current branch is "${branch}", not "main".`);
  }
}

// ─── Main ──────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const filtered = args.filter((a) => a !== '--dry-run');
  let input = filtered[0];

  if (dryRun) {
    console.log('🏜️  Dry run mode — no changes will be made\n');
  }

  preflight();

  const pkg = readPkg();
  const currentVersion = pkg.version as string;
  console.log(`\n📦 Current version: v${currentVersion}\n`);

  // 交互式选择
  if (!input) {
    const patch = bumpVersion(currentVersion, 'patch');
    const minor = bumpVersion(currentVersion, 'minor');
    const major = bumpVersion(currentVersion, 'major');

    console.log('  1) patch  → ' + patch);
    console.log('  2) minor  → ' + minor);
    console.log('  3) major  → ' + major);
    console.log('  4) custom');
    console.log();

    const choice = await prompt('Select release type (1/2/3/4): ');

    switch (choice) {
      case '1':
        input = 'patch';
        break;
      case '2':
        input = 'minor';
        break;
      case '3':
        input = 'major';
        break;
      case '4': {
        input = await prompt('Enter version: ');
        break;
      }
      default:
        console.error('❌ Invalid choice');
        process.exit(1);
    }
  }

  // 计算新版本
  let newVersion: string;
  if (['patch', 'minor', 'major'].includes(input)) {
    newVersion = bumpVersion(currentVersion, input as 'patch' | 'minor' | 'major');
  } else if (isValidSemver(input)) {
    newVersion = input;
  } else {
    console.error(`❌ Invalid version or type: "${input}"`);
    process.exit(1);
  }

  const tag = `v${newVersion}`;
  console.log(`\n🚀 Releasing: v${currentVersion} → ${tag}\n`);

  // 确认
  if (!dryRun) {
    const confirm = await prompt(`Confirm release ${tag}? (y/N): `);
    if (confirm.toLowerCase() !== 'y') {
      console.log('Cancelled.');
      process.exit(0);
    }
    console.log();
  }

  // 1. 更新 package.json
  console.log('📝 Updating package.json...');
  if (!dryRun) {
    pkg.version = newVersion;
    writePkg(pkg);
  }

  // 2. Git commit
  console.log('📦 Creating release commit...');
  run(`git add package.json`, dryRun);
  run(`git commit -m "chore: release ${tag}"`, dryRun);

  // 3. 创建 tag
  console.log('🏷️  Creating tag...');
  run(`git tag -a ${tag} -m "Release ${tag}"`, dryRun);

  // 4. 推送到远程
  console.log('🚢 Pushing to remote...');
  run(`git push`, dryRun);
  run(`git push github ${tag}`, dryRun);

  console.log(`\n✅ Released ${tag} successfully!`);
  console.log(`   https://github.com/ishenli/investment-agent/releases/tag/${tag}`);
}

main().catch((err) => {
  console.error('❌ Release failed:', err.message);
  process.exit(1);
});
