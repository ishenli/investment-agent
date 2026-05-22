import type { ScorerResult } from '../core/types';

export type SuggestionCategory = 'system-prompt' | 'tool-config' | 'timeout' | 'knowledge' | 'architecture';
export type SuggestionPriority = 'high' | 'medium' | 'low';
export type SuggestionEffort = 'small' | 'medium' | 'large';
export type SuggestionSource = 'rule' | 'llm';

export interface EvaluationSuggestion {
  id: string;
  dimension: ScorerResult['dimension'];
  category: SuggestionCategory;
  title: string;
  description: string;
  priority: SuggestionPriority;
  effort: SuggestionEffort;
  source: SuggestionSource;
  affectedCases: string[];
}
