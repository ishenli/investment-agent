# Theme Switching Feature Proposal

## Change ID: 006-theme-switching

### Summary
Complete the implementation of a comprehensive theme switching feature for the investment agent application, enabling users to toggle between light, dark, and system themes. The feature will integrate with Ant Design components, provide smooth transitions, and persist user preferences across sessions.

### Problem Statement
The application currently has theme-related components (`theme-provider.tsx`, `theme-toggle.tsx`) but they are not integrated into the main application. Users cannot currently switch between themes, limiting the accessibility and user experience of the application, especially for users who prefer dark mode.

### Why
Theme switching is a fundamental feature that significantly improves user accessibility and experience. Dark mode reduces eye strain for users working in low-light environments, saves battery life on OLED displays, and provides a modern aesthetic that many users prefer. By not supporting theme switching, we are limiting our application's accessibility and user satisfaction. Additionally, maintaining consistency with both shadcn/ui and Ant Design components in different themes ensures a cohesive visual experience across the entire application.

### What Changes
This change introduces comprehensive theme switching functionality to the investment agent application:

1. **Core Theme System**
   - Integrate `next-themes` library for theme state management
   - Wrap application with `ThemeProvider` in providers.tsx
   - Configure theme persistence via localStorage
   - Support light, dark, and system theme modes

2. **User Interface Updates**
   - Update `theme-toggle.tsx` to use Lucide icons
   - Create `theme-toggle-dropdown-item.tsx` for navigation integration
   - Add theme toggle to `nav-user.tsx` dropdown menu
   - Provide clear visual feedback for active theme

3. **CSS Theming Support**
   - Add Ant Design CSS variables to `globals.css`
   - Configure light and dark theme variable mappings
   - Implement smooth transitions (200ms ease-in-out)
   - Add reduced motion support

4. **Dual Library Coordination**
   - Create `AntDesignThemeSync` component
   - Wrap Ant Design usage with proper theme configuration
   - Ensure both shadcn/ui and antd components respond uniformly
   - Use `ConfigProvider` for Ant Design theme algorithm

5. **Enhanced Accessibility**
   - WCAG AA contrast ratio compliance
   - Keyboard navigation support
   - Screen reader announcements
   - Reduced motion preference respect

### Scope
1. **Integrate theme provider**: Add the existing theme provider wrapper to the application's Providers component
2. **Add theme toggle UI**: Integrate the theme toggle component into the navigation sidebar or user menu
3. **Configure theme persistence**: Ensure user theme preferences are saved to localStorage
4. **Enable Ant Design theme sync**: Configure Ant Design components to respond to theme changes
5. **Add smooth transitions**: Implement CSS transitions for seamless theme switching
6. **Test theme functionality**: Ensure all components work correctly in both light and dark modes

### Out of Scope
- Creating entirely new theme variants (custom themes)
- Theme-specific component modifications beyond color changes
- User profile-based theme preferences (beyond localStorage)
- Advanced theme customization options (accent colors, etc.)

### Related Changes
- Builds upon existing theme components in `src/app/components/ui/`
- References design document in `.context/plans/light-dark-theme-switch-feature-design.md`
- Integrates with existing Ant Design setup and Tailwind CSS configuration

### Success Metrics
- Users can successfully switch between light, dark, and system themes
- Theme preference persists across browser sessions
- All UI components render correctly in both themes
- Smooth transitions occur when switching themes
- No hydration errors or theme flickering on initial load

### Risks & Mitigations
- **Risk**: Hydration mismatch during SSR
  - **Mitigation**: Use `suppressHydrationWarning` on html element and proper next-themes configuration
- **Risk**: Ant Design components not responding to theme changes
  - **Mitigation**: Configure CSS variables for Ant Design tokens or use ConfigProvider
- **Risk**: Performance impact from theme transitions
  - **Mitigation**: Use GPU-accelerated CSS transitions and limit transition properties

### Alternatives Considered
- Using only CSS media queries for system preference without user control
  - Rejected: Users desire explicit control over theme preference
- Implementing a custom theme system instead of next-themes
  - Rejected: next-themes provides proven SSR support and system preference detection
- Using localStorage only without Zustand integration
  - Accepted: Keeping it simple with next-themes managing state unless store sync is needed

### Implementation Approach
Follow the architecture outlined in the existing design document, focusing on:
1. Minimal integration of existing components
2. Proper SSR handling
3. Smooth user experience with transitions
4. Ensuring all components are theme-aware

### Dependencies
- next-themes: ^3.0.0
- @tabler/icons-react: for theme icons
- Ant Design v6: theme integration
- Tailwind CSS: dark mode configuration