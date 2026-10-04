# Spec Delta

## ADDED Requirements

### Requirement: Domain-Gated Follow-up Question Emission
The system SHALL, when an assistant reply in a chat stream completes, emit a `related` SSE event carrying zero to three investment-domain follow-up questions. When the conversation is not investment-domain relevant, or when follow-up generation fails or times out, the system SHALL emit the `related` event with an empty items array. The follow-up generation MUST NOT block, delay, or alter the already-delivered assistant reply.

#### Scenario: Investment-domain reply emits up to three follow-up questions
- **GIVEN** an assistant reply address an investment topic (e.g. stock analysis, market data)
- **WHEN** the reply stream completes
- **THEN** the system MUST emit a `related` SSE event before the stream end
- **AND** the event MUST carry an items array of 1 to 3 questions derived from the reply
- **AND** the items MUST NOT exceed 3 in number

#### Scenario: Non-investment reply emits no follow-up questions
- **GIVEN** an assistant reply whose conversation does not match investment-domain keywords
- **WHEN** the reply stream completes
- **THEN** the system MUST emit a `related` SSE event with an empty items array

#### Scenario: Follow-up generation failure degrades cleanly
- **GIVEN** the follow-up LLM call fails, returns malformed output, or exceeds the generation timeout
- **WHEN** the reply stream completes
- **THEN** the system MUST emit a `related` SSE event with an empty items array
- **AND** the already-delivered assistant reply MUST remain unchanged
- **AND** the stream MUST NOT be terminated or errored because of the failure

#### Scenario: Related event precedes the done event
- **GIVEN** a completed assistant turn that has follow-up questions
- **WHEN** the stream ends
- **THEN** the `related` event MUST be emitted after the final text delta and before the `done` event
- **AND** the event MUST target the assistant message the questions correspond to, so the frontend persists them onto that message

### Requirement: Feature Toggle Gate for Follow-up Emission
The system SHALL only generate and emit follow-up questions when the account's conversation-settings feature toggle is enabled. When the toggle is disabled, the system MUST skip follow-up generation and MUST NOT emit a `related` event for the assistant reply. When no per-account value is configured, the system SHALL treat the feature as enabled.

#### Scenario: Toggle disabled suppresses follow-up emission
- **GIVEN** an account whose `CHAT_AI_TIPS_ENABLED` setting is set to disabled
- **WHEN** an investment-domain assistant reply completes
- **THEN** the system MUST skip follow-up generation
- **AND** MUST NOT emit a `related` event for that reply
- **AND** the assistant reply stream MUST proceed and close normally

#### Scenario: Toggle unset defaults to enabled
- **GIVEN** an account has no `CHAT_AI_TIPS_ENABLED` value configured
- **WHEN** an investment-domain assistant reply completes
- **THEN** the system MUST treat the feature as enabled
- **AND** MUST proceed with follow-up generation as usual

#### Scenario: Toggle re-enabled resumes emission
- **GIVEN** an account toggles the feature back on
- **WHEN** a subsequent investment-domain assistant reply completes
- **THEN** the system MUST emit a `related` event for that reply
- **AND** the emission MUST still carry at most 3 items

## MODIFIED Requirements

_无。既有 chat-api 行为不变,本 capability 仅新增"相关追问事件"行为。_