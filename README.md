# CATMS-Frontend

React and TypeScript web client for **MedSync / CATMS**, a Clinic Appointment and Treatment Management System developed for CS3043 by DataNexus.

[Web application](https://www.medsync.live) · [Primary API](https://backend.medsync.live/api/health) · [Backend repository](https://github.com/datanexus-cs3043/CATMS-Backend) · [Project documentation](https://github.com/datanexus-cs3043/project-docs)

## Functional Overview

- Public clinic directory with branches, doctors, specialties and services.
- Login, role-based navigation, dashboards and account/profile management.
- Patient records and emergency contacts; doctor/branch/staff/treatment management.
- Staff-managed booking, rescheduling and cancellation; consultation notes, recorded treatments and completed-visit billing.
- Itemized invoices, partial patient receipts, separate doctor compensation, and insurance policies/coverage/claims.
- Patient views for their appointments and bills, and doctor views for their own appointments and related patients.
- Management reports with date/branch controls and browser Print / Save as PDF.

| Role | Main interface |
| --- | --- |
| Admin | System administration, users, clinic records, billing and reports |
| Branch manager | Assigned-branch operations, billing and reports, with shared patient reads |
| Receptionist/cashier | Patient administration, appointment scheduling, billing and insurance |
| Doctor | Own visits/patients, consultation notes, treatments and compensation information |
| Patient | Own appointments, bills and permitted profile information |

Patient scheduling is managed by staff. Client navigation reflects permissions; the backend remains authoritative for role, branch and ownership checks. Optional portal accounts are provisioned through staff workflows.

### Reports and Financial Meaning

The five reports cover daily branch appointments, doctor revenue, outstanding patient balances, treatments by category, and insurance versus out-of-pocket payments. Appointment/treatment reports use visit dates; the other financial reports select invoice dates and show current values for those invoices. Print/export uses the browser's print dialog, not a server PDF-generation service.

Patient receipts, doctor compensation and claim approvals are distinct. An insurance approval is **not received cash** and does not automatically reduce invoice balance. The insurance report's patient-paid/out-of-pocket value represents net patient payments; billed minus approved coverage is an estimate of patient exposure. Coverage caps apply per policy/invoice, not as annual insurer benefits.

## Technical Stack

- React 19, TypeScript and Vite.
- React Router, Axios, CSS and Lucide icons.
- Cookie-session integration with account-bound CSRF headers for protected writes.
- Node.js 24 in the container build; Docker/Nginx for static hosting and Vercel for the primary deployment.
- Separate FastAPI/Pydantic backend with raw psycopg 3 SQL access to external PostgreSQL/Neon; the browser does not connect to the database.

## Repository Structure

```text
src/
  App.tsx           # Routes, role guards and application layout
  auth/             # Login, session context and protected routes
  components/       # Shared navigation, tables, forms and dialogs
  pages/            # Clinical, administrative, financial and report screens
  services/api.ts   # Typed API calls, cookies and CSRF integration
  utils/            # Clinic dates and request-error helpers
public/             # Static web assets
tsconfig.json       # TypeScript configuration
vite.config.js      # Vite build configuration
Dockerfile          # Node build stage and Nginx runtime
nginx.conf          # SPA route fallback for Nginx
vercel.json         # SPA route fallback for Vercel
```

## Execution Guide

### Local Development Server

Prerequisites: Node.js 24 and npm, plus the configured [backend](https://github.com/datanexus-cs3043/CATMS-Backend). Run commands from this repository.

```bash
npm ci
```

Copy the configuration template using your shell:

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```bash
# Linux/macOS
cp .env.example .env
```

Set the public API address in the local file, including `/api`:

```dotenv
VITE_API_BASE_URL=http://localhost:8000/api
```

Start the backend separately, allow `http://localhost:5173` in its `FRONTEND_URLS`, then run:

```bash
npm run dev
```

Open [localhost:5173](http://localhost:5173). Axios sends credentials; the API must allow the exact frontend origin with credentials. Cross-site HTTPS sessions also require appropriate secure backend cookie settings.

### Type Checking and Production Build

```bash
npm run build
npm run preview
```

`npm run build` runs `tsc --noEmit && vite build`: TypeScript checks must pass before bundling, including strict checking and unused-local/parameter checks. For a type-only check, run `npx tsc --noEmit`. Production output is `dist/`; preview is for local inspection, not a production server. On PowerShell, use `npm.cmd` / `npx.cmd` if script execution policy prevents the `.ps1` wrappers from running.

### Docker Container

```bash
docker build -t catms-frontend .
docker run --rm -p 5173:80 catms-frontend
```

The Dockerfile accepts `ARG VITE_API_BASE_URL`, defaults it to `http://localhost:8000/api`, and exposes it to Vite in the builder stage. To build against the primary hosted API:

```bash
docker build --build-arg VITE_API_BASE_URL=https://backend.medsync.live/api -t catms-frontend .
```

**Configure the API address before building.** Vite embeds it in the JavaScript bundle; `docker run -e VITE_API_BASE_URL=...` does not change the compiled client. The API URL is resolved by the user's browser, so `localhost` means that browser's machine. `.dockerignore` excludes `.env` and `.env.local`; use the build argument for Docker configuration. Nginx serves the compiled files and falls back to `index.html` for client routes.

To run both containers, place this repository beside `CATMS-Backend` and follow its Compose instructions; Compose still uses an external database and the same frontend build-time configuration rules.

## Hosting and Verification

The primary web application is [www.medsync.live](https://www.medsync.live) on Vercel, using [backend.medsync.live](https://backend.medsync.live) on Azure. Set `VITE_API_BASE_URL=https://backend.medsync.live/api` in the frontend build environment and rebuild after changes. `vercel.json` supplies client-route rewrites; deployment configuration and access are managed separately from the source files.

[Render](https://catms-backend-fa6t.onrender.com/api/health) is a backend standby, not automatic failover. Switching API hosts requires an explicit configuration/rebuild and session/CORS verification. Never put database credentials, JWT keys or CSRF secrets in `VITE_` variables: their values are public in the compiled client.

Before release, verify the intended frontend/backend revisions and database schema together: login/session, all five roles and denied actions, appointment-to-invoice/receipt flows, insurance handling, report filters/totals and browser print layout. Type checking, builds and a healthy API alone do not establish those environment-specific results.

## Team Contributions

Contributions span both application repositories and the database; areas overlap and include implementation, integration and review.

| Member | Contribution areas |
| --- | --- |
| Shashika | Real-login/doctor/profile integration, cross-layer validation and integration corrections; backend schemas and SQL organization; Docker setup, CI/CD, Azure/Vercel deployment and project documentation |
| Nayanajith Bandara | Authentication/security and account/role API integration; clinical/administrative, billing, insurance and report APIs; frontend staff/application integration corrections |
| Tharushi | Initial React/Vite/Docker frontend setup and shared components; login/landing/profile, patient/detail, staff/treatment and initial report interfaces; appointment lifecycle endpoints and database contributions |
| Adithya | Invoice/detail, insurance and patient-facing pages; navigation/dashboard styling, branch management and report presentation; database procedures and integrity triggers |
| Sithuka | Dashboard/doctor/branch/appointment components, API/insurance/CSRF integration and integration restoration; treatment bridge, invoice generation, receipt ledger and report SQL |

## Central Documentation

See the [project-docs repository](https://github.com/datanexus-cs3043/project-docs) for system requirements, architecture, roles, reports and database design, and the [backend README](https://github.com/datanexus-cs3043/CATMS-Backend#readme) for configuration, fresh-database prerequisites, forward migrations and CI/CD behavior.
