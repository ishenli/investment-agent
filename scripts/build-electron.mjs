import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Generate version info file for about page
function generateVersionInfo() {
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  const versionInfo = {
    version: packageJson.version || '0.0.0',
    author: packageJson.author || 'Unknown',
    license: packageJson.license || 'Unknown',
    buildDate: new Date().toISOString().split('T')[0],
  };

  // Write to public directory for web build
  const publicDir = path.join(rootDir, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(publicDir, 'version.json'),
    JSON.stringify(versionInfo, null, 2),
    'utf-8'
  );

  // Write to .next/standalone for Electron build
  const standaloneDir = path.join(rootDir, '.next', 'standalone');
  if (fs.existsSync(standaloneDir)) {
    fs.writeFileSync(
      path.join(standaloneDir, 'version.json'),
      JSON.stringify(versionInfo, null, 2),
      'utf-8'
    );
  }

  console.log('Version info generated:', versionInfo);
  return versionInfo;
}

// Replace symlinks in standalone with real copies so electron-builder can package them
function resolveStandaloneSymlinks() {
  const standaloneModules = '.next/standalone/.next/node_modules';
  if (!fs.existsSync(standaloneModules)) return;

  const entries = fs.readdirSync(standaloneModules);
  for (const entry of entries) {
    const fullPath = path.join(standaloneModules, entry);
    const stat = fs.lstatSync(fullPath);
    if (stat.isSymbolicLink()) {
      const target = fs.readlinkSync(fullPath);
      const resolved = path.resolve(standaloneModules, target);
      if (fs.existsSync(resolved)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        fs.cpSync(resolved, fullPath, { recursive: true });
        console.log(`Resolved symlink: ${entry} -> ${target}`);
      }
    }
  }
}

async function buildElectron() {
  // Generate version info before building
  generateVersionInfo();

  const shared = {
    bundle: true,
    platform: 'node',
    target: 'node18',
    external: ['electron', '@libsql/*'],
    sourcemap: true,
    minify: false,
  };

  await build({
    ...shared,
    entryPoints: ['electron/main.ts'],
    outfile: 'dist-electron/main.js',
  });

  await build({
    ...shared,
    entryPoints: ['electron/preload.ts'],
    outfile: 'dist-electron/preload.js',
  });

  console.log('Electron build complete');

  // Copy native dependencies (like @libsql) to dist-electron
  // copyNativeDependencies();

  // Fix standalone symlinks after next build
  resolveStandaloneSymlinks();
}

buildElectron().catch((err) => {
  console.error(err);
  process.exit(1);
});