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

### 上下文信息

请必须阅读当前项目[AGENTS.md](./AGENTS.md) 的内容, 了解当前项目的上下文信息.

### 研发工具

- 使用 cnpm 替代 npm
- 项目研发规范位于`./claude/rules`目录中，包含规则文件(./xxx-rule.md) 请按需查阅和遵循
