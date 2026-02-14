# Theme Switching Implementation Tasks

## Task List

### 1. Foundation Setup (shadcn/ui Integration)
- [ ] **Task 1.1**: Integrate ThemeProvider into app structure
  - Import ThemeProvider from `src/app/components/ui/theme-provider.tsx`
  - Update `src/app/providers.tsx` to wrap existing providers
  - Configure with: defaultTheme="system", storageKey="investment-agent-theme", attribute="class"
  - Add enableSystem and disableTransitionOnInit options

- [ ] **Task 1.2**: Update root layout for theme support
  - Ensure html element can receive class updates (no suppressHydrationWarning needed)
  - Verify AntdRegistry wrapping order is correct
  - Confirm Providers wrapper sequence: QueryClientProvider > ThemeProvider > AntdRegistry > AntDesignThemeSync

- [ ] **Task 1.3**: Initialize next-themes package
  - Verify next-themes version is compatible (^0.4.6 installed)
  - Import necessary hooks and providers from next-themes
  - Configure TypeScript types if needed

### 2. shadcn/ui Component Updates
- [ ] **Task 2.1**: Update ThemeToggle icons to Lucide
  - Replace @tabler/icons-react imports with lucide-react
  - Import Sun, Moon, Monitor from 'lucide-react'
  - Update icon sizes and classes to match project standards
  - Test render on both light and dark backgrounds

- [ ] **Task 2.2**: Optimize ThemeToggle integration
  - Update ThemeToggle component to use project's shadcn/ui components
  - Ensure proper Chinese labels: "浅色", "深色", "跟随系统"
  - Add smooth transition classes for icon animations
  - Verify dropdown menu alignment and styling

- [ ] **Task 2.3**: Integrate theme toggle in navigation
  - Add ThemeToggle to app-sidebar.tsx or app-header.tsx
  - Ensure responsive behavior across device sizes
  - Test with existing navigation components

### 3. Ant Design Theme Integration
- [ ] **Task 3.1**: Add Ant Design CSS variables to globals.css
  - Map antd theme tokens to shadcn CSS variables
  - Define light theme antd tokens in :root section
  - Define dark theme antd tokens in .dark section
  - Include comprehensive token mapping for consistent look

- [ ] **Task 3.2**: Create AntDesignThemeSync component
  - Create `src/app/components/antd-theme-sync.tsx`
  - Use Ant Design's ConfigProvider with dynamic theme
  - Map antd theme tokens to CSS variables
  - Include darkAlgorithm for theme switching

- [ ] **Task 3.3**: Wrap Ant Design usage
  - Update layout to include AntDesignThemeSync
  - Ensure all antd imports happen within the sync wrapper
  - Test with existing antd components (message, Modal, Table, etc.)

### 4. Dual Library Coordination
- [ ] **Task 4.1**: Create mixed component test pages
  - Create demo pages with both shadcn and antd components
  - Test Button, Card, Form, Table from both libraries
  - Ensure consistent spacing, colors, and shadows
  - Verify no CSS conflicts between libraries

- [ ] **Task 4.2**: Implement theme-aware component listener
  - Add CSS variables for additional antd-specific colors
  - Ensure oklch color space works properly
  - Add sRGB fallbacks if needed for browser support
  - Test color reproduction across devices

- [ ] **Task 4.3**: Optimize transition system
  - Add CSS transitions for smooth theme switching
  - Include reduced motion media query support
  - Target hardware-accelerated properties only
  - Set appropriate timing (200ms ease-in-out)

### 5. Implementation Validation
- [ ] **Task 5.1**: Test shadcn components in both themes
  - Test all shadcn components in components/ui/ directory
  - Validate button, card, form, modal components
  - Check table, chart, and data display components
  - Ensure consistent theming across all

- [ ] **Task 5.2**: Test Ant Design components in both themes
  - Test message component theming (used in refresh-button.tsx)
  - Validate Modal, Table, Form antd components
  - Check notification and drawer components
  - Ensure antd components match shadcn theme

- [ ] **Task 5.3**: Test theme persistence and system detection
  - Test localStorage persistence across sessions
  - Change system preference and verify app responds
  - Test transition from system to manual themes
  - Verify theme state management with Redux/Zustand

### 6. Performance & Optimization
- [ ] **Task 6.1**: Optimize theme change performance
  - Profile theme transitions for 60fps performance
  - Check memory usage during theme switches
  - Verify no layout shifts occur
  - Test on low-end devices

- [ ] **Task 6.2**: Implement proper event handling
  - Clean up system preference event listeners
  - Avoid memory leaks in theme context providers
  - Use React.memo appropriately for theme components
  - Debounce rapid system theme changes

- [ ] **Task 6.3**: Bundle optimization
  - Tree-shake unused icon imports
  - Ensure CSS variables are optimized by Next.js
  - Verify minimal JavaScript runtime impact
  - Check that CSS is properly cached

### 7. Accessibility Compliance
- [ ] **Task 7.1**: Contrast ratio validation
  - Use Axe DevTools or similar to check contrast
  - Ensure all text meets WCAG AA standards (4.5:1)
  - Verify interactive elements have sufficient contrast
  - Check hover and focus states

