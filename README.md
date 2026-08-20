# VeriGate Access Control - Web Dashboard

The admin web dashboard for the VeriGate Access Control system.

## 🚀 Features

- **Revocable browser auth**: access and CSRF values remain in memory; a
  rotating HttpOnly production cookie bootstraps refresh through exact CORS,
  origin, and session-bound CSRF checks. Concurrent tab refreshes are
  coordinated without persistent bearer storage.
- **Event management**: create/select events; every other view is scoped to the selected event.
- **Administrator-led identity management**: server-driven
  search/pagination, pending-user creation, one-time activation delivery,
  password reset, reasoned suspend/resume/deactivate/reactivate controls,
  password-free bulk CSV import, and export. Suspension preserves event
  entitlements; reactivation after deactivation does not restore them.
- **Global security settings**: global administrators can inspect and change
  legacy QR v2 compatibility with optimistic version checks, a reason, and an
  exact typed confirmation. Event administrators cannot see the navigation or
  authorize the backing API operation.
- **Access & area configuration**: CRUD for access levels and areas, plus assignment management.
- **Analytics**: scan-volume-over-time and grant/deny/area/access-level/scanner breakdown charts (Recharts), backed by cached backend aggregate endpoints, with CSV export of the raw scan log.
- **Polling-based sync monitoring**: active views refetch approximately every 10 seconds to show each device's last-sync time and online/stale/offline status. “Live” means polling, not a socket stream; dashboard/analytics backend data uses five-second cache windows retained for 15 seconds.
- **Incident & override review**: incident reports and emergency overrides
  filed from Scan use event-scoped idempotency and bounded cursor history. The
  dashboard polls only the selected event's recent 50-row page and loads older
  incident/override history on demand without polling backlog pages.

## 🛠️ Tech Stack

React 18 + TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form + Zod, Recharts, Axios, lucide-react.

## ⚙️ Configuration

Set `VITE_API_URL` (see `.env.example`) to the backend's `/api` URL - defaults to `http://localhost:3000/api`.

For Vercel, configure `VITE_API_URL` as a project environment variable for Production and Preview before deploying. Its value must include `/api`, for example `https://verigate-api.example.com/api`. The backend must list each deployed dashboard origin in `CORS_ORIGINS`. `vercel.json` provides the React Router fallback so direct visits to routes such as `/users` load the application.

## 📦 Scripts

- `npm run dev`: Start the Vite development server.
- `npm run build`: Type-check and build for production.
- `npm run preview`: Preview the production build.
- `npm run lint`: Lint.
- `npm run type-check`: Validate TypeScript types with no emit.
- `npm test`: Run the committed dashboard component tests.

Static tests and builds do not prove authenticated browser operation against a hosted backend or a production CORS configuration.
