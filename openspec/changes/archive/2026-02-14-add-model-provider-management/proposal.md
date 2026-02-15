# Proposal: Add Model Provider Management Feature

**Change ID**: `add-model-provider-management`
**Status**: Draft
**Created**: 2026-02-11

---

## Summary

Implement a comprehensive Model Provider Management feature that allows users to configure multiple AI model service providers through a user-friendly interface. Users can add, edit, and delete model providers with configurable properties including:

- Provider name and display name
- Base URL (API endpoint)
- API Key
- Supported models with their capabilities
- Provider status (active/inactive)

The UI design follows a split-pane layout with a provider list on the left and detailed configuration panel on the right, similar to the reference design.

---

## Context

Currently, the project uses a single global model provider configuration stored in the `settings` table with hardcoded keys like `MODEL_PROVIDER_URL` and `MODEL_PROVIDER_API_KEY`. This approach has several limitations:

1. **Single Provider Limitation**: Only one model provider can be configured at a time
2. **No Model Management**: Models are hardcoded in `chatModel.ts` without UI configuration
3. **Poor Flexibility**: Cannot easily switch between providers or test different models
4. **No Multi-Provider Support**: Cannot use different providers for different use cases

The new feature will:

1. Enable multiple model provider configurations per account
2. Allow dynamic model configuration through the UI
3. Provide a unified interface for managing providers and their models
4. Maintain backward compatibility with existing settings-based configuration

---

## Goals

### Primary Goals

1. **Database Schema**: Create new tables for storing model providers and their associated models
2. **API Layer**: Implement RESTful endpoints for CRUD operations on providers and models
3. **State Management**: Create a Zustand store for managing provider state
4. **User Interface**: Build a split-pane management interface following existing design patterns
5. **Integration**: Update existing chat/agent services to use the new provider system

### Secondary Goals

1. **Validation**: Add input validation for URLs and API keys
2. **Testing**: Support multiple providers during development/testing
3. **Migration**: Provide optional migration path from settings-based to provider-based configuration

---

## Non-Goals

- Implementation of actual AI model invocation (this stays in existing chatModel.ts)
- Provider-specific API key management strategies (e.g., encrypted storage at this phase)
- Multi-region deployment or load balancing across providers
- Real-time provider health monitoring (beyond basic status toggling)

---

## Design Overview

### Database Schema

Two new tables will be added:

1. **`model_providers`** - Stores model provider configurations
2. **`provider_models`** - Stores model configurations for each provider

Each provider belongs to an account (for multi-user scenarios).

### API Structure

```
/api/model-providers/
  GET    - List all providers for current account
  POST   - Create a new provider
  PUT    - Update an existing provider
  DELETE - Delete a provider

/api/model-providers/{id}/models/
  GET    - List models for a provider
  POST   - Add a model to provider
  PUT    - Update a model
  DELETE - Remove a model from provider
```

### State Management

A new Zustand store (`useModelProviderStore`) with slices for:
- Providers list state
- Active provider selection
- Form state (create/edit)
- Loading and error states

### UI Components

1. **Provider List Panel** (left side)
   - List of configured providers
   - Active provider indicator
   - Add new provider button

2. **Provider Config Panel** (right side)
   - Provider name and display name inputs
   - Base URL input with validation
   - API Key input (password type)
   - Status toggle
   - Models list with CRUD operations

---

## Architectural Decisions

### 1. Account-Level Provider Scope

**Decision**: Store providers at account level (linked to `accounts.id`)

**Rationale**:
- Allows different accounts to use different providers
- Aligns with existing `settings` table pattern
- Enables future per-account customization

### 2. Model Providers Table Structure

**Decision**: Separate tables for providers and models (one-to-many relationship)

**Rationale**:
- Normalized database design
- Easier to query and manage models per provider
- Supports future features like model categories, pricing, etc.

### 3. Backward Compatibility

**Decision**: Keep existing `settings` table for global configuration

**Rationale**:
- Gradual migration path
- Existing code continues to work without changes
- Can opt-in to provider-based configuration

### 4. Zustand Store Pattern

**Decision**: Follow existing Zustand slice-based architecture

**Rationale**:
- Consistent with project patterns
- Proven scalability and maintainability
- Built-in devtools support

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing chat functionality | High | Maintain separate code paths; gradual migration |
| API key exposure in database | Medium | Document security considerations; future encryption |
| UI complexity with split-pane | Medium | Use existing patterns from account settings |
| Database migration issues | Medium | Thorough testing; rollback plan |

---

## Open Questions

1. Should we provide a one-click migration from settings to providers?
   - **Recommendation**: Start with manual migration; add automated tool later if needed

2. Should models be user-configurable or curated presets?
   - **Recommendation**: Support both - preset models with option to add custom models

3. How should the system handle default provider selection?
   - **Recommendation**: First active provider as default, with explicit selection option

---

## Alternatives Considered

### Alternative 1: Extend Settings Table

Instead of new tables, use JSON in `settings` table for provider configs.

**Rejected**:
- No strong typing/validation
- Harder to query specific providers
- Violates relational design principles

### Alternative 2: Provider Configuration File

Store provider configs in a config file instead of database.

**Rejected**:
- No per-account isolation
- Requires server restart to apply changes
- Not accessible through UI

---

## Success Criteria

1. Users can successfully add/edit/delete model providers through the UI
2. API endpoints return correct data and handle errors appropriately
3. Database schema is properly migrated
4. UI follows existing design patterns and is responsive
5. Backward compatibility is maintained for existing chat functionality
6. All CRUD operations have appropriate validation and error handling

---

## Next Steps

1. Create detailed design document (`design.md`)
2. Create spec deltas for each capability
3. Create task breakdown (`tasks.md`)
4. Validate proposal with `openspec validate add-model-provider-management --strict`