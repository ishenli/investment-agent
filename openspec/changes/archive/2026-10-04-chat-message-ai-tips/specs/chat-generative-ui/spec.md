# Spec Delta

## ADDED Requirements

### Requirement: Per-Message Follow-up Suggestion Display
The system SHALL render, inline below every assistant chat message that carries a non-empty `related` array, a suggestion panel of up to 3 clickable follow-up questions. Clicking a suggestion SHALL fill the chat input with that question and send it as a new user message. Assistant messages without `related` MUST NOT render the suggestion panel.

#### Scenario: Every assistant message with suggestions renders them
- **GIVEN** a conversation contains multiple assistant messages, each with a non-empty `related` array
- **WHEN** the chat list renders the conversation
- **THEN** the system MUST render the suggestion panel below each of those assistant messages
- **AND** the system MUST NOT restrict rendering to only the newest assistant message

#### Scenario: At most three suggestions render
- **GIVEN** an assistant message whose `related` array contains 5 items
- **WHEN** the message renders
- **THEN** the system MUST render only the first 3 items as suggestions

#### Scenario: Legacy or unrelated message renders no panel
- **GIVEN** an assistant message without `related` or with an empty `related` array
- **WHEN** the message renders
- **THEN** the system MUST NOT render the suggestion panel below it
- **AND** the message content MUST render normally

#### Scenario: Clicking a suggestion sends it
- **GIVEN** the suggestion panel is rendered below an assistant message
- **WHEN** the user clicks one of the suggestion chips
- **THEN** the chat input MUST be filled with the suggestion text
- **AND** a new user message with that text MUST be sent
- **AND** clickable suggestions MUST remain available for every rendered message, not only the newest

## MODIFIED Requirements

_无。既有 chat-generative-ui (生成的 UI Artifact) 行为不变,本 capability 仅新增"追问建议渲染"行为。_