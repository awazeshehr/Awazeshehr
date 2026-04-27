# Plan: Run the Project and Optimize GUI Performance

Objective
- Start the full stack locally, verify correct behavior, and establish a performance baseline.
- Remove unused code/assets and eliminate GPU-heavy effects.
- Implement targeted optimizations to improve perceived and actual UI performance while preparing for future load balancing.

Assumptions
- Node and npm are installed; MongoDB connection string in server/.env is valid.
- The app uses React with create-react-app (react-scripts) and an Express backend at server/server.js.
- Ports currently used: API on 5000, web client on 3000 or 3001.

Run Project (Baseline)
1) Ensure no port conflicts on 3000 and 5000.
2) Start backend: npm run server (or via npm run dev concurrently from project root).
3) Confirm logs show “Server running on port 5000”.
4) Start frontend: npm run client (or concurrently with dev script).
5) Open the client in the browser and log in with each role to load typical screens:
   - SuperAdminDashboard, DepartmentAdminDashboard, CitizenDashboard.
6) Record baseline metrics:
   - First contentful paint, Largest contentful paint, Time to interactive.
   - CPU time on main thread, memory footprint, FPS while navigating key screens.
   - Use Chrome DevTools Performance and Lighthouse.

Performance Audit (What to Look For)
- Bundle size and unused code: check Coverage tab and bundle analyzer.
- Rendering cost: React DevTools Profiler for heavy components (e.g., DepartmentAdminDashboard.js, SuperAdminDashboard.js).
- GPU pressure: CSS animations, transforms, filters, large box-shadows, parallax effects.
- Large images/media: unoptimized images, oversized SVGs or Lottie, unused icon packs.
- Network: large or chatty API payloads, duplicate requests, missing caching.

Cleanup: Remove Unused/Heavy Items
1) Dependencies:
   - Generate dependency usage report; remove libraries not imported anywhere.
   - Replace heavy icon packs with a subset or inline SVGs.
2) Assets:
   - Delete unused images, videos, CSS, and fonts (verify references first).
   - Compress large images (WebP/AVIF where supported) and set max dimensions.
3) Animations & Effects:
   - Remove spinning/continuous animations and 3D transforms where not essential.
   - Reduce heavy box-shadows/filters; prefer simpler styles.
   - Add prefers-reduced-motion support to disable animations for low-power devices.

Frontend Optimization Tasks
1) Bundle Size:
   - Introduce route-level code splitting with React.lazy/Suspense for major pages.
   - Dynamic import heavy chart/maps modules only where needed.
   - Tree-shake and remove dead code; ensure production build uses NODE_ENV=production.
2) Rendering:
   - Memoize components and selectors where props are stable.
   - Virtualize large tables/lists (e.g., complaints list) to keep DOM small.
   - Debounce/throttle search and filter inputs; avoid re-computations in render.
   - Move expensive computations to web workers if needed.
3) State & Re-renders:
   - Minimize top-level state; lift state only where necessary.
   - Use React.memo/useMemo/useCallback for stable dependencies.
4) Styles:
   - Scope styles to components to reduce global CSS costs.
   - Remove unused CSS rules (guided by Coverage).

Network & Caching
- Enable HTTP compression for API responses (server-side).
- Add ETag/Cache-Control for static assets via CRA build output and hosting config.
- Cache API responses on the client for infrequently changing data (e.g., departments list).
- Batch API requests and avoid duplicate fetches on mount.

Server-Side Quick Wins
- Ensure compression middleware is enabled in Express.
- Review large JSON payloads; paginate and limit fields where appropriate.
- Ensure indexes align with query patterns (already syncing indexes on startup).

Build & Verification
1) Add bundle analysis (source-map-explorer or webpack-bundle-analyzer).
2) Run a production build (npm run build) and collect metrics:
   - Total JS/CSS size, main chunk size, largest route chunk.
3) Re-run Lighthouse and DevTools Performance:
   - Target improvements in LCP, TTI, CLS, and reduced JS execution time.
4) Confirm no visual regressions.

Safety Checks & Rollback
- Use git branches/commits for each optimization group to allow quick rollback.
- Delete assets/deps only after double-checking references with code search.

Acceptance Criteria
- App runs locally without errors; server on 5000 and client reachable.
- Initial route load JS < 300KB gzipped (target; adjust based on current baseline).
- No continuous GPU-heavy animations; smooth 60fps on dashboard navigation on typical hardware.
- Lighthouse performance score improved versus baseline and meets agreed thresholds.

Planned Files/Areas to Touch (Examples, not exhaustive)
- Frontend pages/components to profile and optimize:
  - c:\\_FYP_\\src\\pages\\SuperAdminDashboard.js
  - c:\\_FYP_\\src\\pages\\DepartmentAdminDashboard.js
  - c:\\_FYP_\\src\\pages\\CitizenDashboard.js
- Styles to audit:
  - c:\\_FYP_\\src\\pages\\*.css
- Build/report tooling:
  - package.json scripts for analyzer and production build
- Server middleware:
  - c:\\_FYP_\\server\\server.js (compression and caching headers)

Next Actions After Approval
1) Run the project and capture baseline metrics.
2) Integrate bundle analyzer and report findings.
3) Remove unused deps/assets; commit changes.
4) Implement code-splitting and virtualization on heavy screens.
5) Optimize animations and styles for lower GPU usage.
6) Add server compression and client/network caching improvements.
7) Build production, re-measure, and iterate if needed.
