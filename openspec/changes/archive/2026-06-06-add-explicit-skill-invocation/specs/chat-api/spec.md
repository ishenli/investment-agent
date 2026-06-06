## ADDED Requirements

### Requirement: Explicit Skill Request Protocol
The chat API SHALL accept an optional `explicitSkill` slug for Claude and Hermes chat requests, representing the single skill explicitly invoked for the current user message.

#### Scenario: Claude request accepts explicit skill
- **GIVEN** the frontend sends a POST request to `/api/chat/claude`
- **WHEN** the request body includes `explicitSkill: "code-review"`
- **THEN** the request MUST pass schema validation when the value is a non-empty skill slug string
- **AND** the controller MUST treat `explicitSkill` as a single-message instruction
- **AND** the existing optional `skills` array MUST continue to represent implicit session-level skill activation

#### Scenario: Hermes request accepts explicit skill
- **GIVEN** the frontend sends a POST request to `/api/chat/hermes`
- **WHEN** the request body includes `explicitSkill: "code-review"`
- **THEN** the request MUST pass schema validation when the Hermes engine supports skill prompts
- **AND** the request MUST pass the slug to the Hermes engine context using the existing engine `extra` mechanism or an equivalent typed parameter
- **AND** the absence of `explicitSkill` MUST preserve current Hermes behavior

#### Scenario: Frontend stream parameters include explicit skill
- **GIVEN** the user selected a pending explicit skill in the chat input
- **WHEN** `createAssistantMessageStream` is called
- **THEN** its params MUST include `explicitSkill` with the selected skill slug
- **AND** `bailingLLMStream` MUST forward `explicitSkill` to Claude or Hermes endpoints
- **AND** DeepAgents requests MUST NOT receive `explicitSkill`

#### Scenario: Backward-compatible omission
- **GIVEN** no explicit skill is selected
- **WHEN** the user sends a chat message
- **THEN** the request body MUST omit `explicitSkill` or set it to `undefined`
- **AND** all existing implicit skill injection, mode handling, permission handling, and streaming behavior MUST remain unchanged

### Requirement: Explicit Skill Prompt Precedence
The chat API SHALL give an explicitly invoked skill higher prompt precedence than implicitly enabled skills while keeping both mechanisms compatible.

#### Scenario: Explicit skill prompt injected first
- **GIVEN** the request includes `explicitSkill: "code-review"`
- **AND** the authenticated user can access a skill with slug `code-review`
- **WHEN** the server builds the final system prompt
- **THEN** the prompt for `code-review` MUST be injected before the implicit skills prompt block
- **AND** the injected block MUST clearly identify the skill as explicitly invoked
- **AND** the model instructions MUST communicate that this skill applies to the current user message

#### Scenario: Explicit skill may be outside implicit session filter
- **GIVEN** the request includes `skills: ["lobe-artifacts"]`
- **AND** the request also includes `explicitSkill: "code-review"`
- **WHEN** the server resolves skills
- **THEN** the implicit skills block MUST be filtered by the `skills` array
- **AND** the explicit skill MUST be resolved independently from the `skills` array
- **AND** the explicit skill prompt MUST still be injected if the user can access it

#### Scenario: Duplicate explicit and implicit skill
- **GIVEN** the request includes `explicitSkill: "code-review"`
- **AND** `code-review` also appears in the implicit enabled skills set
- **WHEN** the server builds the final system prompt
- **THEN** the explicit skill prompt MUST be injected only once in the explicit block
- **AND** the implicit skills block MUST NOT duplicate the same full prompt content
- **AND** the implicit skills summary MAY still mention the skill as available if it does not duplicate the prompt body

#### Scenario: Unknown explicit skill
- **GIVEN** the request includes `explicitSkill` with a slug that cannot be resolved for the authenticated user
- **WHEN** the server validates or resolves the skill
- **THEN** the server MUST reject the request with a client error
- **AND** the response MUST NOT fall back to silently ignoring the requested explicit skill
- **AND** no assistant response stream MUST be started

#### Scenario: Empty prompt explicit skill
- **GIVEN** the request includes an accessible explicit skill whose prompt is empty
- **WHEN** the server builds the final system prompt
- **THEN** the server MUST reject the request with a client error explaining that the selected skill has no prompt content
- **AND** no assistant response stream MUST be started

### Requirement: Explicit Skill Observability
The chat API SHALL make explicit skill invocation observable without exposing sensitive prompt content.

#### Scenario: Log explicit skill metadata
- **GIVEN** a request includes `explicitSkill`
- **WHEN** the server starts processing the request
- **THEN** logs SHOULD include the explicit skill slug, session id, engine type, and user id
- **AND** logs MUST NOT include the full skill prompt content

#### Scenario: Prompt debug records preserve precedence
- **GIVEN** prompt recording is enabled for debugging
- **WHEN** a request includes `explicitSkill`
- **THEN** the recorded prompt SHOULD show the explicit skill block before implicit skills
- **AND** the record SHOULD make the single-message scope clear
