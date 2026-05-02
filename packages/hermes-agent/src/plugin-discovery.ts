/**
 * Memory provider plugin discovery.
 *
 * Ported from Python hermes-agent's plugins/memory/__init__.py.
 *
 * Scans directories for memory provider plugins:
 *   1. Bundled providers: shipped with the package
 *   2. User-installed providers: in a configurable directory
 *
 * Each plugin must export a class extending MemoryProvider or a
 * `register(ctx)` function that registers a provider.
 *
 * Only ONE provider can be active at a time, selected via config.
 *
 * Usage:
 *   const available = discoverMemoryProviders({ bundledDir, userDir });
 *   const provider = await loadMemoryProvider('honcho', { bundledDir, userDir });
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { MemoryProvider } from './memory-provider';

// ============== Types ==============

export interface PluginDiscoveryConfig {
  /** Directory containing bundled provider plugins */
  bundledDir?: string;
  /** Directory containing user-installed provider plugins (e.g. ~/.hermes/plugins/) */
  userDir?: string;
}

export interface DiscoveredProvider {
  name: string;
  description: string;
  available: boolean;
  path: string;
}

// ============== Internals ==============

interface ProviderCollector {
  provider: MemoryProvider | null;
  registerMemoryProvider(provider: MemoryProvider): void;
}

function createCollector(): ProviderCollector {
  return {
    provider: null,
    registerMemoryProvider(p: MemoryProvider) {
      this.provider = p;
    },
  };
}

function isProviderDir(dir: string): boolean {
  const indexFile = path.join(dir, 'index.ts');
  const indexJs = path.join(dir, 'index.js');
  return fs.existsSync(indexFile) || fs.existsSync(indexJs);
}

function iterProviderDirs(config: PluginDiscoveryConfig): Array<{ name: string; dir: string }> {
  const seen = new Set<string>();
  const dirs: Array<{ name: string; dir: string }> = [];

  // 1. Bundled providers
  if (config.bundledDir && fs.existsSync(config.bundledDir)) {
    for (const child of fs.readdirSync(config.bundledDir).sort()) {
      const fullPath = path.join(config.bundledDir, child);
      if (!fs.statSync(fullPath).isDirectory()) continue;
      if (child.startsWith('_') || child.startsWith('.')) continue;
      if (!isProviderDir(fullPath)) continue;
      seen.add(child);
      dirs.push({ name: child, dir: fullPath });
    }
  }

  // 2. User-installed providers
  if (config.userDir && fs.existsSync(config.userDir)) {
    for (const child of fs.readdirSync(config.userDir).sort()) {
      const fullPath = path.join(config.userDir, child);
      if (!fs.statSync(fullPath).isDirectory()) continue;
      if (child.startsWith('_') || child.startsWith('.')) continue;
      if (seen.has(child)) continue; // bundled takes precedence
      if (!isProviderDir(fullPath)) continue;
      dirs.push({ name: child, dir: fullPath });
    }
  }

  return dirs;
}

function findProviderDir(name: string, config: PluginDiscoveryConfig): string | null {
  // Bundled first
  if (config.bundledDir) {
    const bundled = path.join(config.bundledDir, name);
    if (fs.existsSync(bundled) && isProviderDir(bundled)) return bundled;
  }
  // User-installed
  if (config.userDir) {
    const user = path.join(config.userDir, name);
    if (fs.existsSync(user) && isProviderDir(user)) return user;
  }
  return null;
}

async function loadProviderFromDir(dir: string): Promise<MemoryProvider | null> {
  const indexTs = path.join(dir, 'index.ts');
  const indexJs = path.join(dir, 'index.js');
  const modulePath = fs.existsSync(indexJs) ? indexJs : indexTs;

  if (!fs.existsSync(modulePath)) return null;

  try {
    // Dynamic import works for both .ts (with ts-node/tsx) and .js
    const mod = await import(modulePath);

    // Try register(ctx) pattern first
    if (typeof mod.register === 'function') {
      const collector = createCollector();
      mod.register(collector);
      if (collector.provider) return collector.provider;
    }

    // Fallback: find a MemoryProvider subclass and instantiate it
    for (const key of Object.keys(mod)) {
      const value = mod[key];
      if (
        typeof value === 'function' &&
        value.prototype instanceof MemoryProvider
      ) {
        try {
          return new value();
        } catch {
          // skip
        }
      }
    }

    // Also check default export
    if (mod.default) {
      if (mod.default instanceof MemoryProvider) return mod.default;
      if (
        typeof mod.default === 'function' &&
        mod.default.prototype instanceof MemoryProvider
      ) {
        try {
          return new mod.default();
        } catch {
          // skip
        }
      }
    }
  } catch (e) {
    console.debug(`[PluginDiscovery] Failed to load provider from ${dir}:`, e);
  }

  return null;
}

// ============== Plugin Metadata ==============

function readPluginDescription(dir: string): string {
  // Try plugin.json
  const jsonPath = path.join(dir, 'plugin.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      if (meta.description) return meta.description;
    } catch {
      // skip
    }
  }

  // Try package.json
  const pkgPath = path.join(dir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.description) return pkg.description;
    } catch {
      // skip
    }
  }

  return '';
}

// ============== Public API ==============

/**
 * Scan bundled and user-installed directories for available providers.
 * Returns list of discovered providers with their availability status.
 */
export async function discoverMemoryProviders(
  config: PluginDiscoveryConfig = {},
): Promise<DiscoveredProvider[]> {
  const results: DiscoveredProvider[] = [];

  for (const { name, dir } of iterProviderDirs(config)) {
    const description = readPluginDescription(dir);
    let available = false;

    try {
      const provider = await loadProviderFromDir(dir);
      if (provider) {
        available = provider.isAvailable();
      }
    } catch {
      available = false;
    }

    results.push({ name, description, available, path: dir });
  }

  return results;
}

/**
 * Load and return a MemoryProvider instance by name.
 * Returns null if the provider is not found or fails to load.
 */
export async function loadMemoryProvider(
  name: string,
  config: PluginDiscoveryConfig = {},
): Promise<MemoryProvider | null> {
  const providerDir = findProviderDir(name, config);
  if (!providerDir) {
    console.debug(`[PluginDiscovery] Memory provider '${name}' not found`);
    return null;
  }

  try {
    const provider = await loadProviderFromDir(providerDir);
    if (provider) return provider;
    console.warn(`[PluginDiscovery] Memory provider '${name}' loaded but no provider instance found`);
    return null;
  } catch (e) {
    console.warn(`[PluginDiscovery] Failed to load memory provider '${name}':`, e);
    return null;
  }
}
