import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';
import { StateCreator } from 'zustand/vanilla';
import { devtools } from 'zustand/middleware';
import type { SkillCategory, SkillListResponse, SkillResponse, SkillSource } from '@typings/skill';
import { produce } from 'immer';

// ============== State Types ==============

export interface SkillsState {
  skills: SkillResponse[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  selectedCategory: SkillCategory | null;
  selectedSource: SkillSource | null;
  saving: boolean;
  /**
   * Per-session active skill slugs.
   * Key: sessionId, Value: set of slug strings the user has toggled ON for this session.
   * Empty map means "use global isEnabled defaults".
   */
  sessionActiveSkills: Record<string, string[]>;
}

// ============== Action Types ==============

export interface SkillsActions {
  // Data fetching
  fetchSkills: () => Promise<void>;

  // Global toggle (persisted to DB via /api/skills/[id])
  toggleSkill: (skillId: number, isEnabled: boolean) => Promise<void>;

  /**
   * Toggle a skill for a specific chat session (client-side only, not persisted).
   * Used to build the `skills` array sent to /api/chat/claude.
   */
  toggleSessionSkill: (sessionId: string, slug: string) => void;

  /** Returns the active skill slugs for a session, or null if no session override. */
  getSessionSkills: (sessionId: string) => string[] | null;

  // Custom skills
  createCustomSkill: (data: {
    slug: string;
    name: string;
    description: string;
    category: SkillCategory;
    icon?: string;
    config?: Record<string, unknown>;
  }) => Promise<void>;
  deleteCustomSkill: (skillId: number) => Promise<void>;

  // Search and filter
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: SkillCategory | null) => void;
  setSelectedSource: (source: SkillSource | null) => void;

  // Computed
  filteredSkills: () => SkillResponse[];
  categories: () => { value: SkillCategory; count: number }[];
  sources: () => { value: SkillSource; count: number }[];

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
}

// ============== Initial State ==============

const initialState: SkillsState = {
  skills: [],
  loading: false,
  error: null,
  searchQuery: '',
  selectedCategory: null,
  selectedSource: null,
  saving: false,
  sessionActiveSkills: {},
};

// ============== Store Implementation ==============

export type SkillsStore = SkillsState & SkillsActions;

