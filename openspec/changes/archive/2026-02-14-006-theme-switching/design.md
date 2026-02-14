# Theme Switching Feature Design

## Overview
This document provides the detailed architectural design for implementing theme switching functionality in the investment agent application. The design leverages shadcn/ui components and integrates seamlessly with Ant Design v6, ensuring a unified theme experience across both component libraries.

## Architecture

### Core Components Flow
```
User Interaction → ThemeToggle → useTheme() → next-themes → localStorage → DOM Class Update → CSS Variables → shadcn + AntD Integration → UI Update
```

### Key Components Responsibilities

1. **ThemeProvider (next-themes)**
   - Single source of truth for theme state
   - Manages theme persistence in localStorage
   - Handles system preference detection
   - Prevents hydration mismatches during SSR
   - Uses `class` strategy to apply `dark` class to document element

2. **ThemeToggle Component**
   - Interactive UI using shadcn/ui components (Button, DropdownMenu)
   - Visual feedback with Lucide icons (Sun, Moon, Monitor)
   - Handles three modes: light, dark, system
   - Provides smooth transitions between themes
   - Shows active theme selection with checkmarks

3. **Dual Theme Integration Layer**
   - shadcn/ui components automatically respond to CSS variables
   - Ant Design同步器组件监听next-themes并更新Ant Design主题
   - Coordinated color management between both systems

## Implementation Strategy

### Phase 1: shadcn/ui Theme Integration
The project already has a complete shadcn/ui setup with CSS variables defined in globals.css. This forms the foundation of our theme system.

1. **CSS Variables Foundation**
   - The project uses Tailwind CSS v4 with inline `@theme` configuration
   - Light theme variables defined in `:root` using oklch color space
   - Dark theme variables defined in `.dark` selector
   - All shadcn/ui components automatically inherit these colors
   - Variables cover: background, foreground, primary, secondary, muted, accent, destructive, etc.

2. **ThemeProvider Configuration**
   - Use existing `theme-provider.tsx` wrapper around next-themes
   - Configure with `attribute="class"` to apply `dark` class to html element
   - Set `defaultTheme="system"` and `storageKey="investment-agent-theme"`
   - Enable `enableSystem` to respect OS preferences
   - Use `disableTransitionOnChange` initially, then enable smooth transitions

3. **ThemeToggle Optimization**
   - The existing ThemeToggle already uses shadcn/ui components
   - Update imports to use Lucide icons instead of tabler for consistency
   - Ensure proper Chinese labels: 浅色, 深色, 跟随系统
   - Add animation classes for icon transitions

### Phase 2: Ant Design Theme Integration
Ant Design v6 supports CSS variables, allowing seamless integration with shadcn/ui themes.

1. **Ant Design CSS Variable Method**
   - Update antd's root CSS variables in globals.css
   - Map antd theme tokens to our existing shadcn variables
   - Define dark mode variants for antd-specific tokens
   - Ensure all antd components (Button, Modal, Menu, Table) respond to theme changes

2. **Token Mapping Strategy**
   ```css
   /* Light theme antd tokens */
   :root {
     --antd-primary-color: var(--primary);
     --antd-primary-color-hover: color-mix(in oklch, var(--primary) 90%, black);
     --antd-bg-color-container: var(--card);
     --antd-text-color: var(--foreground);
     /* ... other token mappings */
   }

   /* Dark theme antd tokens */
   .dark {
     --antd-primary-color: var(--primary);
     --antd-primary-color-hover: color-mix(in oklch, var(--primary) 80%, white);
     --antd-bg-color-container: var(--card);
     --antd-text-color: var(--foreground);
     /* ... dark token mappings */
   }
   ```

3. **ConfigProvider Alternative (if needed)**
   - If CSS variables don't cover all cases, use antd's ConfigProvider
   - Create a component that wraps antd components with theme-aware config
   - Listen to next-themes changes and update antd config accordingly

### Phase 3: Dual Theme System Coordination
1. **Component Usage Guidelines**
   - Use shadcn/ui components for new UI (Button, Card, Form, etc.)
   - Continue using existing Ant Design components where needed
   - Ensure both style systems work harmoniously
   - Test interface components that mix both libraries

