## ADDED Requirements

### Requirement: Chat Input Explicit Skill Selection
The system SHALL let users explicitly select one enabled skill for the next chat message when the current chat engine supports skills.

#### Scenario: Trigger skill picker from composer
- **GIVEN** the current chat session uses the `claude` or `hermes` engine
- **AND** the user focuses the chat input
- **WHEN** the user types `/` or `@` at a command boundary, or clicks the explicit skill trigger in the action bar
- **THEN** the system MUST open a skill picker anchored to the input area
- **AND** the picker MUST list only skills available to the current session
- **AND** skills MUST be grouped by category when category metadata exists
- **AND** the picker MUST support filtering by skill name, description, and slug

#### Scenario: Hide explicit skill picker for DeepAgents
- **GIVEN** the current chat session uses the `deepagents` engine
- **WHEN** the chat input renders
- **THEN** the system MUST NOT display the explicit skill trigger
- **AND** typing `/` or `@` MUST NOT open the skill picker
- **AND** the existing DeepAgents plugin tools UI MUST remain unchanged

#### Scenario: Keyboard navigation
- **GIVEN** the explicit skill picker is open
- **WHEN** the user presses `ArrowDown` or `ArrowUp`
- **THEN** the highlighted skill MUST move through the visible skill options
- **WHEN** the user presses `Enter`
- **THEN** the highlighted skill MUST be selected
- **WHEN** the user presses `Escape`
- **THEN** the picker MUST close without changing the selected explicit skill

#### Scenario: Empty available skills
- **GIVEN** no skills are enabled or available for the current session
- **WHEN** the user opens the explicit skill picker
- **THEN** the picker MUST display an empty state explaining that no skills are available
- **AND** the picker SHOULD provide a navigation action to the skills settings page

### Requirement: Message-Level Skill Chip
The system SHALL show the selected explicit skill as a removable chip in the chat input until the current message is sent or the user removes it.

#### Scenario: Select explicit skill
- **GIVEN** the explicit skill picker is open
- **WHEN** the user selects a skill
- **THEN** the system MUST store that skill slug as the current session's pending explicit skill
- **AND** the input area MUST render a Skill Chip with the skill icon or fallback icon, display name, and accessible label
- **AND** the picker MUST close
- **AND** the user MUST be able to continue typing normal text

#### Scenario: Remove or replace explicit skill
- **GIVEN** a Skill Chip is visible in the input area
- **WHEN** the user clicks the chip remove control
- **THEN** the pending explicit skill MUST be cleared
- **WHEN** the user opens the picker and selects another skill
- **THEN** the pending explicit skill MUST be replaced with the newly selected skill

#### Scenario: Disable chip mutation while sending
- **GIVEN** a message is being sent or the assistant response is streaming
- **WHEN** the Skill Chip renders
- **THEN** the chip MUST be disabled
- **AND** the user MUST NOT be able to remove or replace the pending explicit skill until the send lifecycle allows input changes again

#### Scenario: Clear after single-use send
- **GIVEN** a pending explicit skill is selected
- **WHEN** the user sends the current message successfully
- **THEN** the system MUST include the selected skill slug in the outgoing chat request
- **AND** the pending explicit skill MUST be cleared after the send is accepted
- **AND** subsequent messages MUST NOT reuse that skill unless the user selects it again

### Requirement: Session Pending Explicit Skill State
The skills store SHALL maintain pending explicit skill state separately from session-level implicit skill activation.

#### Scenario: Pending explicit skill does not alter implicit skills
- **GIVEN** a session has implicit skill activation stored in `sessionActiveSkills`
- **WHEN** the user selects a pending explicit skill for one message
- **THEN** the system MUST NOT add or remove slugs from `sessionActiveSkills`
- **AND** the implicit `skills` payload for the session MUST remain unchanged

#### Scenario: Reset pending skill on session switch
- **GIVEN** a pending explicit skill exists for session A
- **WHEN** the user switches to session B
- **THEN** session B MUST NOT inherit session A's pending explicit skill
- **AND** returning to session A MAY restore its pending explicit skill only if the message was not sent and the input draft is still active
