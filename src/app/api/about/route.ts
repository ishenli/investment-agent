import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

interface VersionInfo {
  version: string;
  author: string;
  license: string;
  buildDate: string;
}

function getVersionInfo(): VersionInfo {
  // 优先从生成的 version.json 读取（适用于 Electron 打包和 Web 构建）
  try {
    const versionPath = join(process.cwd(), 'version.json');
    const versionContent = readFileSync(versionPath, 'utf-8');
    const versionJson = JSON.parse(versionContent) as VersionInfo;
    return {
      version: versionJson.version || '0.0.0',
      author: versionJson.author || 'Unknown',
      license: versionJson.license || 'Unknown',
      buildDate: versionJson.buildDate || new Date().toISOString().split('T')[0],
    };
  } catch {
    // 回退到 package.json（开发环境）
    try {
      const packagePath = join(process.cwd(), 'package.json');
      const packageContent = readFileSync(packagePath, 'utf-8');
      const packageJson = JSON.parse(packageContent) as Omit<VersionInfo, 'buildDate'>;
      return {
        version: packageJson.version || '0.0.0',
        author: packageJson.author || 'Unknown',
        license: packageJson.license || 'Unknown',
        buildDate: new Date().toISOString().split('T')[0],
      };
    } catch {
      return {
        version: '0.0.0',
        author: 'Unknown',
        license: 'Unknown',
        buildDate: new Date().toISOString().split('T')[0],
      };
    }
  }
}

export async function GET() {
  const versionInfo = getVersionInfo();

  return NextResponse.json({
    version: versionInfo.version,
    buildDate: versionInfo.buildDate,
    license: versionInfo.license,
    developer: versionInfo.author,
  });
}
