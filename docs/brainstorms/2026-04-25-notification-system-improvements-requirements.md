---
date: 2026-04-25
topic: notification-system-improvements
---

# Notification System Improvements: Electron Native + Web Notifications

## Problem Frame

The investment-agent app has a working server-side notification system (DB, CRUD API, UI toasts) but no native OS-level notification delivery. Users miss important events (price alerts, completed reports, trade executions) when the app is in the background or minimized. The system also lacks a unified notification abstraction that works across both Electron and web browser environments.

**Current state:**
- Server: full notification CRUD (SQLite + Drizzle, repository/service/controller layers)
- Client: 3 fragmented toast systems (Sonner, Ant Design, custom DOM-based) + a separate Zustand notification state in the position store
- Electron: no native notification integration at all
- Delivery: pull-only (no real-time push)

```
┌──────────────────────────────────────────────────────┐
│                   Current Flow                       │
│                                                      │
│  Server creates notification → DB                    │
│        ↑ (no push)                                   │
│  Client polls API → gets list → shows in-app toast   │
│                                                      │
│  ✗ No OS notification when app is in background      │
│  ✗ No dock badge / tray badge                        │
│  ✗ 3 separate toast libraries, no unified pattern    │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│                   Target Flow                        │
│                                                      │
│  Server creates notification → DB                    │
│        ↑ (polling, as-is)                            │
│  Client polls API → gets new notifications           │
│        ↓                                             │
│  NotificationManager (unified abstraction)           │
│    ├─ Electron: native Notification + dock badge     │
│    ├─ Web: Web Notifications API + favicon badge     │
│    └─ In-app: unified toast (Sonner)                 │
│                                                      │
│  Local events (portfolio changes, reminders)          │
│    → also route through NotificationManager          │
└──────────────────────────────────────────────────────┘
```

## Requirements

**Unified Notification Abstraction**
- R1. Create a `NotificationManager` that abstracts the delivery channel. Components call one API regardless of whether the app runs in Electron or a browser.
- R2. `NotificationManager` must support two notification categories: **persistent** (server-stored, shown in notification center UI) and **transient** (in-app toast only, not stored).
- R3. The manager must detect the runtime environment (Electron vs. web) and route to the appropriate native API automatically.

**Electron Native Notifications**
- R4. When running in Electron, use the Electron `Notification` API to show OS-level notifications for new server notifications with priority `high` or `urgent`.
- R5. Show macOS dock badge / Windows taskbar badge with unread notification count, updated on each poll cycle.
- R6. Clicking an OS notification should focus the app window and navigate to the relevant page (using the `link` field from the notification schema).
- R7. Support notification actions: "Mark as Read" and "View" as inline buttons on the OS notification (where supported by the OS).

**Web Browser Notifications**
- R8. When running in a web browser, use the Web Notifications API (`Notification` constructor) as fallback for the same triggers as R4.
- R9. Request notification permission on first meaningful user interaction (not on page load), with a clear explanation of why.
- R10. Gracefully degrade: if permission is denied or the API is unavailable, fall back to in-app toast only.

**Notification Triggers**
- R11. Server-generated events that should trigger native notifications: `report_completed`, `analysis_completed`, `trade_executed`, `price_alert`.
- R12. `data_refreshed` and `system_announcement` should show in-app only (not OS-level), unless priority is `high` or `urgent`.
- R13. Support local event triggers (client-side) that bypass the server: e.g., portfolio rebalancing suggestions, scheduled task reminders. These are transient (R2) and not persisted to the DB.

**Client-Side Consolidation**
- R14. Standardize on Sonner as the single in-app toast library. Remove usage of the custom DOM-based toast (`src/utils/notification.ts`) and avoid Ant Design's `notification` for new code.
- R15. Merge the position store's local `Notification` type into the unified notification system so there's one notification flow, not two parallel ones.

**IPC Bridge (Electron ↔ Renderer)**
- R16. Expose notification capabilities through the existing Electron preload/IPC bridge: `showNativeNotification`, `setBadgeCount`, `requestNotificationPermission`.
- R17. The IPC bridge must be typed (TypeScript interfaces in a shared location) so both main process and renderer have type safety.

**User Preferences**
- R18. Add a notification settings section in the existing settings page where users can toggle: OS notifications on/off, sound on/off, and per-type notification preferences (which types trigger OS notifications).
- R19. Store preferences in the existing `settings` table (key-value pattern already in place).

## Success Criteria

- When a `price_alert` or `report_completed` notification is created server-side, an OS notification appears within the poll interval (~10-30 seconds) even when the app is minimized
- macOS dock badge shows correct unread count
- Clicking an OS notification opens/focuses the app and navigates to the correct page
- In a web browser, the same notification triggers a Web Notification (with permission)
- All new toast usage goes through the unified `NotificationManager`, not direct Sonner/Ant Design calls
- Settings page allows disabling OS notifications per type

## Scope Boundaries

- **Not in scope:** Real-time push (SSE/WebSocket) — keep current polling model
- **Not in scope:** Email or SMS notification channels
- **Not in scope:** Multi-user notification broadcast (admin → all users)
- **Not in scope:** Notification grouping/stacking (OS-level grouping is acceptable as default OS behavior)
- **Not in scope:** Rich media in notifications (images, custom sounds per type)
- **Not in scope:** Migrating existing Ant Design `notification` calls in chat module — only prevent new usage

## Key Decisions

- **Polling over push:** Keeps architecture simple. The poll interval (configurable, default ~15s) determines notification latency, which is acceptable for an investment tool that isn't high-frequency trading.
- **Sonner as the single toast library:** Already used in most places; lightweight; theme-aware. Ant Design's notification is only used in the chat module and can be left as-is for now.
- **NotificationManager pattern:** A single abstraction layer that components call, rather than scattered direct calls to platform APIs. This makes testing and future channel additions (push, email) straightforward.
- **Priority-based native trigger:** Only `high`/`urgent` priority or specific types trigger OS notifications, preventing notification fatigue.

## Dependencies / Assumptions

- Electron's `Notification` API requires the app to be packaged with proper permissions (macOS: entitlements for notifications)
- Web Notifications API requires HTTPS in production (localhost works for dev)
- The existing polling mechanism for fetching notifications needs to be created or the notification list component needs to poll on an interval
- The `link` field in the notification schema is already present and populated for navigation

## Outstanding Questions

### Resolve Before Planning
_(None — all product decisions resolved)_

### Deferred to Planning
- [Affects R5][Technical] How to best implement dock badge updates — Electron `app.setBadgeCount()` on macOS works, but Windows requires a different approach (taskbar overlay icon). Research cross-platform strategy.
- [Affects R16][Technical] Determine exact IPC channel design — whether to extend existing preload bridge or create a dedicated notification preload module.
- [Affects R18][Needs research] Check if the current settings page component structure supports adding a new section easily, or if it needs layout changes.
- [Affects R14][Technical] Audit all current toast/notification call sites to plan the migration path from custom DOM toast and Ant Design to Sonner.

## Next Steps

→ `/ce:plan` for structured implementation planning
