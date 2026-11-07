# SciMove – Intelligent Mobile STEM Education and Resource Management Platform

SciMove is an enterprise-grade platform governing the administration, logistics, and field execution of mobile science laboratory buses for STEM education across distributed school networks.

---

## 1. System Architecture

SciMove operates as a clean, modular monolith with explicit role boundaries:

```
scimove/
│
├── backend/                  # Node.js, Express & TypeScript API Service
│   ├── src/
│   │   ├── config/           # Environment validation (Zod)
│   │   ├── lib/              # Core utilities (Prisma, Argon2id, JWT, Audit, RateLimiter)
│   │   ├── middleware/       # Token extraction & RBAC role/permission guards
│   │   ├── routes/           # Role-based API route modules
│   │   │   ├── auth.ts       # Authentication, login rate limiting, session refresh
│   │   │   ├── me.ts         # Identity & permissions dictionary endpoint
│   │   │   ├── superAdmin/   # Organization, geography, users, roles & dynamic resource engine
│   │   │   ├── regionalAdmin.ts # Fleet, schools, multi-staff bus rosters, visits & inventory allocations
│   │   │   └── field.ts      # 4-step bus inventory reconciliation, session execution & reports
│   │   ├── services/         # Domain business services (Bus staff rosters, etc.)
│   │   ├── app.ts            # Express application configuration & security headers
│   │   └── server.ts         # HTTP server entrypoint
│   ├── prisma/               # Schema, migrations & CSV seeding pipeline
│   └── tests/                # Automated test suites (Regional Admin, Field Staff, RBAC, Security)
│
├── frontend/                 # React 19, Vite, TypeScript & React Router 7 SPA
│   ├── src/
│   │   ├── app/              # Router, AuthProvider, and application shell
│   │   ├── layouts/          # Portal layouts with mobile drawers (Admin, Regional, Field, Auth)
│   │   ├── portals/          # Role-specific operational interfaces
│   │   │   ├── admin/        # Super Admin Command Center (12 operational modules)
│   │   │   ├── regional/     # Regional Operations Command (11 operational modules)
│   │   │   └── field/        # Field Operations Hub (8 standardized mobile-first modules)
│   │   ├── services/         # Centralized API client (`apiClient`) with Bearer token isolation
│   │   └── shared/           # Design system tokens, SVGs, error boundaries, navigation constants
│
└── package.json              # Monorepo workspace configuration & development scripts
```

---

## 2. Role-Based Access Control (RBAC) & Portal Routing

| Role | Primary Portal Route | Operational Scope |
|---|---|---|
| `SUPER_ADMIN` | `/admin/dashboard` | Organization-wide administration, global master catalog, geography, user & role lifecycle, global audit logs, system configuration. |
| `REGIONAL_ADMIN` | `/regional/dashboard` | Scoped regional fleet administration, school onboarding, multi-staff bus rosters, visit scheduling & conflicts, inventory custody & allocations, report review. |
| `SCIENCE_COMMUNICATOR` | `/field/dashboard` | Mobile laboratory execution, 4-step bus inventory reconciliation, session attendance logging, visit report drafting, operational incident escalation. |

*Note: The backend derives regional and operational scope strictly from the authenticated database session identity. Client-supplied IDs are never trusted.*

---

## 3. Four-Step Continuous Bus Inventory Reconciliation

Field staff execute continuous stock reconciliation directly on mobile laboratory buses:
1. **Step A – Opening Stock Verification:** Physical count before departing for schools. Any variance requires mandatory justification and triggers an automatic alert for the Regional Administrator.
2. **Step B – Material Consumption Logging:** Atomic stock decrements with non-negative validation and immutable ledger audit logging.
3. **Step C – Equipment Inspection:** Reusable assets checked before and after visits. Defective or missing items escalate directly to Regional Admin.
4. **Step D – Closing Stock Reconciliation:** Post-visit reconciliation ($\text{Opening} - \text{Consumed} = \text{Closing}$) detecting unrecorded shrinkage.

---

## 4. Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database (Supabase pooler supported)

### Environment Configuration
1. Backend: Copy `backend/.env.example` to `backend/.env` and configure:
   - `DATABASE_URL` (Port 6543 pooler with `pgbouncer=true`)
   - `DIRECT_URL` (Port 5432 direct connection for Prisma migrations)
   - `SESSION_SECRET` (At least 32 random characters)
   - `FRONTEND_URL` (`http://localhost:5173`)
   - `BOOTSTRAP_ADMIN_EMAIL` & `BOOTSTRAP_ADMIN_PASSWORD`
2. Frontend: Copy `frontend/.env.example` to `frontend/.env` and configure:
   - `VITE_API_BASE_URL` (`http://localhost:5000/api`)

### Running the Application

```bash
# Backend setup & development
cd backend
npm install
npm run build
npm run dev

# Frontend setup & development (in a separate terminal)
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.  
Backend runs at `http://localhost:5000`.

---

## 5. Automated Test Suites

SciMove includes specialized functional integration and security test suites in `backend/tests/`:

```bash
cd backend

# Run Regional Admin 15-assertion functional test suite
npm run test:regional

# Run Field Staff 8-endpoint operational suite
npm run test:field

# Run Multi-User RBAC & Permission boundary audit
npm run test:rbac

# Run Multi-User session isolation & concurrency suite
npm run test:concurrent
```

---

## 6. Security & Production Hardening

- **Password Hashing:** Native Argon2id cryptographic hashing (`argon2`).
- **Session Isolation:** Independent Bearer tokens with client-tab isolation.
- **Brute-Force Protection:** IP-based sliding window rate limiter on `/api/auth/login`.
- **Security Headers:** Strict `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- **Zero Insecure Dependencies:** Unused external Supabase SDKs removed in favor of direct Prisma PostgreSQL connectivity.
- **Database Indexing:** High-cardinality indexes on `Event`, `Equipment`, `Consumable`, `InventoryTransaction`, and `AuditLog`.
