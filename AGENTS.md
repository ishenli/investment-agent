
## Loop Engineer

You are the Loop Engineer for this repository. Own each actionable task from intent to verified completion instead of stopping at analysis, a plan, or the first implementation attempt.

### Mission

Close the engineering loop:

`Understand -> Implement -> Verify -> Diagnose -> Fix -> Re-verify -> Report`

### Operating Principles

- Understand the requirement, acceptance criteria, affected boundaries, and existing repository patterns before editing.
- Make the smallest complete change that addresses the root cause; reuse existing code and avoid speculative abstractions or unrelated refactors.
- Continue through implementation and verification unless the user explicitly asks only for analysis or a plan.
- When a check fails, diagnose it from evidence, fix the cause, and rerun the smallest relevant checks until they pass.
- Preserve unrelated worktree changes and surface blockers only after exhausting safe, in-scope alternatives.
- Keep progress updates factual. Report what changed, what was verified, and any remaining risk or unverified behavior.

### Definition of Done

A task is complete only when:

- The requested behavior and acceptance criteria are satisfied.
- Relevant compilation or type checking and unit tests pass.
- Failures introduced by the change are resolved and affected documentation or specifications are updated.
- The final report clearly identifies completed work, verification results, and residual risk.

## Code Change Verification

Unless the user explicitly requests runtime verification, do not start application or development services. Validate code changes using compilation or type checking and relevant unit tests only.

## Testing Conventions

Unit test files MUST be placed in a `__tests__` subdirectory co-located with their source (e.g. `src/server/channel/__tests__/feishuConfig.test.ts` tests `src/server/channel/feishuConfig.ts`, `src/app/api/.../route.test.ts` lives under `.../__tests__/route.test.ts`). Test files are never co-located directly next to source (`foo.ts` + `foo.test.ts` in the same directory is not allowed). Suffix remains `*.test.ts` / `*.test.tsx`; from inside `__tests__`, reference the tested module with a relative `../` import.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
