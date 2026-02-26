/**
 * Model Provider Management Types
 */

// Database types (from Drizzle schema)
export interface ModelProvider {
  id: number;
  userId: number;
  slug: string;
  name: string;
  baseUrl: string;
  apiKey: string | null;
  isActive: boolean;
  displayOrder: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderModel {
  id: number;
  providerId: number;
  slug: string;
  name: string;
  contextWindow: number | null;
  supportsVision: boolean | null;
  supportsFunctionCalling: boolean | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// Request types for API
export interface CreateModelProviderRequest {
  name: string;
  slug: string;
  baseUrl: string;
  apiKey?: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateModelProviderRequest {
  id: number;
  name?: string;
  slug?: string;
  baseUrl?: string;
  apiKey?: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface CreateProviderModelRequest {
  providerId?: number;
  slug: string;
  name: string;
  contextWindow?: number;
  supportsVision?: boolean;
  supportsFunctionCalling?: boolean;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateProviderModelRequest {
  id: number;
  slug?: string;
  name?: string;
  contextWindow?: number;
  supportsVision?: boolean;
  supportsFunctionCalling?: boolean;
  isActive?: boolean;
  displayOrder?: number;
}

// Form modes
export type FormMode = 'create' | 'edit' | 'model-create' | 'model-edit' | 'view';

// Store state types
export interface ProvidersState {
  providers: ModelProvider[];
  activeProviderId: number | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
}

export interface ModelsState {
  models: ProviderModel[];
  providerId: number | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
}

export interface FormState {
  mode: FormMode;
  draftProvider: Partial<ModelProvider>;
  draftModel: Partial<ProviderModel>;
  isDirty: boolean;
  errors: Record<string, string>;
}

// API Response types
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: any;
  };
}

export interface ListResponse<T> {
  items: T[];
  totalCount: number;
}