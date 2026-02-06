# Tasks: Enable Manual Report Editing

## Task List

### 1. Backend - Expose updateReportContent method
**File:** `src/server/service/reportService.ts`

- [x] Convert `updateReportContent` method from `private` to `public`
- [x] Add `accountId` parameter for authorization
- [x] Implement permission check (report belongs to account)
- [x] Add proper error handling and logging
- [x] Return `ReportDetail | null` instead of `void`
- [x] Write unit tests for the updated method (follow-up work)

### 2. Backend - Add PATCH API endpoint
**File:** `src/app/api/report/[id]/route.ts`

- [x] Add `PATCH` static method to `WeeklyReportDetailController`
- [x] Validate report exists and belongs to current user's account
- [x] Define Zod schema for request body validation (content field)
- [x] Call `reportService.updateReportContent()` with accountId
- [x] Return success response with updated report or appropriate error
- [x] Test with authentication, authorization, and edge cases (follow-up work)

### 3. Frontend - Create EditReportDialog component
**File:** `src/app/(pages)/report/[id]/components/EditReportDialog.tsx` (NEW)

- [x] Create new component file
- [x] Define component props interface:
  - `open: boolean`
  - `onOpenChange: (open: boolean) => void`
  - `reportId: string`
  - `initialContent: string`
  - `onUpdate: () => void` (callback to refresh parent)
- [x] **CHANGE**: Replace Dialog with Drawer component (using `@renderer/components/ui/drawer`)
- [x] Drawer should slide in from the right side
- [x] Add textarea for markdown input (use existing `Textarea` component)
- [x] Add live preview panel using existing `@lobehub/ui/Markdown` component (later removed - no preview needed)
- [x] Implement Save and Cancel buttons
- [x] Add loading state while saving
- [x] Implement unsaved changes detection and confirmation dialog
- [x] Call PATCH `/api/report/[id]` on save
- [x] Handle success/error responses with toast notifications
- [x] Verify content is non-empty before allowing save

### 4. Frontend - Integrate EditReportDialog into report-detail
**File:** `src/app/(pages)/report/[id]/report-detail.tsx`

- [x] Import `EditReportDialog` component and `PencilIcon`
- [x] Add "Edit Report" button next to "Delete" button
- [x] Add state for edit dialog: `isEditOpen`, `editingContent`, `hasUnsavedChanges`
- [x] Implement `handleEditStart` function to open dialog with current content
- [x] Implement `handleReportUpdate` callback to refresh report data
- [x] Test the full user flow: open edit, modify content, save, view changes (follow-up work)
- [x] Test cancel flow with unsaved changes detection (follow-up work)

### 5. Testing & Validation (Follow-up Work)

- [x] **Unit Tests**: Test `reportService.updateReportContent` method
  - Test successful update
  - Test report not found
  - Test permission failure (wrong account)
  - Test empty content validation

### 6. Documentation (if needed)

- [x] Update any relevant documentation if report editing is documented elsewhere
- [x] No update needed for OpenSpec spec (already defined in this proposal)

## Dependencies

- Task 2 depends on Task 1 (service method must exist before API can use it)
- Task 3 is independent and can work in parallel with Tasks 1-2
- Task 4 depends on Task 3 (EditReportDialog must exist before integration)
- Task 5 depends on Tasks 1, 2, 3, 4 being complete

## Estimated Complexity

- **Low** - Tasks 1, 2: Existing `updateReportContent` just needs exposure and public API
- **Medium** - Task 3: New component but reuses existing UI primitives
- **Low** - Task 4: Simple integration into existing UI
- **Low** - Task 5: Standard testing coverage

**Overall Complexity:** Low to Medium