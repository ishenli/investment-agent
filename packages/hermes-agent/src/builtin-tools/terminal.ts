/**
 * terminal — Execute shell commands.
 *
 * Ported from Python hermes-agent's tools/terminal_tool.py.
 */

import { Type } from '@sinclair/typebox';
import { execSync } from 'node:child_process';
import type { TextContent } from '@mariozechner/pi-ai';

const MAX_TIMEOUT_MS = 600_000; // 10 minutes
const MAX_OUTPUT_CHARS = 100_000;

export const terminalSchema = Type.Object({
  command: Type.String({ description: 'Shell command to execute' }),
  timeout: Type.Optional(
    Type.Number({ description: 'Timeout in seconds (default: 180, max: 600)' }),
  ),
  workdir: Type.Optional(
    Type.String({ description: 'Working directory for the command' }),
  ),
});

export async function terminalHandler(
  _toolCallId: string,
  args: Record<string, unknown>,
): Promise<{ content: TextContent[]; isError?: boolean }> {
  const command = String(args.command ?? '');
  const timeoutSec = Math.min(600, Math.max(1, Number(args.timeout ?? 180)));
  const timeoutMs = Math.min(MAX_TIMEOUT_MS, timeoutSec * 1000);
  const workdir = args.workdir ? String(args.workdir) : undefined;

  if (!command) {
    return { content: [{ type: 'text', text: 'Error: command is required' }], isError: true };
  }

  try {
    const stdout = execSync(command, {
      encoding: 'utf-8',
      timeout: timeoutMs,
      cwd: workdir,
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: '/bin/bash',
    });

    let output = stdout ?? '';
    const truncated = output.length > MAX_OUTPUT_CHARS;
    if (truncated) {
      output = output.slice(0, MAX_OUTPUT_CHARS) + '\n...[output truncated]';
    }

    const lines = output.split('\n').length;
    return {
      content: [{
        type: 'text',
        text: `exit_code: 0\n${output}\n(${lines} lines)`,
      }],
    };
  } catch (err: unknown) {
    // execSync throws on non-zero exit
    const error = err as {
      status?: number;
      stdout?: string;
      stderr?: string;
      message?: string;
      killed?: boolean;
    };

    if (error.killed) {
      return {
        content: [{
          type: 'text',
          text: `Command timed out after ${timeoutSec}s`,
        }],
        isError: true,
      };
    }

    const exitCode = error.status ?? 1;
    const stdout = (error.stdout ?? '').toString();
    const stderr = (error.stderr ?? '').toString();
    let output = stdout;
    if (stderr) output += (output ? '\n' : '') + stderr;
    if (output.length > MAX_OUTPUT_CHARS) {
      output = output.slice(0, MAX_OUTPUT_CHARS) + '\n...[output truncated]';
    }

    return {
      content: [{
        type: 'text',
        text: `exit_code: ${exitCode}\n${output}`,
      }],
      isError: exitCode !== 0,
    };
  }
}