- [ ] **Task 7.2**: Navigation and focus management
  - Test keyboard navigation through theme menu
  - Ensure proper focus indicators are visible
  - Verify screen reader announces theme changes
  - Test ARIA attributes for theme toggle

- [ ] **Task 7.3**: Reduced motion support
  - Test with system reduce-motion preference enabled
  - Ensure theme transitions are disabled
  - Verify smooth experience without animations

### 8. Documentation & Finalization
- [ ] **Task 8.1**: Update project documentation
  - Document theme system architecture
  - Add contribution guide for theming new components
  - Update README with theme feature description
  - Create examples for mixed shadcn/antd usage

- [ ] **Task 8.2**: Code review and cleanup
  - Remove TODO comments and debug code
  - Ensure TypeScript types are correct
  - Run linting and fix any issues
  - Check bundle size impact

- [ ] **Task 8.3**: Final validation
  - Test on all target browsers (Chrome, Firefox, Safari, Edge)
  - Verify functionality on mobile devices
  - Get team review and feedback
  - Prepare for merge/deployment

## Validation Criteria

### Foundation Setup Validation
- [ ] ThemeProvider wraps application in correct order
- [ ] No console errors during theme initialization
- [ ] System theme is default on first load
- [ ] next-themes properly handles SSR without hydration errors

### shadcn UI Integration Validation
- [ ] Theme toggle uses Lucide icons correctly
- [ ] Chinese labels display properly: 浅色, 深色, 跟随系统
- [ ] Icon animations are smooth and performant
- [ ] All shadcn components respond to theme automatically

### Ant Design Integration Validation
- [ ] Ant Design CSS variables are properly mapped
- [ ] AntDesignThemeSync component wraps antd usage
- [ ] All antd components (message, Modal, etc.) follow theme
- [ ] Ant and shadcn components display consistently

### Dual Library Coordination Validation
- [ ] Mixed component pages render without conflicts
- [ ] CSS variables cascade properly through DOM
- [ ] No styling specificity conflicts between libraries
- [ ] Transition effects work on both component types

### Implementation Validation
- [ ] Theme transitions maintain 60fps performance
- [ ] System preference changes trigger updates in real-time
- [ ] Reduced motion preference is respected
- [ ] Bundle size impact is minimal (< 5KB increase)

### Performance Validation
- [ ] Memory usage doesn't leak after theme changes
- [ ] Event listeners are properly cleaned up
- [ ] No unnecessary re-renders on theme change
- [ ] CSS transitions use GPU acceleration

### Accessibility Compliance Validation
- [ ] All text meets WCAG AA contrast ratios
- [ ] Keyboard navigation works through theme menu
- [ ] Screen reader announces theme changes appropriately
- [ ] Focus indicators are clearly visible

### Documentation Validation
- [ ] Theme architecture is documented
- [ ] Component theming guidelines provided
- [ ] Mixed library usage examples included
- [ ] All code is properly typed and documented

### Final Validation Criteria
- [ ] Implementation works across all target browsers
- [ ] Mobile responsive behavior is correct
- [ ] Team approval obtained for implementation
- [ ] Ready for production deployment

## Dependencies

### External Dependencies
- next-themes: ^0.4.6 (already installed)
- lucide-react: for theme icons (already installed in project)
- antd: ^6.3.0 (already in use)
- @ant-design/nextjs-registry: (already installed)

### Internal Dependencies
- src/app/components/ui/theme-provider.tsx (existing implementation)
- src/app/components/ui/theme-toggle.tsx (existing, needs icon update)
- src/app/providers.tsx (needs ThemeProvider integration)
- src/app/layout.tsx (needs AntDesignThemeSync wrapper)
- src/app/globals.css (needs Ant Design CSS variables)
- src/app/components/antd-theme-sync.tsx (to be created)

### Task Dependencies
- Task 1.x (Foundation) must complete before Phase 2
- Task 2.x (shadcn) and Task 3.x (AntD) can proceed in parallel
- Task 4.x (Coordination) depends on both Phase 2 & 3
- All implementation tasks must complete before validation
- Performance and accessibility testing requires full implementation

## Estimated Timeline
- **Phase 1 (Foundation Setup)**: 3-4 hours
- **Phase 2 (shadcn/ui Updates)**: 2-3 hours
- **Phase 3 (Ant Design Integration)**: 4-5 hours
- **Phase 4 (Dual Library Coordination)**: 3-4 hours
- **Phase 5 (Implementation Validation)**: 2-3 hours
- **Phase 6 (Performance & Optimization)**: 2-3 hours
- **Phase 7 (Accessibility Compliance)**: 2-3 hours
- **Phase 8 (Documentation & Finalization)**: 2 hours

**Total Estimated Time**: 18-24 hours (2.5-3 days)

### Timeline Notes
- Ant Design integration is the most complex phase due to token mapping
- Mixed library coordination requires thorough testing
- Performance optimization may require iteration
- Team review and feedback should be factored in
- Allow buffer for unexpected compatibility issues