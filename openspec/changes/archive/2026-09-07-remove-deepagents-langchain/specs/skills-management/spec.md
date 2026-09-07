## MODIFIED Requirements

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

#### Scenario: No explicit skill picker for engines without skill support
- **GIVEN** the current chat session uses an engine that does not support explicit skills (there is no such engine after the DeepAgents removal; kept as a guard for future engines)
- **WHEN** the chat input renders
- **THEN** the system MUST NOT display the explicit skill trigger
- **AND** typing `/` or `@` MUST NOT open the skill picker

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