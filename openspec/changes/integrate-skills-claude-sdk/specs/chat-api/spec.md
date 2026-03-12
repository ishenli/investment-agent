## ADDED Requirements

### Requirement: Skills Context Injection into Claude SDK systemPrompt
The system SHALL inject enabled Skills prompt content into the `systemPrompt` field of `streamClaude()` when processing requests via the `/api/chat/claude` endpoint, so that the Claude Agent SDK subprocess receives skill guidance as part of its system context.

#### Scenario: Global skills injected by default
- **GIVEN** a user has one or more skills with `isEnabled = true`
- **WHEN** a POST request is made to `/api/chat/claude` without a `skills` field
- **THEN** the system MUST call `skillService.getEnabledSkills(userId)` to fetch all enabled skills
- **AND** build a `skillsSystemPrompt` string by concatenating each skill's prompt under a `## Skill: <name>` heading
- **AND** pass the combined system prompt to `streamClaude()` as `systemPrompt`
- **AND** skills with empty prompt content MUST be excluded from the concatenation

#### Scenario: Session-level skills filter
- **GIVEN** a POST request to `/api/chat/claude` contains `skills: ["lobe-artifacts"]`
- **WHEN** the system builds the skills system prompt
- **THEN** it MUST filter the globally enabled skills to only those whose `slug` is in the `skills` array
- **AND** only the matching skills' prompts MUST be injected into `systemPrompt`
- **AND** other globally enabled skills MUST NOT be injected in this request

#### Scenario: Empty skills array disables session-level filter
- **GIVEN** a POST request to `/api/chat/claude` contains `skills: []`
- **WHEN** the system builds the skills system prompt
- **THEN** all globally enabled skills MUST be injected (empty array means "no restriction")

#### Scenario: No enabled skills results in no skills injection
- **GIVEN** a user has no enabled skills OR all enabled skills have empty prompts
- **WHEN** a POST request is made to `/api/chat/claude`
- **THEN** `skillsSystemPrompt` MUST be empty or undefined
- **AND** `streamClaude()` MUST be called with `systemPrompt: undefined` (or only the mode override if present)

#### Scenario: Mode override and skills prompts are combined
- **GIVEN** the request mode is `'ask'` (which sets a `systemPromptOverride`) AND skills are enabled
- **WHEN** the system builds the final system prompt
- **THEN** `systemPromptOverride` and `skillsSystemPrompt` MUST both be included, joined with `\n\n`
- **AND** the order MUST be: mode override first, then skills prompts

---

### Requirement: Claude SDK Chat Session-Level Skill Activation
The system SHALL support an optional `skills` field in the Claude SDK chat request body that allows callers to specify which skill slugs should be activated for the current session, overriding the default behaviour of using all globally enabled skills.

#### Scenario: Request schema accepts skills field
- **WHEN** a POST request is sent to `/api/chat/claude` with `skills: ["slug1", "slug2"]`
- **THEN** the request MUST pass schema validation
- **AND** the `skills` field MUST be treated as an array of skill slugs to activate

#### Scenario: Request without skills field uses global defaults
- **WHEN** a POST request is sent to `/api/chat/claude` without a `skills` field
- **THEN** the `skills` field MUST default to `undefined`
- **AND** all globally enabled skills for the user MUST be used
