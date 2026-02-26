import { getProjectDir } from '@server/base/env';
import path from 'path';

/**
 * Application configuration utilities
 *
 * Note: Model configuration is now managed through the ModelProvider system.
 * Use chatModelOpenAI() to get models configured by users.
 */

/**
 * Get the project data directory for storing reports and cache
 */
export function getProjectDataDir(): string {
  return getProjectDir();
}

/**
 * Get the data cache directory
 */
export function getDataCacheDir(): string {
  return path.join(getProjectDir(), 'dataflows', 'data_cache');
}