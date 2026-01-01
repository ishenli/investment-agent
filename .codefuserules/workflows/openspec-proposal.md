<!-- OPENSPEC:START -->
**Guardrails**
- Favor straightforward, minimal implementations first and add complexity only when it is requested or clearly required.
- Keep changes tightly scoped to the requested outcome.
- Refer to `openspec/AGENTS.md` (located inside the `openspec/` directory—run `ls openspec` or `openspec update` if you don't see it) if you need additional OpenSpec conventions or clarifications.
- Identify any vague or ambiguous details and ask the necessary follow-up questions before editing files.
- Do not write any code during the proposal stage. Only create design documents (proposal.md, tasks.md, plan.md, and spec deltas). Implementation happens in the apply stage after approval.

**Steps**
1. **Analyze & Scaffold**:
   - Review `openspec/project.md` and run `openspec list --specs` to ground the proposal in current behavior.
   - Choose a unique verb-led `change-id` and create directory `openspec/changes/<id>/`.
   - Initialize `proposal.md` with sections: Why, What, Impact.

2. **Clarify (Interactive)**:
   - Identify any ambiguous requirements or missing details.
   - **ASK the user** for clarification immediately if key decisions are missing (e.g., edge cases, data structures). Do not guess on critical specs.
   - If you find a requirement is not clear, you should ask the user for clarification.

3. **Draft Spec Deltas**:
   - Map the change to capabilities. Create `openspec/changes/<id>/specs/<capability>/spec.md` (one folder per capability).
   - Use `## ADDED Requirements` / `## MODIFIED Requirements`.
   - **CRITICAL**: Every requirement MUST have at least one `#### Scenario: ...`.
   - If you can, you should write in Chinese.
   - If the spec content is write in Chinese, Every requirement Must have `必须（Must）` or `应该（Should）

4. **Technical Plan**:
   - Create `openspec/changes/<id>/plan.md` (replaces plan.md).
   - Define schema changes, API endpoints, and component hierarchy.

5. **Task Breakdown**:
   - Create `openspec/changes/<id>/tasks.md`.
   - Break work into granular, verifiable steps (Foundation -> Core -> UI -> Test).

6. **Validate**:
   - Validate with `openspec validate <id> --strict` and resolve every issue before sharing the proposal.

**Reference**
- Use `openspec show <id> --json --deltas-only` or `openspec show <spec> --type spec` to inspect details when validation fails.
- Search existing requirements with `rg -n "Requirement:|Scenario:" openspec/specs` before writing new ones.
- Explore the codebase with `rg <keyword>`, `ls`, or direct file reads so proposals align with current implementation realities.
<!-- OPENSPEC:END -->
