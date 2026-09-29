---
name: openspec-learning
description: Capture one verified, non-obvious, reusable lesson from completed OpenSpec work in the project configuration so future OpenSpec workflows receive it. Use when the user invokes this skill, asks to preserve what was learned, says "openspec learning", or wants a solved problem turned into durable OpenSpec guidance.
license: MIT
metadata:
  author: project
  version: "1.0"
---

# OpenSpec Learning

Capture one durable project learning in `openspec/config.yaml` so it becomes
prompt context for future OpenSpec workflows.

## Outcome

One qualifying learning is added to or corrected in the resolved OpenSpec
configuration, then validated with the CLI. If no learning qualifies, write
nothing and explain why.

## Guardrails

- Capture exactly one learning per run.
- Document only work that is solved and verified.
- Write only when the user asks to capture, save, or preserve the learning. A
  question about possible lessons is read-only.
- Modify only the resolved `openspec/config.yaml` or `config.yml`. Do not edit
  code, specs, change artifacts, or archived artifacts in this workflow.
- Preserve every unrelated config key, comment, rule, and operation entry.
- Never record secrets, credentials, personal data, transient paths, incident
  details, dates, branch names, or change IDs as durable guidance.

## Durable Learning Bar

A learning qualifies only when all of these are true:

1. The underlying behavior or solution has been verified.
2. The reasoning is not readily recoverable from current code, tests, types,
   specs, or existing documentation.
3. The lesson is likely to affect a future proposal, specification, design,
   task breakdown, implementation, or archive decision.
4. Losing it would plausibly cause a repeated mistake, material risk, or
   substantial rediscovery.
5. The claim is still true for the current tree.

Use this counterfactual: if the config entry disappeared, would a capable future
engineer still be likely to repeat the mistake or redo substantial
investigation? If not, skip the write.

Routine fixes, file locations, command output, implementation summaries, and
facts already enforced by tests or types do not qualify. Effort and diff size
do not make a lesson durable.

## Root And Store Selection

If the user names a registered OpenSpec store, or the work is explicitly in
one, run `openspec store list --json`, resolve its ID, and keep `--store <id>`
on every supported OpenSpec command for the rest of the workflow.

Run `openspec context --json` from the current working directory, with the
selected store flag when applicable. Use `root.path` as the authoritative
project root. If it reports `no_openspec_root`, stop without creating one.

Before the first write, run `openspec list --json` with the same root selection
and require a non-null `root`. If a declared store cannot be resolved, report
the CLI's message and fix and stop.

Read `<root.path>/openspec/config.yaml`; use `config.yml` only when
`config.yaml` does not exist. If neither exists, stop and report that this
workflow requires an initialized OpenSpec configuration. Do not create a root
or choose a schema as a side effect.

## Input

The user may provide a change name or a short context hint. Prefer the change
named in the request. Otherwise infer the completed work from the conversation.
If evidence depends on a change and several active changes are plausible, run
`openspec list --json` and ask the user to select one.

## Workflow

### 1. Gather Evidence

For a selected change, run:

```bash
openspec status --change "<name>" --json
```

Use `changeRoot`, `artifactPaths`, and `actionContext` from the response. Read
existing artifact paths returned by the CLI, then inspect only the relevant
implementation, tests, verification output, and current specs needed to verify
the proposed lesson. Do not treat completed task checkboxes as proof by
themselves.

Without a selected change, use the current conversation and the smallest
relevant set of repository evidence. Never invent a lesson to make the run
produce output.

### 2. Check Existing Guidance

Read the full resolved config and search its `context`, `rules`, and
`operations` for the same idea. Also check the relevant main spec or code when
needed to decide whether the fact is already discoverable.

Update an existing entry when it is materially inaccurate or incomplete.
Avoid synonyms that duplicate an existing rule.

### 3. Choose The Destination

Place the learning in exactly one location:

| Learning type | Destination |
| --- | --- |
| Durable project fact, architecture invariant, domain constraint, or cross-cutting convention | `context` |
| Guidance that changes how one artifact is authored | `rules.proposal`, `rules.specs`, `rules.design`, or `rules.tasks` |
| Guidance for implementation execution | `operations.apply.guidance` |
| Guidance for sync or archive decisions | `operations.archive.guidance` |

If the lesson is a product requirement or observable behavior, it belongs in a
specification. Do not hide it in config and do not modify a spec in this
workflow. Report the mismatch and recommend creating or updating an OpenSpec
change.

If the lesson is useful only for one completed change and its design or final
implementation already explains it, skip it.

### 4. Draft The Entry

Write the smallest actionable statement that preserves the decision:

- State what future work should assume or do.
- Include the reason only when it prevents a likely wrong alternative.
- Describe the current invariant, not the incident that revealed it.
- Avoid broad words such as "always" unless the evidence establishes a real
  invariant.
- Keep artifact rules specific to that artifact and operation guidance specific
  to that operation.

Before editing, re-read the config and confirm the draft is still new and
accurate. Keep a string `context` field within OpenSpec's 51,200-byte UTF-8
limit. Preserve valid YAML and the current schema or store declaration.

### 5. Write And Validate

Apply the minimal config edit. Then run:

```bash
openspec doctor --json
openspec context --json
```

Use the same store flag when applicable. Require a healthy resolved root and a
successfully parsed context. Inspect the config diff and confirm only the one
learning and any necessary YAML structure changed.

If validation fails, restore valid YAML while preserving the intended learning,
then rerun both checks. Do not broaden the edit to fix unrelated validation
findings.

## Report

Report one of these outcomes:

- **Captured:** identify the config section, summarize the learning, name the
  evidence that qualified it, and report validation results.
- **Updated:** identify the corrected entry and why the previous wording was
  misleading or incomplete.
- **Skipped:** state which durable-bar condition failed or where the knowledge
  is already recoverable.
