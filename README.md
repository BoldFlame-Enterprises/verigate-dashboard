# VeriGate Access Control - Web Dashboard

The admin web dashboard for the VeriGate Access Control system.

## 🚀 Features

- **Auth**: JWT login (with refresh-token handling) against the backend, role-gated to admins.
- **Event management**: create/select events; every other view is scoped to the selected event.
- **User management**: CRUD, deactivate, and bulk CSV import/export.
- **Access & area configuration**: CRUD for access levels and areas, plus assignment management.
- **Analytics**: scan-volume-over-time and grant/deny/area/access-level/scanner breakdown charts (Recharts), backed by cached backend aggregate endpoints, with CSV export of the raw scan log.
- **Real-time sync monitoring**: each device's (pass/scan) last-sync time and online/stale/offline status.
- **Incident & override review**: incident reports and emergency overrides filed from the scan app, reviewable/resolvable here.

## 🛠️ Tech Stack

React 18 + TypeScript, Vite, Tailwind CSS, React Router, TanStack Query, React Hook Form + Zod, Recharts, Axios, lucide-react.

## ⚙️ Configuration

Set `VITE_API_URL` (see `.env.example`) to the backend's `/api` URL - defaults to `http://localhost:3000/api`.

## 📦 Scripts

- `npm run dev`: Start the Vite development server.
- `npm run build`: Type-check and build for production.
- `npm run preview`: Preview the production build.
- `npm run lint`: Lint.
- `npm run type-check`: Validate TypeScript types with no emit.
