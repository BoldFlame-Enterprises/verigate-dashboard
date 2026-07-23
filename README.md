# VeriGate Access Control - Web Dashboard

The admin web dashboard for the VeriGate Access Control system.

## 🚀 Features

- **Auth**: JWT login (with refresh-token handling) against the backend, role-gated to admins.
- **Event management**: create/select events; every other view is scoped to the selected event.
- **User management**: server-driven search/pagination, CRUD, deactivate, and bulk CSV import/export.
- **Access & area configuration**: CRUD for access levels and areas, plus assignment management.
- **Analytics**: scan-volume-over-time and grant/deny/area/access-level/scanner breakdown charts (Recharts), backed by cached backend aggregate endpoints, with CSV export of the raw scan log.
- **Polling-based sync monitoring**: active views refetch approximately every 10 seconds to show each device's last-sync time and online/stale/offline status. “Live” means polling, not a socket stream; dashboard/analytics backend data uses five-second cache windows retained for 15 seconds.
- **Incident & override review**: incident reports and emergency overrides filed from the scan app, reviewable/resolvable here.

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
