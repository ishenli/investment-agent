<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# 项目上下文信息

## 研发工具

- 使用 pnpm 替代 npm
- 项目研发规范位于`.claude/rules`目录中，包含以下规则文件：controller-rule.md, db-rule.md, request-rule.md, route-rule.md, script-rule.md, store-rule.md, test-rule.md，请按需查阅和遵循
- 我的项目远程分支是 github
