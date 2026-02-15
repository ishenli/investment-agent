# Design Document: Model Provider Management

**Change ID**: `add-model-provider-management`
**Status**: Draft

---

## Overview

This document describes the technical design for implementing a model provider management system. The system allows users to configure multiple AI model service providers with their associated models through a web interface.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  ModelProviderPage (Split-pane UI)                              │
│  ├─ ProviderListPanel (Left)                                    │
│  └─ ProviderConfigPanel (Right)                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        State Management                          │
├─────────────────────────────────────────────────────────────────┤
│  useModelProviderStore (Zustand)                                │
│  ├─ ProviderSlice (list, active, loading, error)                │
│  ├─ ModelSlice (models for selected provider)                   │
│  └─ FormSlice (draft data for create/edit)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                                │
├─────────────────────────────────────────────────────────────────┤
│  /api/model-providers (route.ts)                                │
│  └─ ModelProviderHttpController (static methods)                │
│                                                                 │
│  /api/model-providers/[id]/models (route.ts)                    │
│  └─ ProviderModelHttpController (static methods)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                        │
├─────────────────────────────────────────────────────────────────┤
│  ModelProviderBizController                                      │
│  - @WithRequestContext() decorator                              │
│  - Zod validation schemas                                       │
│  - AuthService for user authentication                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Service Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  modelProviderService                                            │
│  ✓ - CRUD operations for model_providers                        │
│  ✓ - CRUD operations for provider_models                        │
│  ✓ - Account-level filtering                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Data Access Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  Drizzle ORM + SQLite                                            │
│  ✓ - model_providers table                                      │
│  ✓ - provider_models table                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### model_providers Table

```sql
CREATE TABLE model_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL,
  slug TEXT NOT NULL UNIQUE,           -- Unique identifier (e.g., 'openai', 'anthropic')
  name TEXT NOT NULL,                  -- Display name (e.g., 'OpenAI')
  base_url TEXT NOT NULL,              -- API endpoint URL
  api_key TEXT,                        -- Optional API key (can be stored in settings for security)
  is_active INTEGER NOT NULL DEFAULT 1, -- Boolean: 1=active, 0=inactive
  display_order INTEGER NOT NULL DEFAULT 0, -- Sort order
  description TEXT,                    -- Provider description
  created_at INTEGER NOT NULL,         -- Timestamp (mode: 'timestamp')
  updated_at INTEGER NOT NULL,         -- Timestamp (mode: 'timestamp')
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);
CREATE INDEX idx_model_providers_account_id ON model_providers(account_id);
CREATE INDEX idx_model_providers_slug ON model_providers(slug);
```

### provider_models Table

```sql
CREATE TABLE provider_models (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider_id INTEGER NOT NULL,
  slug TEXT NOT NULL,                  -- Model identifier (e.g., 'gpt-4', 'claude-3.5')
  name TEXT NOT NULL,                  -- Display name (e.g., 'GPT-4')
  context_window INTEGER,              -- Context window size in tokens
  supports_vision INTEGER DEFAULT 0,   -- Boolean: supports vision?
  supports_function_calling INTEGER DEFAULT 0, -- Boolean: supports function calling?
  is_active INTEGER NOT NULL DEFAULT 1, -- Boolean: 1=active, 0=inactive
  display_order INTEGER NOT NULL DEFAULT 0, -- Sort order
  created_at INTEGER NOT NULL,         -- Timestamp (mode: 'timestamp')
  updated_at INTEGER NOT NULL,         -- Timestamp (mode: 'timestamp')
  FOREIGN KEY (provider_id) REFERENCES model_providers(id) ON DELETE CASCADE
);
CREATE INDEX idx_provider_models_provider_id ON provider_models(provider_id);
CREATE INDEX idx_provider_models_slug ON provider_models(slug);
```

### Drizzle Schema Definition

