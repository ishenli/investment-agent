## ADDED Requirements

### Requirement: Chat Stream UI Artifact Events
The chat API SHALL support streaming generated UI artifact events alongside normal text deltas, allowing the frontend to update `content` and `uiArtifacts` on the same assistant message.

#### Scenario: Agent emits artifact during assistant response
- **GIVEN** the agent is streaming an assistant response
- **WHEN** a controlled UI artifact tool produces a valid `UIArtifact`
- **THEN** the stream MUST emit an artifact event that includes the target message id and artifact payload
- **AND** the frontend stream parser MUST append or update the artifact in the assistant message `uiArtifacts`
- **AND** text streaming MUST continue independently of the artifact event

#### Scenario: Artifact event fails validation server-side
- **GIVEN** the agent attempts to emit a UI artifact
- **WHEN** the artifact fails server-side schema validation
- **THEN** the API MUST NOT stream the invalid artifact to the client
- **AND** the API MUST continue the text response when possible
- **AND** the API SHOULD include safe fallback text in the assistant `content`

### Requirement: Controlled UI Artifact Creation Tool
The chat agent layer SHALL expose controlled artifact creation through a business tool rather than allowing the model to freely construct arbitrary UI payloads.

#### Scenario: Tool creates stock quote card artifact
- **GIVEN** a user asks for a stock quote and market data tools return structured quote data
- **WHEN** the agent decides a richer UI is useful
- **THEN** it MUST call a controlled artifact creation tool with `type: "stock_quote_card"`, validated props, and `fallbackText`
- **AND** the tool MUST return a normalized `UIArtifact`
- **AND** the stream layer MUST expose that artifact through a UI artifact event

#### Scenario: Text-only answer remains allowed
- **GIVEN** the user asks a normal conversational question
- **WHEN** no registered UI artifact adds value
- **THEN** the agent MAY return only text
- **AND** the API MUST NOT require an artifact event
