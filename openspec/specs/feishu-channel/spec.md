# feishu-channel Specification

## Purpose
TBD - created by archiving change add-feishu-channel. Update Purpose after archive.
## Requirements
### Requirement: WebSocket Channel Lifecycle
The system SHALL connect a configured Feishu enterprise self-built application through the official `@larksuiteoapi/node-sdk` WebSocket client when the Feishu channel is enabled. Repeated direct startup with unchanged effective configuration and shutdown MUST be idempotent. Saving configuration or explicitly restarting MUST force-close the previous SDK client before starting from the persisted configuration. The system MUST rely on the SDK for ping and automatic reconnect behavior.

#### Scenario: Enabled channel starts
- **GIVEN** Feishu is enabled and valid App ID, App Secret, and at least one allowlisted target are available
- **WHEN** the Node.js server instrumentation completes database initialization
- **THEN** the system starts one Feishu WebSocket client and registers `im.message.receive_v1`

#### Scenario: Missing configuration degrades safely
- **GIVEN** Feishu is disabled or required credentials/allowlists are missing
- **WHEN** server startup invokes the Feishu channel task
- **THEN** the task logs a non-secret configuration status and leaves the application running without a Feishu connection

#### Scenario: Repeated direct startup is a no-op
- **GIVEN** a Feishu channel is running with the current effective configuration
- **WHEN** direct startup is requested again without changing that configuration
- **THEN** the existing WebSocket client remains active and no replacement client starts

#### Scenario: Configuration save restarts the channel
- **GIVEN** a Feishu channel is running
- **WHEN** configuration is saved or an explicit restart is requested
- **THEN** the old WebSocket client is force-closed before exactly one replacement client starts

### Requirement: Fast Inbound Handoff
The system SHALL keep the Feishu SDK event callback independent of Agent execution. The callback MUST perform only bounded parsing, policy checks, deduplication, and queue handoff, and MUST NOT await database, model, tool, or outbound message work.

#### Scenario: Slow Agent does not delay callback
- **GIVEN** an authorized text message and an Agent execution that takes longer than three seconds
- **WHEN** the SDK invokes the registered message callback
- **THEN** the callback returns after queue handoff without waiting for the Agent response

### Requirement: Text Message Normalization
The system SHALL accept only non-empty Feishu `text` messages for the initial release and normalize them into the existing `ChannelMessage` contract with `message_id`, `chat_id`, sender `open_id`, chat type, create time, mentions, and reply metadata. For SDK-delivered event envelopes that conform to the registered event schema, unsupported content types, invalid content JSON, and empty text MUST be ignored without invoking the Agent.

#### Scenario: Valid text message is normalized
- **WHEN** Feishu delivers a well-formed text message
- **THEN** the system creates one `ChannelMessage` whose platform is `feishu`, channel ID is derived from `chat_id`, user ID is the sender `open_id`, and content is the parsed text

#### Scenario: Unsupported content is ignored
- **GIVEN** the SDK delivers a schema-conforming message event envelope
- **WHEN** its content is an image, file, card, audio, video, invalid JSON, or empty text
- **THEN** the system does not create a conversation turn or Agent run

### Requirement: Private Chat Authorization
The system MUST authorize private-chat messages exclusively by sender `open_id`. An enabled channel MUST NOT treat display names, union IDs, user IDs, or chat IDs as substitutes for the configured private-user allowlist.

#### Scenario: Allowlisted private user
- **GIVEN** sender `open_id` is present in the private-user allowlist
- **WHEN** the sender sends a private text message
- **THEN** the message is queued for Agent processing

#### Scenario: Non-allowlisted private user
- **GIVEN** sender `open_id` is absent from the private-user allowlist
- **WHEN** the sender sends a private text message
- **THEN** the message is silently ignored

### Requirement: Group Chat Authorization And Mention Gate
The system MUST authorize group messages exclusively by raw Feishu `chat_id`, and MUST additionally require a mention entry whose `open_id` equals the current Bot `open_id`. The Bot mention token MUST be removed from the Agent input. If Bot identity cannot be resolved, group processing MUST fail closed while private chats remain available.

#### Scenario: Authorized group mentions Bot
- **GIVEN** the raw group `chat_id` is allowlisted and mentions contain the current Bot `open_id`
- **WHEN** the group sends a text message
- **THEN** the message is queued once with the Bot mention removed from its content

#### Scenario: Authorized group does not mention Bot
- **GIVEN** the raw group `chat_id` is allowlisted
- **WHEN** a text message does not mention the current Bot
- **THEN** the message is silently ignored

#### Scenario: Group identity unavailable
- **GIVEN** the system cannot resolve the Bot `open_id`
- **WHEN** any group message arrives
- **THEN** the message is ignored and no Agent run starts

### Requirement: Inbound Deduplication And Ordering
Within the lifetime of one active Feishu channel instance, the system MUST deduplicate accepted events by Feishu `message_id` for at least ten minutes. Stop, configuration restart, and process restart MAY reset this in-memory deduplication state. Messages mapped to the same Feishu conversation MUST execute serially in arrival order, while messages in different conversations MAY execute concurrently.

#### Scenario: Duplicate delivery
- **WHEN** the same `message_id` is delivered more than once inside the deduplication window
- **THEN** exactly one user turn, one Agent run, and one outbound reply are produced