```typescript
// drizzle/schema.ts additions

export const modelProviders = sqliteTable('model_providers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id')
    .notNull()
    .references(() => accounts.id),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  baseUrl: text('base_url').notNull(),
  apiKey: text('api_key'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  displayOrder: integer('display_order').notNull().default(0),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const providerModels = sqliteTable('provider_models', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  providerId: integer('provider_id')
    .notNull()
    .references(() => modelProviders.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  contextWindow: integer('context_window'),
  supportsVision: integer('supports_vision', { mode: 'boolean' }).default(false),
  supportsFunctionCalling: integer('supports_function_calling', { mode: 'boolean' }).default(false),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

---

## API Design

### Endpoints

#### Model Providers

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/model-providers` | List all providers for current account |
| POST | `/api/model-providers` | Create a new provider |
| PUT | `/api/model-providers` | Update an existing provider |
| DELETE | `/api/model-providers` | Delete a provider (by id in body) |

#### Provider Models

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/model-providers/{id}/models` | List models for a provider |
| POST | `/api/model-providers/{id}/models` | Add a model to provider |
| PUT | `/api/model-providers/{id}/models` | Update a model |
| DELETE | `/api/model-providers/{id}/models` | Remove a model from provider |

### Request/Response Schemas

```typescript
// ModelProvider creation/update
interface CreateModelProviderRequest {
  name: string;
  slug: string;
  baseUrl: string;
  apiKey?: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
}