const createStore: StateCreator<SkillsStore, [['zustand/devtools', never]]> = (set, get) => ({
  ...initialState,

  // ── Data fetching ──────────────────────────────────────────────────────

  fetchSkills: async () => {
    set({ loading: true, error: null });

    try {
      const response = await fetch('/api/skills');
      if (!response.ok) {
        throw new Error('Failed to fetch skills');
      }

      const res = await response.json();
      const data = res.data as SkillListResponse;
      set({ skills: data.skills, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage, loading: false });
    }
  },

  // ── State toggle ───────────────────────────────────────────────────────

  /**
   * Toggle a skill's enabled state.
   * Uses PATCH /api/skills/[id] — correct HTTP semantics for a partial update.
   */
  toggleSkill: async (skillId: number, isEnabled: boolean) => {
    set({ saving: true, error: null });

    // Optimistic update
    set(
      produce((state) => {
        const skill = state.skills.find((s: SkillResponse) => s.id === skillId);
        if (skill) skill.isEnabled = isEnabled;
      }),
    );

    try {
      const response = await fetch(`/api/skills/${skillId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: skillId, isEnabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle skill');
      }

      const res = await response.json();
      const updatedSkill: SkillResponse = res.data?.skill ?? res.data;

      // Reconcile with server response
      set(
        produce((state) => {
          const index = state.skills.findIndex((s: SkillResponse) => s.id === skillId);
          if (index !== -1 && updatedSkill) {
            state.skills[index] = { ...state.skills[index], ...updatedSkill };
          }
        }),
      );

      set({ saving: false });
    } catch (error) {
      // Rollback optimistic update on failure
      set(
        produce((state) => {
          const skill = state.skills.find((s: SkillResponse) => s.id === skillId);
          if (skill) skill.isEnabled = !isEnabled;
        }),
      );
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle skill';
      set({ error: errorMessage, saving: false });
    }
  },

  // ── Custom skills ──────────────────────────────────────────────────────

  createCustomSkill: async (data) => {
    set({ saving: true, error: null });

    try {
      const response = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          source: 'custom',
          isEnabled: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create skill');
      }

      const res = await response.json();
      const newSkill: SkillResponse = res.data?.skill ?? res.data;

      set(
        produce((state) => {
          state.skills.unshift(newSkill);
        }),
      );

      set({ saving: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create skill';
      set({ error: errorMessage, saving: false });
    }
  },

  deleteCustomSkill: async (skillId) => {
    set({ saving: true, error: null });

    try {
      const response = await fetch(`/api/skills/${skillId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete skill');
      }

      set(
        produce((state) => {
          state.skills = state.skills.filter((s: SkillResponse) => s.id !== skillId);
        }),
      );

      set({ saving: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete skill';
      set({ error: errorMessage, saving: false });
    }
  },

  // ── Session-level skill activation (client-side only) ─────────────────

  toggleSessionSkill: (sessionId: string, slug: string) => {
    set(
      produce((state: SkillsState) => {
        // 若会话尚未初始化，以全局 isEnabled 的技能列表作为初始快照
        // 避免首次 toggle 时从空数组开始导致其他项状态被需要
        const current =
          state.sessionActiveSkills[sessionId] ??
          state.skills.filter((s) => s.isEnabled).map((s) => s.slug);
        const idx = current.indexOf(slug);
        if (idx === -1) {
          state.sessionActiveSkills[sessionId] = [...current, slug];
        } else {
          state.sessionActiveSkills[sessionId] = current.filter((s) => s !== slug);
        }
      }),
    );
  },

  getSessionSkills: (sessionId: string) => {
    const { sessionActiveSkills } = get();
    const slugs = sessionActiveSkills[sessionId];
    // Return null when not initialized (means: use global isEnabled defaults)
    return slugs ?? null;
  },

  // ── Search and filter ──────────────────────────────────────────────────

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  setSelectedCategory: (category: SkillCategory | null) => set({ selectedCategory: category }),

  setSelectedSource: (source: SkillSource | null) => set({ selectedSource: source }),

  // ── Computed ───────────────────────────────────────────────────────────

  filteredSkills: () => {
    const { skills, searchQuery, selectedCategory, selectedSource } = get();

    return skills.filter((skill) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          skill.name.toLowerCase().includes(q) ||
          skill.description.toLowerCase().includes(q) ||
          skill.slug.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (selectedCategory && skill.category !== selectedCategory) {
        return false;
      }

      if (selectedSource && skill.source !== selectedSource) {
        return false;
      }

      return true;
    });
  },

  categories: () => {
    const { skills } = get();
    const categoryMap = new Map<SkillCategory, number>();

    skills.forEach((skill) => {
      const count = categoryMap.get(skill.category) || 0;
      categoryMap.set(skill.category, count + 1);
    });

    return Array.from(categoryMap.entries()).map(([value, count]) => ({ value, count }));
  },

  sources: () => {
    const { skills } = get();
    const sourceMap = new Map<SkillSource, number>();

    skills.forEach((skill) => {
      const count = sourceMap.get(skill.source) || 0;
      sourceMap.set(skill.source, count + 1);
    });

    return Array.from(sourceMap.entries()).map(([value, count]) => ({ value, count }));
  },

  // ── Error handling ─────────────────────────────────────────────────────

  setError: (error: string | null) => set({ error }),

  clearError: () => set({ error: null }),
});

// ============== Store Export ==============

const devtoolsEnhancer = devtools<SkillsStore>(createStore, { name: 'SkillsStore' });

export const useSkillsStore = createWithEqualityFn<SkillsStore>()(devtoolsEnhancer, shallow);

export const getSkillsStoreState = () => useSkillsStore.getState();
