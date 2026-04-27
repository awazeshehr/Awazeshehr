# Department Admin Operations Dashboard – Redesign Plan

## Goals
- Transform the Department Admin UI into a professional operational console distinct from the Citizen experience.
- Improve navigation scanability and task efficiency via grouped, collapsible sidebar and compact modes.
- Elevate situational awareness with KPI cards, filters, and a modern, operable data grid.
- Maintain existing tech stack (React + react-scripts). Avoid new UI libraries; leverage existing CSS and Recharts.

## Information Architecture
- Navigation (grouped and collapsible):
  - Dashboard
    - Overview (default)
  - Complaint Operations
    - Complaint Management
    - Verification & Closure
  - Personnel Management
    - Officer Management
  - Monitoring
    - Live Map
  - Communication
    - Messages / Notifications
  - Analytics
    - Reports & Insights
  - System
    - Logout
- Sidebar behaviors:
  - Collapsible groups with headers and caret toggles.
  - Compact icon-only mode (pin button). Persist in localStorage.
  - Visible active state with strong contrast and left accent bar.
  - Scroll within sidebar body (not horizontal).

## Page Hierarchy (Dashboard & Complaints)
1. Top Header: Page title + quick actions (Refresh, Export, Advanced Filters toggle).
2. Operational KPI Cards: High-level metrics with icons and color coding.
3. Filter Toolbar: Compact inline filters; Advanced Panel collapsible.
4. Complaint Data Grid: Sortable, paginated, row-hover actions, expandable rows.

## Visual Design System
- Card-based layout with subtle shadows and 8px spacing scale.
- Rounded components (4px/8px), neutral background, elevated surfaces.
- Status and priority use consistent color tokens:
  - Status: Pending (yellow), In Progress (blue), Resolved (green).
  - Priority: High (red), Medium (orange), Low (green).
- Typography hierarchy: h2 page title, h3 section titles, 14px body, 12px captions.
- RTL support: When language=urdu, apply `dir="rtl"` on main container and flip paddings/margins.

## Components to Introduce
1) AdminLayout (shell)
- Purpose: Provide consistent header + sidebar + content area for all admin pages.
- Files:
  - src/components/admin/AdminLayout.jsx
  - src/components/admin/AdminLayout.css
- Features:
  - Header with page title, breadcrumb placeholder, quick actions (Refresh, Export, Advanced Filters).
  - Integrates AdminSidebar; receives `pageTitle`, `actions` props.
  - Applies `dir="rtl"` when Urdu is selected via LanguageContext.

2) AdminSidebar (grouped navigation)
- Files:
  - src/components/admin/AdminSidebar.jsx
  - src/components/admin/AdminSidebar.css
- Implementation notes:
  - Accepts groups/items config and `activeKey`, `collapsed`, `onToggleGroup`, `onCollapseToggle`.
  - Uses Font Awesome icons already present in project.
  - Persists collapsed and group states in localStorage.

3) KpiCard
- Files:
  - src/components/admin/KpiCard.jsx
  - src/components/admin/KpiCard.css
- Props: `icon`, `value`, `label`, `tone` ('total'|'pending'|'progress'|'resolved'|'overdue'|'highPriority').
- Optional: Tiny Recharts sparkline (already dependency) for trend where data available.

4) FilterToolbar and AdvancedFilterPanel
- Files:
  - src/components/admin/FilterToolbar.jsx
  - src/components/admin/FilterToolbar.css
- Toolbar includes compact inputs:
  - Search (ID/Title), Category, Status, Priority, Date Range, Overdue Toggle.
  - Buttons: Apply, Reset, Advanced.
- Advanced panel adds: Area, Region, Assigned Officer.

5) DataGrid (no external libs)
- Files:
  - src/components/admin/DataGrid.jsx
  - src/components/admin/DataGrid.css
- Features:
  - Sticky header, column sorting, client-side pagination, row hover highlight.
  - Expandable row: shows short description/SLA timelines.
  - Quick actions column with icon buttons + tooltips (title attr fallback).
  - Columns: Complaint ID, Citizen Name, Sentiment, Status, Priority, Assigned Officer, Due Date, Created Date, Actions.
  - Accessible: header buttons are keyboard-focusable; aria-sort on active column.