interface ModelProviderResponse {
  id: number;
  accountId: number;
  slug: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  isActive: boolean;
  displayOrder: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Provider Model creation/update
interface CreateProviderModelRequest {
  slug: string;
  name: string;
  contextWindow?: number;
  supportsVision?: boolean;
  supportsFunctionCalling?: boolean;
  isActive?: boolean;
  displayOrder?: number;
}

interface ProviderModelResponse {
  id: number;
  providerId: number;
  slug: string;
  name: string;
  contextWindow?: number;
  supportsVision: boolean;
  supportsFunctionCalling: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## State Management Design

### Store Structure

```
src/app/store/modelProvider/
├── initialState.ts          # Combined initial state
├── store.ts                 # Store creation and export
├── slices/
│   ├── providers/
│   │   ├── initialState.ts  # Providers list state
│   │   ├── action.ts        # Providers CRUD actions
│   │   └── selector.ts      # Providers selectors
│   ├── models/
│   │   ├── initialState.ts  # Models state for selected provider
│   │   ├── action.ts        # Models CRUD actions
│   │   └── selector.ts      # Models selectors
│   └── form/
│       ├── initialState.ts  # Form draft state
│       ├── action.ts        # Form actions (reset, update, submit)
│       └── selector.ts      # Form selectors
```

### State Interfaces

```typescript
// providers/initialState.ts
export interface ProvidersState {
  providers: ModelProvider[];
  activeProviderId: number | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
}

// models/initialState.ts
export interface ModelsState {
  models: ProviderModel[];
  providerId: number | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
}

// form/initialState.ts
export interface FormState {
  mode: 'create' | 'edit' | 'model-create' | 'model-edit';
  draftProvider: Partial<ModelProvider>;
  draftModel: Partial<ProviderModel>;
  isDirty: boolean;
  errors: Record<string, string>;
}

// initialState.ts (combined)
export interface ModelProviderStoreState
  extends ProvidersState,
    ModelsState,
    FormState {}
```

### Key Actions

```typescript
// providers/action.ts
interface ProvidersAction {
  fetchProviders: () => Promise<void>;
  createProvider: (provider: CreateModelProviderRequest) => Promise<void>;
  updateProvider: (id: number, provider: CreateModelProviderRequest) => Promise<void>;
  deleteProvider: (id: number) => Promise<void>;
  setActiveProvider: (id: number | null) => void;
  setProvidersLoading: (loading: boolean) => void;
  setProvidersError: (error: string | null) => void;
}

// models/action.ts
interface ModelsAction {
  fetchModels: (providerId: number) => Promise<void>;
  createModel: (providerId: number, model: CreateProviderModelRequest) => Promise<void>;
  updateModel: (modelId: number, model: CreateProviderModelRequest) => Promise<void>;
  deleteModel: (modelId: number) => Promise<void>;
  setModelsLoading: (loading: boolean) => void;
  setModelsError: (error: string | null) => void;
}

// form/action.ts
interface FormAction {
  resetForm: () => void;
  setDraftProvider: (provider: Partial<ModelProvider>) => void;
  setDraftModel: (model: Partial<ProviderModel>) => void;
  setFormMode: (mode: FormState['mode']) => void;
  setFormError: (field: string, error: string) => void;
  clearFormError: (field: string) => void;
  submitProvider: () => Promise<void>;
  submitModel: () => Promise<void>;
}
```

---

## UI Component Design

### Page Structure

```
src/app/(pages)/model-providers/page.tsx
└── <ModelProviderPage>
    ├─ <ProviderListPanel>
    │   ├─ Header (Title + Add Button)
    │   ├─ ProviderList
    │   │   └─ <ProviderListItem> × N
    │   └─ Empty State
    └─ <ProviderConfigPanel>
        ├─ Header (Title + Actions)
        ├─ <ProviderForm> (when creating/editing)
        │   ├─ Name Input
        │   ├─ Slug Input
        │   ├─ Base URL Input
        │   ├─ API Key Input (password)
        │   ├─ Description Textarea
        │   ├─ Status Toggle
        │   └─ Form Actions (Save/Cancel)
        └─ <ModelsSection> (when viewing provider)
            ├─ Models List
            │   └─ <ModelListItem> × N
            └─ Add Model Button
```

### Component Descriptions

#### ProviderListPanel

Left-side panel showing all configured providers:
- Responsive list with selection indicator
- Status badge (active/inactive)
- Hover effects with border highlight
- Add new provider button (top right)
- Empty state with illustration

#### ProviderConfigPanel

Right-side panel for provider configuration:
- **Create/Edit Mode**: Form with validation
- **View Mode**: Provider details + Models management

#### ModelListItem

Individual model item in models list:
- Model name and slug
- Capability badges (vision, function calling)
- Context window display
- Active/inactive toggle
- Edit/Delete actions

### Design Specifications

**Colors** (follows existing theme):
- Primary: blue-500 (blue-600 on hover)
- Success: green-100/green-800
- Error: red-100/red-800
- Badge: gray-100/gray-800

**Spacing**:
- Panel padding: p-4 md:p-6
- List item spacing: gap-2
- Form input spacing: gap-6

**Typography**:
- Header: text-2xl font-bold
- Section title: text-lg font-semibold
- Label: font-medium
- Description: text-sm text-gray-500

---

## Validation Rules

### ModelProvider Validation

```typescript
const ModelProviderSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(100, '名称不能超过100个字符'),
  slug: z.string()
    .min(1, 'Slug不能为空')
    .max(50, 'Slug不能超过50个字符')
    .regex(/^[a-z0-9-]+$/, 'Slug只能包含小写字母、数字和连字符'),
  baseUrl: z.string()
    .url('无效的URL格式')
    .max(500, 'URL不能超过500个字符'),
  apiKey: z.string().optional(),
  description: z.string().max(500, '描述不能超过500个字符').optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});
```

### ProviderModel Validation

```typescript
const ProviderModelSchema = z.object({
  slug: z.string()
    .min(1, 'Model Slug不能为空')
    .max(50, 'Model Slug不能超过50个字符')
    .regex(/^[a-z0-9.-]+$/, 'Slug只能包含小写字母、数字、点和连字符'),
  name: z.string().min(1, '模型名称不能为空').max(100, '模型名称不能超过100个字符'),
  contextWindow: z.number().int().min(1).max(1000000).optional(),
  supportsVision: z.boolean().optional(),
  supportsFunctionCalling: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});
```

---

## Error Handling

### API Error Responses

```typescript
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: any;
  };
}
```

### Error Codes

| Code | Description |
|------|-------------|
| unauthorized | User not authenticated |
| validation_error | Request validation failed |
| provider_not_found | Provider does not exist |
| provider_slug_exists | Slug already in use |
| model_not_found | Model does not exist |
| database_error | Database operation failed |
| network_error | Network communication failed |

---

## Migration Strategy

### Phase 1: New Tables (No Breaking Changes)

1. Create new `model_providers` and `provider_models` tables
2. Existing `settings` table remains unchanged
3. New UI accessible at `/model-providers` route

### Phase 2: Service Adapter (Optional)

Create adapter layer to optionally use provider-based config:

```typescript
// src/server/core/provider/configAdapter.ts
export class ModelProviderConfigAdapter {
  async getModelConfig(modelName: string) {
    // 1. Try provider-based config first
    const provider = await this.findProviderForModel(modelName);
    if (provider) {
      return { baseURL: provider.baseUrl, apiKey: provider.apiKey };
    }

    // 2. Fallback to settings-based config
    return {
      baseURL: process.env.MODEL_PROVIDER_URL,
      apiKey: process.env.MODEL_PROVIDER_API_KEY,
    };
  }
}
```

### Phase 3: Data Migration (Optional)

Provide utility function to migrate from settings:

```typescript
// server/cli/migrateToProviders.ts
export async function migrateFromSettings(accountId: number) {
  const url = await settingService.getSetting(accountId, 'MODEL_PROVIDER_URL');
  const key = await settingService.getSetting(accountId, 'MODEL_PROVIDER_API_KEY');

  if (url && key) {
    await modelProviderService.createProvider(accountId, {
      name: 'Default Provider',
      slug: 'default',
      baseUrl: url,
      apiKey: key,
    });
  }
}
```

---

## Security Considerations

### API Key Storage

- API keys stored in database (plaintext in initial implementation)
- Future consideration: encrypted storage in settings table
- UI shows masked value (`••••••••`) when viewing existing keys

### Access Control

- Users can only access their own account's providers
- accountId filtering enforced at service layer
- No cross-account data access

### Input Validation

- All inputs validated with Zod schemas
- URL validation prevents SSRF via malformed URLs
- Slug enforces allowed characters only

---

## Testing Strategy

### Unit Tests

```typescript
// src/server/service/modelProviderService/__tests__/modelProviderService.test.ts
describe('ModelProviderService', () => {
  describe('createProvider', () => {
    it('should create a new provider with valid data');
    it('should reject duplicate slugs');
    it('should validate URL format');
  });

  describe('getProvidersByAccountId', () => {
    it('should return only providers for given account');
    it('should return empty array for account with no providers');
  });
});
```

### Integration Tests

```typescript
// src/app/api/model-providers/__tests__/route.test.ts
describe('Model Providers API', () => {
  it('should return 401 for unauthenticated requests');
  it('should create provider with valid data');
  it('should return validation errors for invalid data');
  it('should delete provider and cascade delete models');
});
```

### Component Tests

```typescript
// src/app/(pages)/model-providers/__tests__/page.test.tsx
describe('ModelProviderPage', () => {
  it('should render provider list and config panel');
  it('should show empty state when no providers');
  it('should open create form when clicking add button');
});
```

---

## Performance Considerations

1. **Database Indexing**: Index on `account_id` and `slug` for fast lookups
2. **Store Optimization**: Use `shallow` comparison for store selectors
3. **Lazy Loading**: Models loaded only when provider is selected
4. **Debounced Inputs**: Debounce form inputs to reduce validation overhead
5. **Pagination**: Support pagination if providers list grows large

---

## Future Enhancements

1. **API Key Encryption**: Store encrypted keys in settings table
2. **Model Pricing**: Add pricing information per model
3. **Provider Health**: Implement health check and status monitoring
4. **Usage Tracking**: Track API usage per provider/model
5. **Rate Limiting**: Per-provider rate limit configuration
6. **Model Testing**: API endpoint to test model connectivity
7. **Templates**: Pre-built provider templates (OpenAI, Anthropic, etc.)