2. **Transition System**
   - Add smooth transitions to both shadcn and antd components
   - Use CSS transitions on color-related properties
   - Ensure transitions don't impact performance on low-end devices
   - Respect user's `prefers-reduced-motion` preference

3. **Theme Validation**
   - Test all component types: forms, modals, tables, charts
   - Verify color contrast ratios meet WCAG standards
   - Check that css variables cascade properly
   - Ensure no component is left un-themed

## State Management

### Theme State Lifecycle
```typescript
// 1. Initialization (Server/Client)
localStorage.get('investment-agent-theme') → savedTheme
if(savedTheme) → use savedTheme
else → window.matchMedia('(prefers-color-scheme: dark)') → systemDefault
// No flash of unstyled content due to next-themes SSR handling

// 2. Theme Change
userClick → setTheme(newTheme) → localStorage.set() →
.classList.toggle('dark') on html element →
CSS variables update → shadcn components update automatically →
antd CSS tokens update → antd components update
```

### Persistence Strategy
- **Storage Key**: `investment-agent-theme`
- **Valid Values**: `'light' | 'dark' | 'system'`
- **Fallback**: System preference if localStorage is unavailable
- **Survival**: Persists across browser sessions and page refreshes
- **SSR Safety**: next-themes handles hydration mismatch prevention

## Technical Implementation Details

### Dual CSS Variables System
The implementation leverages the existing CSS variables in `globals.css` and extends them for antd:

```css
/* shadcn/ui variables (already exists) */
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(57.61% 0.2508 258.23);
  --primary-foreground: oklch(0.985 0 0);
  /* ... all shadcn variables */
}

/* antd token variables (to be added) */
:root {
  --antd-primary-color: var(--primary);
  --antd-primary-color-hover: color-mix(in oklch, var(--primary) 90%, black);
  --antd-bg-color-container: var(--card);
  --antd-text-color: var(--foreground);
  --antd-border-color: var(--border);
  --antd-border-radius: var(--radius);
}

/* Dark theme for both libraries */
.dark {
  /* shadcn dark variables (already exists) */
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... */

  /* antd dark token variables (to be added) */
  --antd-bg-color-container: var(--card); /* Already dark in .dark */
  --antd-bg-color-container-hover: oklch(0.269 0 0);
  --antd-primary-color-hover: color-mix(in oklch, var(--primary) 80%, white);
}
```