#### Scenario: Same conversation concurrency
- **WHEN** two accepted messages for the same `chat_id` arrive before the first Agent run completes
- **THEN** the second message begins processing only after the first message finishes

#### Scenario: Different conversations concurrency
- **WHEN** accepted messages arrive for different `chat_id` values
- **THEN** neither conversation is required to wait for the other conversation's Agent run

### Requirement: Static Markdown Card Replies
The system SHALL send each final Feishu reply as one non-streaming `interactive` message card containing a single Markdown element. Empty replies MUST use a visible fallback, and replies longer than 4,000 source characters MUST be truncated after the first 4,000 characters with a truncation notice.

#### Scenario: Markdown reply is rendered as a card
- **WHEN** Hermes or a channel command produces a non-empty final reply
- **THEN** the system replies to the originating message with one `interactive` card whose single element has tag `markdown`

#### Scenario: Empty or oversized reply is bounded
- **WHEN** the final reply is empty or longer than 4,000 characters
- **THEN** the card contains either the Agent-empty fallback or the first 4,000 characters followed by a truncation notice

### Requirement: Persistent Hermes Conversation
The system SHALL map each Feishu `channelId` to an existing or automatically created chat session, load recent user/assistant history, persist the inbound user turn, run the shared Hermes engine with platform `feishu`, persist the final assistant turn, and reply to the originating Feishu message.

#### Scenario: First message creates session
- **WHEN** an authorized Feishu conversation sends its first accepted message
- **THEN** the system creates one chat session owned by the default application user and stores both user and assistant turns

#### Scenario: Existing conversation resumes history
- **GIVEN** a Feishu chat session already contains prior turns
- **WHEN** another accepted message arrives for the same channel ID
- **THEN** recent history is passed to Hermes before the current message and the same session is reused

#### Scenario: Clear command
- **WHEN** an authorized conversation sends `/clear` or `clear`
- **THEN** the system deletes that session's messages and sends a confirmation without invoking Hermes

### Requirement: Secure Feishu Configuration
The system SHALL expose settings for enabled state, App ID, App Secret replacement, private-user `open_id` allowlist, and group `chat_id` allowlist. Under the local single-user deployment model, the App Secret SHALL be stored directly in local settings without requiring an additional encryption key. App Secret MUST NOT be returned by any settings/status API or written to logs, and the system MAY use `FEISHU_APP_SECRET` directly from the environment.

#### Scenario: Read configuration
- **GIVEN** an App Secret exists in the environment or local settings
- **WHEN** the client requests Feishu settings or status
- **THEN** the response indicates whether a secret is configured without containing the secret or a reversible mask

#### Scenario: Persist secret locally
- **WHEN** the local operator submits a new App Secret
- **THEN** the App Secret is stored in local settings and subsequent channel startup can use it without an additional encryption key

### Requirement: Feishu Permission Model
The manually configured text-in/card-out setup SHALL use the Feishu Bot capability, long-connection `im.message.receive_v1` event, and the permissions needed to receive private/group-at messages and send Bot messages. Automatic App Registration uses Feishu's provider-defined `PersonalAgent` template; the application does not request or verify a narrower scope set for that path.

#### Scenario: Administrator configures Feishu application
- **WHEN** an administrator follows the channel setup instructions
- **THEN** the manual setup uses `im:message.p2p_msg:readonly`, `im:message.group_at_msg:readonly`, and `im:message:send_as_bot`

#### Scenario: Automatic registration uses provider template
- **WHEN** the system begins automatic App Registration
- **THEN** it requests the `PersonalAgent` archetype without claiming that the returned application's permissions are limited to the manual three-permission set

### Requirement: Automatic Feishu App Registration
The system SHALL let the local single-user application start a Feishu `PersonalAgent` App Registration device flow without browser cookie or Bearer authentication and authorize it through a browser link or locally rendered QR code. Registration sessions MUST be unpredictable, expire, support cancellation, and remain bound to the server-selected default application user. Manual Feishu App ID and App Secret configuration MUST remain available as a fallback; automatic registration owns Feishu-to-Lark domain switching.

#### Scenario: Registration begins
- **WHEN** the local operator starts automatic registration
- **THEN** the system selects the default application user and returns an owner-bound session ID and `verificationUrl` without returning a device code or secret

#### Scenario: Registration completes securely
- **GIVEN** the administrator authorizes creation and Feishu returns an App ID, App Secret, and authorizer `open_id`
- **WHEN** credential verification through `tenant_access_token` and `bot.info` succeeds
- **THEN** the system stores the App Secret locally, stores the App ID and tenant domain, adds the authorizer `open_id` to the private allowlist, enables the channel, attempts a restart, and returns only public Bot/configuration status

#### Scenario: Registration persists despite restart failure
- **GIVEN** registration credentials were verified and persisted but restarting the Feishu channel fails
- **WHEN** registration completion is returned
- **THEN** the session remains `completed`, includes `restartError: true`, and the settings UI tells the operator to save or restart the channel manually

#### Scenario: Polling respects device flow state
- **WHEN** Feishu reports authorization pending, slow down, denial, expiration, or a Lark tenant
- **THEN** the system preserves pending state with the required interval, terminates denied/expired sessions with a stable error code, or switches to the matching Lark endpoints without exposing upstream credentials

#### Scenario: Registration is unavailable
- **WHEN** tenant policy, network failure, local storage failure, or credential verification prevents automatic registration
- **THEN** the system reports a non-secret error and leaves manual credential configuration available