## Implementation Steps (Concrete)
1) Navigation & Layout
- Create AdminSidebar and AdminLayout.
- Replace DepartmentAdminDashboard container markup to wrap pages with AdminLayout.
- Move current sidebar logic into AdminSidebar; feed grouped config:
  ```js
  const navGroups = [
    { title: t('nav_dashboard'), items:[{ key:'dashboard', icon:'fa-gauge', label:t('overview') }] },
    { title: t('nav_complaints'), items:[
        { key:'complaints', icon:'fa-list', label:t('complaintManagement') },
        { key:'verification', icon:'fa-clipboard-check', label:t('verificationClosure') }
      ]},
    { title: t('nav_personnel'), items:[{ key:'officers', icon:'fa-users', label:t('officerManagement') }]},
    { title: t('nav_monitoring'), items:[{ key:'map', icon:'fa-map', label:t('liveMap') }]},
    { title: t('nav_comm'), items:[{ key:'communication', icon:'fa-comments', label:t('messagesNotifications') }]},
    { title: t('nav_analytics'), items:[{ key:'reports', icon:'fa-chart-line', label:t('reportsInsights') }]},
    { title: t('nav_system'), items:[{ key:'logout', icon:'fa-sign-out-alt', label:t('logout') }]}
  ];
  ```
- Ensure active state sync with `activePage` in DepartmentAdminDashboard.

2) Distinct Admin Look & Feel
- Introduce AdminLayout.css tokens: background, card shadows, spacing, badge classes.
- Add RTL support hook from LanguageContext: when Urdu, set `dir="rtl"` on root admin container.

3) KPI Cards
- Replace existing grid with KpiCard components.
- Add new metrics and calculation hookup:
  - Resolved Today, Overdue Complaints, High Priority Complaints.
- Color-code cards by `tone` prop.

4) Filter System
- Add FilterToolbar controlling `filters` in DepartmentAdminDashboard state.
- Toolbar surface: Search, Category, Status, Priority, Date Range, Overdue.
- Advanced panel toggles to reveal Area, Region, Officer.
- Wire Apply/Reset to reload `complaints` via existing `loadComplaints()`.

5) Data Grid
- Replace current table in ComplaintManagementPage with DataGrid.
- Implement:
  - Sorting: local state `sortBy`, `sortDir`; compute derived sorted array.
  - Pagination: page size selector; controlled `page`, `pageSize` state.
  - Expand rows: show brief details and SLA info.
  - Row hover: show action buttons (View, Assign, Escalate, Mark Resolved).
- Badges:
  - Status badge classes: `badge status-pending|inprogress|resolved`.
  - Priority badge classes: `badge prio-high|prio-med|prio-low`.

6) Actions & Tooltips
- Use icons (fa-eye, fa-user-check, fa-exclamation-triangle, fa-check-circle).
- Title attributes for native tooltips; optional small tooltip styling later.
- Action surface:
  - Hover show inline icons OR a kebab menu (responsive: dropdown on narrow screens).

7) Translations
- Add keys in `src/translations.js` (English/Urdu):
  - Navigation group titles: nav_dashboard, nav_complaints, nav_personnel, nav_monitoring, nav_comm, nav_analytics, nav_system.
  - Items: overview, complaintManagement, verificationClosure, officerManagement, liveMap, messagesNotifications, reportsInsights.
  - Grid columns: citizenName, sentiment, assignedOfficer, dueDate, createdDate, actions.
  - Filters: applyFilters, resetFilters, overdueOnly, dateRange.
- Ensure all headings/buttons in admin pages use `t()`.

8) RTL Considerations
- Apply `.rtl` or `dir="rtl"` to admin root when Urdu.
- Flip paddings/margins in CSS using logical properties (`margin-inline-start`).

9) Performance & UX
- Skeleton loaders for KPI and grid while `isLoading`.
- Debounce search input (300ms).
- Persist filters and pagination in URL query or localStorage for convenience.

10) Verification
- Manual QA checklist:
  - Sidebar grouping, collapse, compact mode, active highlighting.
  - KPI cards values reflect API data; colors correct.
  - Filters modify grid data; reset works.
  - Sorting/pagination behave; expand rows show details.
  - Action icons trigger existing handlers (view, assign, escalate, resolve).
  - Urdu: all UI strings translated; layout flips RTL correctly.
  - Responsive checks at 1280, 1024, 768, 480 widths.

## File Touchpoints (Implementation Phase)
- New:
  - src/components/admin/AdminLayout.jsx|css
  - src/components/admin/AdminSidebar.jsx|css
  - src/components/admin/KpiCard.jsx|css
  - src/components/admin/FilterToolbar.jsx|css
  - src/components/admin/DataGrid.jsx|css
- Updated:
  - src/pages/DepartmentAdminDashboard.js (use AdminLayout, FilterToolbar, DataGrid, KPI)
  - src/pages/DepartmentAdminDashboard.css (or new admin CSS split)
