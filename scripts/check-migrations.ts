#!/usr/bin/env tsx
/**
 * 数据库迁移一致性检查脚本
 * 
 * 用途：确保生成的迁移文件与当前 schema 定义一致
 * 使用时机：提交代码前、CI 流程中
 * 
 * 工作原理：
 * 1. 读取现有迁移文件
 * 2. 基于当前 schema 生成新的迁移（dry-run）
 * 3. 比较是否有未提交的 schema 变更
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

const MIGRATIONS_DIR = resolve(process.cwd(), 'drizzle/migrations');

async function checkMigrations() {
  console.log('🔍 检查数据库迁移一致性...\n');

  // 1. 检查迁移目录是否存在
  if (!existsSync(MIGRATIONS_DIR)) {
    console.error('❌ 迁移目录不存在:', MIGRATIONS_DIR);
    process.exit(1);
  }

  try {
    // 2. 检查是否有未生成的迁移
    console.log('📋 检查是否有未提交的 schema 变更...');
    
    const checkOutput = execSync('pnpm drizzle-kit check', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    console.log(checkOutput);

    // 3. 如果 check 通过，说明迁移文件与 schema 一致
    console.log('✅ 迁移文件与 schema 定义一致');
    console.log('\n💡 提示：');
    console.log('  • 本地开发使用: pnpm db:push');
    console.log('  • 提交前生成: pnpm db:generate');
    console.log('  • 生产部署使用: pnpm db:migrate');
    
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ 检查失败！');
    
    if (error.stdout) {
      console.error(error.stdout);
    }
    
    if (error.stderr) {
      console.error(error.stderr);
    }

    console.error('\n🔧 修复建议：');
    console.error('  1. 如果修改了 schema，请运行: pnpm db:generate');
    console.error('  2. 如果是新项目，请先运行: pnpm db:migrate');
    console.error('  3. 确保 drizzle.config.ts 配置正确');
    
    process.exit(1);
  }
}

checkMigrations();
