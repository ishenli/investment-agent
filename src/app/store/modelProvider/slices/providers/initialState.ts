import { ModelProvider } from '@/types/modelProvider';

export interface ProvidersState {
  providers: ModelProvider[];
  activeProviderId: number | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
}

export const initialProvidersState: ProvidersState = {
  providers: [],
  activeProviderId: null,
  loading: false,
  error: null,
  saving: false,
};