### Component Integration Patterns
```typescript
// Providers Integration (updated)
import { ThemeProvider } from './components/ui/theme-provider';

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        defaultTheme="system"
        storageKey="investment-agent-theme"
        attribute="class"
        enableSystem
        // disableTransitionOnChange initially, remove after testing
        disableTransitionOnChange={process.env.NODE_ENV === 'development'}
      >
        <AntDesignThemeSync>
          {children}
        </AntDesignThemeSync>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

// antd Theme Sync Component (new)
'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { ConfigProvider, theme as antdTheme } from 'antd';

export function AntDesignThemeSync({
  children
}: {
  children: React.ReactNode
}) {
  const { theme, resolvedTheme } = useTheme();

  return (
    <ConfigProvider
      theme={{
        token: {
          // Map to our CSS variables
          colorPrimary: 'var(--antd-primary-color)',
          colorBgContainer: 'var(--antd-bg-color-container)',
          colorText: 'var(--antd-text-color)',
          colorBorder: 'var(--antd-border-color)',
          borderRadius: 'var(--antd-border-radius)',
        },
        algorithm: resolvedTheme === 'dark'
          ? antdTheme.darkAlgorithm
          : undefined,
      }}
    >
      {children}
    </ConfigProvider>
  );
}

// ThemeToggle updated for Lucide icons
.import { Sun, Moon, Monitor } from 'lucide-react';

## Error Handling & Edge Cases

### 1. Hydration Mismatch Prevention
- next-themes automatically handles SSR hydration
- No additional `suppressHydrationWarning` needed on html element
- Theme state is initialized client-side to prevent mismatch
- Fallback UI shows during initial render if needed

### 2. Component Coexistence
- Handle cases where shadcn and antd components are mixed
- Ensure consistent spacing and design tokens
- Resolve conflicting CSS properties with proper specificity
- Test visual consistency across both libraries in both themes

### 3. System Preference Changes
- Listen for system theme changes via `prefers-color-scheme` media query
- Update UI when in system mode and system preference changes
- Maintain user override selections (light/dark override system)
- Debounce rapid system theme changes

### 4. Accessibility Requirements
- Ensure high contrast ratios in both themes (WCAG AA minimum)
- Support reduced motion preferences for transitions
  ```css
  @media (prefers-reduced-motion: reduce) {
    * {
      transition: none !important;
    }
  }
  ```
- Provide clear visual indicators for current theme
- Maintain keyboard navigation and screen reader support

## Performance Considerations

### 1. Transition Optimization
- Use hardware-accelerated CSS properties for transitions
- Limit transition properties to essential color-related changes:
  ```css
  @supports (color: oklch(0 0 0)) {
    * {
      transition: background-color 200ms ease-in-out,
                  color 200ms ease-in-out,
                  border-color 200ms ease-in-out,
                  box-shadow 200ms ease-in-out;
    }
  }
  ```
- Add `will-change` hint for GPU acceleration
- Avoid expensive animations during theme switch

### 2. Dual Library Optimization
- CSS variables approach minimizes JavaScript overhead
- antd ConfigProvider only updates when theme actually changes
- Memoize theme context to prevent unnecessary re-renders
- Use React context efficiently with proper consumers

### 3. Bundle Size and Runtime
- Next.js bundles CSS variables efficiently
- next-themes is lightweight (< 3KB gzipped)
- No runtime JavaScript penalty for CSS variable approach
- Icons are tree-shakeable through dynamic imports if needed

### 4. Memory Management
- Clean up event listeners for system preference changes
- Avoid memory leaks in theme context providers
- Use WeakMap for storing theme-related data

## Testing Strategy

### 1. Unit Tests
```typescript
describe('ThemeToggle', () => {
  it('renders correctly in all themes', () => {
    // Test component rendering with different themes
  });

  it('calls setTheme on click', () => {
    // Test theme switching functionality
  });

  it('shows correct active theme indicator', () => {
    // Test checkmark display for current theme
  });
});
```

### 2. Integration Tests
- Test full theme switching flow from user action to UI update
- Verify localStorage persistence works correctly
- Test system preference detection and response
- Ensure no hydration errors occur

### 3. Visual Regression Tests
- Compare screenshots of all major components in both themes
- Test with both shadcn and antd components
- Verify charts and data visualizations render correctly
- Check mobile responsive layouts

### 4. Accessibility Tests
- Automated contrast ratio verification
- Screen reader navigation through theme menu
- Keyboard navigation and focus management
- Reduced motion preference respect

### 5. Performance Tests
- Measure transition frame rates (should maintain 60fps)
- Profile memory usage during theme switches
- Test timing for theme initialization
- Verify no layout shifts during theme changes

## Known Limitations and Mitigations

### 1. Ant Design Component Specificity
- Some antd components have high CSS specificity
  - **Mitigation**: Use `!important` sparingly or use antd's theming API
  - **Alternative**: Wrap problematic components with theme-aware styling

### 2. CSS Variable Fallbacks
- Older browsers may not support oklch color space
  - **Mitigation**: Provide sRGB fallbacks where needed
  - **Consideration**: Project uses modern browsers as per Next.js recommendations

### 3. Dynamic Component Loading
- Components loaded after theme initialization may miss initial theme
  - **Mitigation**: All components inherit from documentElement class
  - **Guard**: Use useClientEffect for components need explicit theme

### 4. Custom Styled Components
- Components with inline styles or styled-components may not respect themes
  - **Mitigation**: Refactor to use CSS variables
  - **Documentation**: Provide migration guide for custom styling

## Migration Path

### Phase 1: Foundation (1-2 days)
1. Update providers to wrap with ThemeProvider
2. Add antd CSS variables to globals.css
3. Ensure existing shadcn components work
4. Test basic theme switching

### Phase 2: Integration (2-3 days)
1. Create AntDesignThemeSync component
2. Update all antd-heavy pages to use theme sync
3. Add theme toggle to navigation
4. Implement smooth transitions

### Phase 3: Validation (1-2 days)
1. Comprehensive testing across all pages
2. Performance optimization
3. Accessibility verification
4. Documentation updates

**Total Estimated Time**: 4-7 days