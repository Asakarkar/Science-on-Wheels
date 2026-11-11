# Science on Wheels — Mobile STEM Operations & Fleet Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6+-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Argon2id](https://img.shields.io/badge/Security-Argon2id-critical?style=flat-square)](https://github.com/ranisalt/node-argon2)
[![Three.js](https://img.shields.io/badge/Three.js-r125-black?style=flat-square&logo=threedotjs&logoColor=white)](https://threejs.org/)

**Science on Wheels** is an enterprise-grade fleet operations and educational resource management platform governing the administration, logistics, and field execution of mobile science laboratory buses for STEM education across distributed school networks.

---

## 1. Core Engineering Highlights

### 🚚 Calibrated 5-Mobile-Laboratory Fleet Capacity
- **Strict Fleet Boundary:** Architecture and validation rules are strictly calibrated to manage, schedule, and route up to **5 Mobile Laboratories** (e.g. `MH-12-SOW-01` through `MH-12-SOW-05`).
- **Lean & Efficient:** Zero dummy bloat—all operational telemetry, custody allocations, and live tracking operate smoothly within this dedicated 5-bus footprint.
- **Dedicated Route & Roster Coordination:** Real-time assignment of science communicators, drivers, visit itineraries, and specialized lab equipment to each individual vehicle.

### 🔬 4-Step Continuous Bus Inventory Reconciliation
To maintain laboratory grade custody across mobile buses, field operators execute an atomic, 4-step reconciliation workflow:
1. **Step A – Pre-Departure Opening Verification:** Physical audit before leaving depot. Variances require mandatory justification notes and trigger real-time alerts to the Regional Administrator.
2. **Step B – Material Consumption Tracking:** Live recording of consumables (chemicals, test tubes, reagents, safety gear) decremented atomically with non-negative constraints.
3. **Step C – Reusable Equipment Inspection:** Digital asset health check (Operational, Maintenance Required, Damaged, Lost) for microscopes, robotics kits, and telescopes before and after school sessions.
4. **Step D – Post-Visit Closing Reconciliation:** Formula-enforced reconciliation ($\text{Opening} - \text{Consumed} = \text{Closing}$) detecting unrecorded shrinkage or field loss.

### 📊 Real-World Data Ingestion Pipelines
- **Schools Ingestion (`School.csv`):** Ingestion pipeline (`schoolImporter.ts`) parsing authentic school networks, U-DISE identifiers, administrative blocks, student counts, and calendar itineraries.
- **Master Catalogue Ingestion (`Inventory.csv`):** Real-world inventory pipeline (`inventoryImporter.ts`) registering scientific equipment, serialized asset tags, chemical consumables, minimum thresholds, and initial unit valuations.

### 🎨 Refined UI & Interactive Visual Design
- **Unified Typography:** The entire platform exclusively utilizes the **Roboto** font family for clean readability across data tables, equipment asset matrices, and audit logs.
- **Interactive Three.js Scientific Command Login (v1.26.1):**
  - WebGL-powered 3D animated canvas featuring molecular benzene matrices, Rutherford-Bohr orbitals, planetary gearing, Bunsen flame kinetics, optical microscope blueprints, and harmonic rover paths.
  - Earthy tactile theme palette: Linen (`#F4F1EA`), Stone (`#DDD7CD`), Charcoal (`#2B3032`), Terracotta (`#BE755F`), and Sage (`#6E8075`).
  - Streamlined command header: *Science on Wheels* on the left, *Version 1.26.1* on the right.
- **Universal Centered Dialog & Modal System:**
  - All popups (Stock Adjustment, Consumable Registration, Equipment Inspection, QR Viewer) mount via React's `createPortal(..., document.body)`.
  - **Zero Dark/Black Backdrop:** 100% transparent backdrop overlay ensuring total visual clarity.
  - **Dead-Center Alignment:** Dialogs remain locked in the center of the viewport regardless of page scrolling or CSS containing-block traps.
- **Fully Responsive Architecture:** Complete multi-breakpoint support for mobile smartphones, tablets, and desktop workstations featuring responsive drawers, collapsible sidebars, and horizontal overflow protection on dense data tables.

---

## 2. System Architecture

Science on Wheels operates as a clean, modular monolith with explicit separation between server-side domain logic and client-side presentation:

```
science-on-wheels/
├── backend/                      # Node.js, Express & TypeScript API Service
│   ├── src/
│   │   ├── config/               # Environment validation (Zod schema)
│   │   ├── lib/                  # Core utilities (Prisma client, Argon2id, JWT, Audit Logger, Importers)
│   │   ├── middleware/           # RBAC guards, bearer token extraction, rate limiters
│   │   ├── routes/               # Modular role-scoped REST controllers
│   │   │   ├── auth.ts           # Login rate limiting, session generation, token refresh
│   │   │   ├── me.ts             # Identity profile & permission dictionary endpoint
│   │   │   ├── superAdmin/       # Global admin, geography, master inventory, fleet, audit
│   │   │   ├── regionalAdmin.ts  # Regional fleet, school rosters, visits, depot inventory
│   │   │   └── field.ts          # Field 4-step reconciliation, visit execution, incident reports
│   │   ├── services/             # Business domain services (bus rosters, schedule conflicts)
│   │   ├── app.ts                # Express application configuration & security headers
│   │   └── server.ts             # Server entrypoint
│   ├── prisma/                   # Database schema, migrations & seed pipeline
│   │   ├── schema.prisma         # Multi-model relational schema with high-cardinality indexes
│   │   └── seed.ts               # Database seed pipeline with real CSV ingestion
│   └── tests/                    # Specialized automated test suites
│       ├── test-regional-admin.js       # Regional operations & custody test suite
│       ├── test-field-staff.js          # Field execution & reconciliation test suite
│       ├── test-rbac.js                 # Multi-role permission boundary audit
│       ├── test-security.js             # Rate-limiting, brute-force & headers audit
│       └── test-multiuser-concurrent.js # Session isolation & concurrency suite
│
├── frontend/                     # React 19, Vite, TypeScript & React Router 7 SPA
│   ├── src/
│   │   ├── app/                  # Application router, AuthContext, and root shell
│   │   ├── layouts/              # Responsive portal layouts (Admin, Regional, Field, Auth)
│   │   ├── portals/              # Role-specific operational interfaces
│   │   │   ├── admin/            # Super Admin Command Center (12 operational modules)
│   │   │   ├── regional/         # Regional Operations Command (11 operational modules)
│   │   │   └── field/            # Field Operations Hub (8 mobile-first modules)
│   │   ├── services/             # Centralized API client (`apiClient`) with Bearer token isolation
│   │   ├── shared/               # Reusable UI components, design tokens, error boundaries
│   │   └── styles.css            # Unified design system stylesheet (Roboto font, tactile palette)
│   ├── index.html                # HTML5 entrypoint with Google Fonts (Roboto)
│   └── vite.config.ts            # Vite bundler configuration
│
├── Inventory.csv                 # Master scientific inventory & consumable records
├── School.csv                    # Educational network & scheduled visit dataset
└── package.json                  # Root monorepo workspace configuration
```

---

## 3. Role-Based Access Control (RBAC) & Default Credentials

Authentication derives regional scope and operational boundaries strictly from the authenticated database session identity. Client-supplied IDs are never trusted.

| Role | Primary Portal Route | Operational Scope | Default Email | Default Password |
|---|---|---|---|---|
| `SUPER_ADMIN` | `/admin/dashboard` | Organization-wide administration, global master catalogue, state/district geography, user lifecycle, global immutable audit logs. | `admin@scienceonwheels.com` | `Admin@123456` |
| `REGIONAL_ADMIN` | `/regional/dashboard` | Scoped regional fleet administration (max 5 buses), school onboarding, staff assignments, visit scheduling, inventory depot custody, report review. | `regional@scienceonwheels.com` | `RegionalAdmin@123456` |
| `SCIENCE_COMMUNICATOR` | `/field/dashboard` | Mobile laboratory execution, 4-step bus inventory reconciliation, session attendance logging, visit report drafting, operational incident escalation. | `field@scienceonwheels.com` | `FieldOperator@123456` |

*Additional concurrent test accounts seeded:*
- Regional Admin 2: `regional2@scienceonwheels.com` (`RegionalAdmin2@123456`)
- Field Operator 2: `field2@scienceonwheels.com` (`FieldOperator2@123456`)

---

## 4. API Routing Reference

### 🔐 Authentication & Session Management
- `POST /api/auth/login` — Authenticate credentials with Argon2id and issue session Bearer token (rate-limited).
- `POST /api/auth/logout` — Terminate active session and invalidate client token.
- `GET /api/me` — Retrieve authenticated user profile, assigned role, region context, and permissions array.

### 🌐 Super Admin Endpoints (`/api/super-admin/*`)
- `GET/POST /api/super-admin/users` — Manage user accounts, role bindings, and region associations.
- `GET/POST /api/super-admin/resource/equipment` — Global master reusable equipment catalogue.
- `GET/POST /api/super-admin/resource/consumables` — Global master consumable materials catalogue.
- `GET /api/super-admin/resource/audit` — Global immutable ledger of inventory transactions.
- `GET /api/super-admin/geography` — State, region, district, and block hierarchy management.
- `GET /api/super-admin/security/audit-logs` — System-wide security and operational audit trail.

### 🏢 Regional Admin Endpoints (`/api/regional-admin/*`)
- `GET/POST /api/regional-admin/buses` — Monitor and manage regional mobile laboratory fleet (max 5 buses).
- `GET/POST /api/regional-admin/schools` — School directory, U-DISE verification, and visit requests.
- `GET/POST /api/regional-admin/schedules` — Visit scheduling with automatic vehicle conflict detection.
- `GET/POST /api/regional-admin/inventory` — Regional warehouse inventory balance and allocation dispatch.
- `POST /api/regional-admin/inventory/allocate` — Transfer stock from regional depot to a specific mobile lab bus.
- `GET/POST /api/regional-admin/reports` — Review and verify post-visit field execution reports.

### 🚌 Field Execution Endpoints (`/api/field/*`)
- `GET /api/field/schedule/today` — Current day assigned visit, route destination, and bus roster.
- `GET /api/field/bus/inventory` — Real-time opening stock and apparatus checklist for assigned bus.
- `POST /api/field/inventory/verify-opening` — Step A: Pre-departure stock confirmation with discrepancy notes.
- `POST /api/field/inventory/log-consumption` — Step B: Atomic recording of materials consumed during experiments.
- `POST /api/field/inventory/inspect-equipment` — Step C: Apparatus operational condition audit.
- `POST /api/field/inventory/reconcile-closing` — Step D: Post-visit closing stock calculation and balance verification.
- `POST /api/field/visits/complete` — Finalize visit execution, student attendance, and submit field report.
- `POST /api/field/issues/report` — Real-time incident escalation (mechanical breakdown, safety hazard, shortages).

---

## 5. Getting Started

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **PostgreSQL**: v15.x or higher (Supabase transaction pooler on port 6543 supported)

### 1. Environment Setup

#### Backend Configuration
Copy `backend/.env.example` to `backend/.env` and update the parameters:
```bash
cp backend/.env.example backend/.env
```
Key backend variables:
```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

# PostgreSQL / Supabase
DATABASE_URL=postgresql://user:password@localhost:5432/science_on_wheels
DIRECT_URL=postgresql://user:password@localhost:5432/science_on_wheels

# Authentication
SESSION_SECRET=your-secure-random-session-secret-at-least-32-characters

# Initial Super Admin
BOOTSTRAP_ADMIN_NAME="Super Admin"
BOOTSTRAP_ADMIN_EMAIL=admin@scienceonwheels.com
BOOTSTRAP_ADMIN_PASSWORD=Admin@123456
```

#### Frontend Configuration
Copy `frontend/.env.example` to `frontend/.env`:
```bash
cp frontend/.env.example frontend/.env
```
Key frontend variables:
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 2. Database Migration & CSV Seeding
```bash
cd backend
npm install

# Generate Prisma Client
npm run prisma:generate

# Execute database migrations
npm run prisma:migrate

# Seed permissions, roles, users, mobile labs, School.csv and Inventory.csv
npm run seed
```

### 3. Running Development Servers

From the root repository directory:
```bash
# Start backend service (port 5000)
npm run dev:backend

# In a separate terminal, start frontend client (port 5173)
npm run dev:frontend
```

Open your browser to:
- **Frontend Application:** `http://localhost:5173`
- **Backend API Health Check:** `http://localhost:5000/api/health`

---

## 6. Automated Test Suites

The platform provides end-to-end integration and security test suites located in `backend/tests/`:

```bash
cd backend

# 1. Regional Administrator 15-Assertion Operational Test Suite
npm run test:regional

# 2. Field Staff 8-Endpoint Workflow Test Suite (4-Step Reconciliation)
npm run test:field

# 3. Role-Based Access Control (RBAC) Permission Boundary Audit
npm run test:rbac

# 4. Security Audit (Rate-Limiting, Brute-Force Defense, Security Headers)
npm run test:security

# 5. Multi-User Session Isolation & Concurrency Verification
npm run test:concurrent
```

To run all suites directly from the workspace root:
```bash
npm run test:regional
npm run test:field
npm run test:rbac
```

---

## 7. Security & Production Hardening

- **Argon2id Password Hashing:** Uses `argon2` with recommended memory cost and parallelism parameters.
- **Client Session Isolation:** Single-session Bearer token storage isolated to individual browser tabs, preventing token collision across multiple roles.
- **Rate Limiting & Brute-Force Defense:** Sliding-window IP rate limiter on sensitive endpoints (`/api/auth/login`).
- **Security HTTP Headers:** Strict `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and parameterized CORS policies.
- **SQL Injection Prevention:** 100% type-safe query formulation using Prisma ORM with parameterized execution.
- **Database Index Optimization:** Targeted B-tree indexes across high-cardinality foreign keys on `Bus`, `Event`, `Equipment`, `Consumable`, `InventoryTransaction`, and `AuditLog`.
- **Zod Request Validation:** Strict schema validation on all incoming payload bodies and query parameters.

---

## 8. License

This project is proprietary and confidential. All rights reserved by **Science on Wheels**.
