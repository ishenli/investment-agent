<!-- OPENSPEC:START -->
# AI Agent Instructions: Investment Agent Development

This project is an advanced investment analysis platform that leverages AI agents to provide comprehensive stock market analysis, asset management, and investment recommendations. The development workflow combines modern Next.js practices with AI agent orchestration using LangChain.

## 🔄 The Development Workflow

Follow this lifecycle for all non-trivial changes:

### 1. **Phase 1: Process & Requirements (OpenSpec)**
*Goal: Define WHAT we are building and WHY.*

1.  **Initialize Change**:
    - Run `openspec list` to see current context.
    - Choose a change-id (e.g., `add-user-profile`).
    - Create directory: `openspec/changes/<change-id>/`.
    - Create `proposal.md` using the standard OpenSpec format (Why, What, Impact).
2.  **Define Requirements (Deltas)**:
    - Create `openspec/changes/<change-id>/specs/<capability>/spec.md`.
    - Use `## ADDED Requirements`, `## MODIFIED Requirements` etc.
    - **CRITICAL**: Every requirement must have at least one `#### Scenario:`.
3.  **Validate**:
    - Run `openspec validate <change-id> --strict`.

### 2. **Phase 2: Technical Planning (Speckit)**
*Goal: Define HOW we will build it (Technical Design & detailed Tasks).*

1.  **Create Plan**:
    - **Do NOT** use a generic design doc.
    - Create `openspec/changes/<change-id>/plan.md`.
    - **Template**: Read content from `openspec/agent/templates/plan-template.md` and fill it out.
    - Focus on: Tech Stack, File Structure, Data Models, Component Hierarchy.
2.  **Create Tasks**:
    - **Do NOT** use a simple checklist.
    - Create `openspec/changes/<change-id>/tasks.md`.
    - **Template**: Read content from `openspec/agent/templates/tasks-template.md` and fill it out.
    - **Granularity**: Break down into User Stories (P1, P2...) and Atomic Tasks (T001, T002...).
    - **Dependencies**: Ensure "Phase 1: Setup" and "Phase 2: Foundation" are clear before UI work.

### 3. **Phase 3: Implementation & Verification**
*Goal: Execute the plan.*

1.  **Execute Tasks**: Follow `tasks.md` sequentially.
    - Mark tasks as `[x]` as you complete them.
2.  **Verify**:
    - Ensure all Scenarios from Phase 1 are met.
    - Ensure all Checks from Phase 2 (Plan) are passed.

### 4. **Phase 4: Completion (OpenSpec)**
*Goal: Merge and Cleanup.*

1.  **Archive**:
    - Run `openspec archive <change-id>`.
    - This moves the change to history and updates the live specs.

---

## 📚 Reference Documentation

### Core Technologies
- **Next.js 16**: Modern React framework for full-stack development
- **LangChain.js**: Framework for developing AI applications
- **Drizzle ORM**: Type-safe database toolkit
- **Zustand**: State management solution
- **Ant Design**: UI component library

### Key Commands
- **Development**: `pnpm dev`
- **Build**: `pnpm build`
- **Database Migrations**: `pnpm db:migrate`
- **Database Studio**: `pnpm db:studio`
- **Testing**: `pnpm test`
- **Linting**: `pnpm lint`

<!-- OPENSPEC:END -->


## Project Rule And Workflow

+ the rule files is in `.codefuserules/rules-xxx` file folder, You Must read it and follow it.
+ the command files is in `.codefuserules/workflows` file folder, You Must read it and follow it. 
