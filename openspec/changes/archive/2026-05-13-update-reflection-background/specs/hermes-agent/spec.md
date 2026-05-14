# Hermes Agent Specification Delta

## ADDED Requirements

### Requirement: Background Reflection Review

The Hermes Agent MUST support asynchronous background reflection review that runs independently from the main conversation turn.

#### Scenario: Background review spawns after turn completes
- **WHEN** a conversation turn completes successfully (not interrupted, has final response)
- **AND** the reflection trigger conditions are met (turn count or iteration count thresholds)
- **THEN** the agent MUST spawn a background thread to perform reflection review
- **AND** the main response MUST return immediately without waiting for reflection to complete

#### Scenario: Background review uses isolated message snapshot
- **WHEN** a background review is spawned
- **THEN** it MUST operate on a copy of the conversation messages
- **AND** it MUST NOT modify the main session's conversation history
- **AND** any memory or skill updates MUST be written to shared stores

#### Scenario: Background review trigger by turn count
- **GIVEN** `reflectionConfig.turnNudgeInterval` is set to a positive integer N
- **WHEN** the user turn count is a multiple of N
- **THEN** background memory review MUST be triggered

#### Scenario: Background review trigger by iteration count
- **GIVEN** `reflectionConfig.iterationNudgeInterval` is set to a positive integer M
- **WHEN** the tool-calling iterations in a turn reach or exceed M
- **THEN** background skill review MUST be triggered

#### Scenario: Background review failure isolation
- **WHEN** the background review encounters an error
- **THEN** the error MUST be logged but MUST NOT affect the main conversation
- **AND** the error MUST be reported via `onBackgroundReviewComplete` callback if provided

#### Scenario: Background review completion callback
- **GIVEN** `callbacks.onBackgroundReviewComplete` is defined
- **WHEN** a background review completes (success or failure)
- **THEN** the callback MUST be invoked with the review result summary

## MODIFIED Requirements

### Requirement: Reflection Configuration

The `ReflectionConfig` interface MUST be extended to support background review configuration.

#### Scenario: Enable background review mode
- **GIVEN** `reflectionConfig.enabled` is true
- **AND** `reflectionConfig.backgroundMode` is true (default)
- **THEN** reflection MUST run asynchronously in a background thread
- **AND** the main conversation MUST NOT be blocked

#### Scenario: Disable background review (synchronous mode)
- **GIVEN** `reflectionConfig.enabled` is true
- **AND** `reflectionConfig.backgroundMode` is false
- **THEN** reflection MUST run synchronously (blocking mode)
- **AND** the main response MUST wait for reflection to complete

### Requirement: Reflection Callbacks

The `AgentCallbacks` interface MUST be extended with background review lifecycle callbacks.

#### Scenario: Review start notification
- **GIVEN** `callbacks.onBackgroundReviewStart` is defined
- **WHEN** a background review thread starts
- **THEN** the callback MUST be invoked with the trigger type

#### Scenario: Review complete notification
- **GIVEN** `callbacks.onBackgroundReviewComplete` is defined
- **WHEN** a background review thread completes
- **THEN** the callback MUST be invoked with the review summary (skills created, memory updated, or error)
