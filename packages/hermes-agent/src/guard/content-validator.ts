/**
 * Content Guard - Validates tool arguments for security risks
 *
 * Independent of permission levels, this guard provides a baseline security layer
 * that checks the actual content of tool arguments (commands, file paths, etc.)
 * to prevent dangerous operations even when permissions allow them.
 */

import type { GuardDecision } from '../permission/types';

/**
 * Dangerous command patterns that should be blocked.
 * These patterns are shell-agnostic and cover common destructive operations.
 */
export const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\brm\s+-rf\s+\//i, reason: 'Recursive force delete from root' },
  { pattern: /\brm\s+-rf\s+~/i, reason: 'Recursive force delete from home directory' },
  { pattern: /\brm\s+-rf\s+\*/i, reason: 'Recursive force delete all files' },
  { pattern: /\bsudo\b/i, reason: 'Sudo privilege escalation' },
  { pattern: /\bdd\s+if=/i, reason: 'Disk imaging operation' },
  { pattern: /\bmkfs\b/i, reason: 'Filesystem formatting' },
  { pattern: /\bfdisk\b/i, reason: 'Disk partitioning' },
  { pattern: /\bchmod\s+[0-7]*777\b/i, reason: 'Overly permissive file permissions' },
  { pattern: /\bchown\s+.*:\s*\//i, reason: 'Changing ownership of system files' },
  { pattern: />\s*\/dev\/(sda|hda|nvme|disk)/i, reason: 'Writing directly to disk device' },
  { pattern: /\bcurl\b.*\|\s*(ba)?sh\b/i, reason: 'Piping curl output to shell' },
  { pattern: /\bwget\b.*\|\s*(ba)?sh\b/i, reason: 'Piping wget output to shell' },
  { pattern: /\bcurl\b.*\|\s*(ba)?sh\b/i, reason: 'Piping curl output to shell' },
  { pattern: /\bwget\b.*\|\s*(ba)?sh\b/i, reason: 'Piping wget output to shell' },
  { pattern: /\beval\s+["'].*http/i, reason: 'Evaluating network-sourced content' },
  { pattern: /\b(nc|netcat)\s+.*-e\s+\//i, reason: 'Netcat reverse shell' },
  { pattern: /\bshutdown\b/i, reason: 'System shutdown command' },
  { pattern: /\breboot\b/i, reason: 'System reboot command' },
  { pattern: /\binit\s+[06]/i, reason: 'System init state change' },
  { pattern: /\bsystemctl\s+(start|stop|restart|enable|disable)\s+/i, reason: 'System service management' },
];

/**
 * Sensitive file patterns that should be protected.
 */
export const SENSITIVE_FILES: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\.env$/i, reason: 'Environment file' },
  { pattern: /\.env\./i, reason: 'Environment file variant' },
  { pattern: /\.key$/i, reason: 'Private key file' },
  { pattern: /\.pem$/i, reason: 'Certificate/PEM file' },
  { pattern: /\.p12$/i, reason: 'PKCS12 certificate store' },
  { pattern: /\.pfx$/i, reason: 'PFX certificate' },
  { pattern: /id_rsa$/i, reason: 'SSH private key' },
  { pattern: /id_dsa$/i, reason: 'SSH DSA private key' },
  { pattern: /id_ecdsa$/i, reason: 'SSH ECDSA private key' },
  { pattern: /id_ed25519$/i, reason: 'SSH Ed25519 private key' },
  { pattern: /\.ssh\//i, reason: 'SSH directory' },
  { pattern: /\.gnupg\//i, reason: 'GPG directory' },
  { pattern: /\.git\//i, reason: 'Git repository metadata' },
  { pattern: /\.gitconfig$/i, reason: 'Git configuration' },
  { pattern: /\.npmrc$/i, reason: 'NPM configuration with tokens' },
  { pattern: /\.pypirc$/i, reason: 'PyPI configuration' },
  { pattern: /credentials\.json$/i, reason: 'Credentials file' },
  { pattern: /secrets?\.(json|yaml|yml|toml)$/i, reason: 'Secrets file' },
  { pattern: /config\.local\.(json|yaml|yml|toml)$/i, reason: 'Local config file' },
];

/**
 * ContentGuard configuration options.
 */
export interface ContentGuardOptions {
  /** Allowed working directories (defaults to [process.cwd()]) */
  allowedPaths?: string[];
  /** Whether to enable dangerous command checking */
  enableCommandCheck?: boolean;
  /** Whether to enable sensitive file protection */
  enableSensitiveFileProtection?: boolean;
  /** Additional dangerous patterns to block */
  additionalDangerousPatterns?: Array<{ pattern: RegExp; reason: string }>;
  /** Additional sensitive file patterns to protect */
  additionalSensitiveFiles?: Array<{ pattern: RegExp; reason: string }>;
}

/**
 * Default allowed paths from environment or current directory.
 */
function getDefaultAllowedPaths(): string[] {
  const envPaths = process.env.HERMES_ALLOWED_WORKDIRS;
  if (envPaths) {
    return envPaths.split(':').map((p) => p.trim()).filter(Boolean);
  }
  return [process.cwd()];
}

/**
 * Check if the guard is disabled via environment variable.
 */
export function isContentGuardDisabled(): boolean {
  return process.env.HERMES_DISABLE_CONTENT_GUARD === 'true';
}

/**
 * ContentGuard - Validates tool content for security risks.
 */
export class ContentGuard {
  private readonly allowedPaths: string[];
  private readonly dangerousPatterns: Array<{ pattern: RegExp; reason: string }>;
  private readonly sensitiveFiles: Array<{ pattern: RegExp; reason: string }>;
  private readonly enableCommandCheck: boolean;
  private readonly enableSensitiveFileProtection: boolean;
  private readonly disabled: boolean;

  constructor(options: ContentGuardOptions = {}) {
    this.allowedPaths = options.allowedPaths ?? getDefaultAllowedPaths();
    this.dangerousPatterns = [
      ...DANGEROUS_PATTERNS,
      ...(options.additionalDangerousPatterns ?? []),
    ];
    this.sensitiveFiles = [
      ...SENSITIVE_FILES,
      ...(options.additionalSensitiveFiles ?? []),
    ];
    this.enableCommandCheck = options.enableCommandCheck ?? true;
    this.enableSensitiveFileProtection = options.enableSensitiveFileProtection ?? true;
    this.disabled = isContentGuardDisabled();

    if (this.disabled) {
      console.warn('[ContentGuard] WARNING: Content guard is DISABLED via HERMES_DISABLE_CONTENT_GUARD=true');
    }
  }

  /**
   * Validate a terminal command for security risks.
   * @param command The command to validate
   * @param workdir Optional working directory
   * @returns GuardDecision indicating if the command is allowed
   */
  validateCommand(command: string, workdir?: string): GuardDecision {
    if (this.disabled) {
      return { allowed: true, policy: 'content-guard' };
    }

    if (!this.enableCommandCheck) {
      return { allowed: true, policy: 'content-guard' };
    }

    // Check dangerous patterns
    for (const { pattern, reason } of this.dangerousPatterns) {
      if (pattern.test(command)) {
        return {
          allowed: false,
          reason: `Blocked: ${reason}`,
          pattern: pattern.source,
          policy: 'content-guard',
        };
      }
    }

    // Validate working directory if provided
    if (workdir) {
      const workdirDecision = this.validatePath(workdir);
      if (!workdirDecision.allowed) {
        return workdirDecision;
      }
    }

    return { allowed: true, policy: 'content-guard' };
  }

  /**
   * Validate a file path for security risks.
   * @param filePath The file path to validate
   * @returns GuardDecision indicating if the path is allowed
   */
  validateFilePath(filePath: string): GuardDecision {
    if (this.disabled) {
      return { allowed: true, policy: 'content-guard' };
    }

    return this.validatePath(filePath);
  }

  /**
   * Internal path validation.
   */
  private validatePath(path: string): GuardDecision {
    // Resolve the path to handle .., ./, etc.
    const resolvedPath = require('path').resolve(path);

    // Check if path is within allowed directories
    const isAllowed = this.allowedPaths.some((allowedPath) => {
      const resolved = require('path').resolve(allowedPath);
      return resolvedPath.startsWith(resolved);
    });

    if (!isAllowed) {
      return {
        allowed: false,
        reason: `Path outside allowed directories: ${resolvedPath}`,
        policy: 'content-guard',
      };
    }

    // Check sensitive file patterns if enabled
    if (this.enableSensitiveFileProtection) {
      for (const { pattern, reason } of this.sensitiveFiles) {
        if (pattern.test(resolvedPath)) {
          return {
            allowed: false,
            reason: `Protected file: ${reason}`,
            pattern: pattern.source,
            policy: 'content-guard',
          };
        }
      }
    }

    return { allowed: true, policy: 'content-guard' };
  }

  /**
   * Get the list of allowed paths.
   */
  getAllowedPaths(): string[] {
    return [...this.allowedPaths];
  }
}

/**
 * Default ContentGuard instance.
 */
export const defaultContentGuard = new ContentGuard();
