## ADDED Requirements

### Requirement: Controlled UI Artifact Protocol
The system SHALL represent generated chat UI as structured `UIArtifact` JSON attached to a chat message, while preserving the message `content` string as the authoritative text fallback.

#### Scenario: Assistant message contains generated UI artifacts
- **GIVEN** an assistant response includes richer investment UI
- **WHEN** the response is stored or rendered
- **THEN** the message MUST contain normal `content: string`
- **AND** the message MAY contain `uiArtifacts: UIArtifact[]`
- **AND** every artifact MUST include `id`, `type`, `version`, `props`, and `fallbackText`
- **AND** every artifact MUST use `version: 1`

#### Scenario: Old text-only message remains compatible
- **GIVEN** a historical message has only `content`
- **WHEN** the chat list renders that message
- **THEN** the system MUST render the text message normally
- **AND** the system MUST NOT require `uiArtifacts`

### Requirement: UI Artifact Whitelist and Schema Validation
The system SHALL render only whitelisted artifact types whose props pass type-specific Zod validation.

#### Scenario: Whitelisted artifact renders through registry
- **GIVEN** a message contains a `uiArtifacts` entry with `type: "stock_quote_card"`
- **WHEN** the renderer receives the artifact
- **THEN** the system MUST find the type in the component registry
- **AND** validate the artifact with the registered Zod schema
- **AND** render the registered React component when validation succeeds

#### Scenario: Unknown artifact type falls back safely
- **GIVEN** a message contains a `uiArtifacts` entry with a type that is not registered
- **WHEN** the renderer receives the artifact
- **THEN** the system MUST NOT render arbitrary UI
- **AND** the system MUST display `fallbackText` or a lightweight error state
- **AND** the rest of the chat message MUST remain usable

#### Scenario: Invalid props do not crash chat
- **GIVEN** a whitelisted artifact has props that fail schema validation
- **WHEN** the renderer validates the artifact
- **THEN** the system MUST NOT render the component
- **AND** the system MUST display `fallbackText` or a lightweight error state
- **AND** the validation failure MUST NOT interrupt rendering of other artifacts or messages

### Requirement: Generative UI Renderer Placement
The system SHALL render generated UI artifacts inline below assistant message text in the chat list.

#### Scenario: Artifact appears below assistant markdown
- **GIVEN** an assistant message has both `content` and valid `uiArtifacts`
- **WHEN** `AssistantMessage` or `ChatItem` renders the message
- **THEN** markdown text MUST render first
- **AND** `GenerativeUIRenderer` MUST render validated artifacts below the text body
- **AND** generated UI MUST be scoped to the message bubble rather than the portal/sidebar artifact area

#### Scenario: Virtualized list remains stable
- **GIVEN** a long chat list uses virtualized rendering
- **WHEN** generated UI cards appear in assistant messages
- **THEN** cards MUST use stable width constraints and reasonable minimum heights
- **AND** chart components SHOULD lazy load when practical
- **AND** rendering MUST avoid obvious scroll-height jitter or blocking for normal text messages

### Requirement: Supported Investment Artifact Types
The system SHALL define a controlled set of investment UI artifact types for generated chat UI.

#### Scenario: Stock quote card artifact
- **GIVEN** an artifact has `type: "stock_quote_card"`
- **WHEN** it passes validation
- **THEN** it MUST support stock symbol, display name, price, change, change percent, key metrics, and bounded mini-trend data
- **AND** it MUST be suitable for the first POC implementation

#### Scenario: Fund detail panel artifact
- **GIVEN** an artifact has `type: "fund_detail_panel"`
- **WHEN** it passes validation
- **THEN** it MUST support fund name, return metrics, risk level, and bounded holdings allocation data

#### Scenario: Data chart artifact
- **GIVEN** an artifact has `type: "data_chart"`
- **WHEN** it passes validation
- **THEN** it MUST support only registered chart types such as line, bar, and pie
- **AND** it MUST enforce maximum series and data point limits

#### Scenario: Trade intent card artifact
- **GIVEN** an artifact has `type: "trade_intent_card"`
- **WHEN** it passes validation
- **THEN** it MUST represent only a pending buy or sell intent
- **AND** it MUST NOT execute a trade directly from model output

### Requirement: Financial UI Safety Boundaries
The system SHALL prevent generated UI from bypassing security, audit, and trading controls.

#### Scenario: Model output cannot inject executable UI
- **GIVEN** the model or agent produces generated UI data
- **WHEN** the system accepts the output
- **THEN** the output MUST be JSON only
- **AND** the system MUST reject JSX, HTML, script, style, iframe, or arbitrary component names

#### Scenario: Trade intent requires explicit confirmation
- **GIVEN** a user clicks an action in a `trade_intent_card`
- **WHEN** the confirmation flow starts
- **THEN** the client MUST call a controlled `confirmTradeIntent` flow
- **AND** the server MUST re-check account ownership, permissions, current price or quote validity, risk controls, and idempotency key
- **AND** the original artifact MUST NOT be sufficient to execute a trade

#### Scenario: Artifact fallback is available for non-visual flows
- **GIVEN** a message with generated UI is copied, shared, exported, or rendered on an unsupported client
- **WHEN** the system needs text output
- **THEN** it MUST include the artifact `fallbackText`
- **AND** the key investment information MUST remain understandable without the visual component
