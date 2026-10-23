# Science on Wheels — Unified Three-Role Platform

This package is the merged Science on Wheels application.

## Architecture

One application:
- one React/Vite frontend
- one Express/TypeScript backend
- one PostgreSQL (Supabase) / Prisma database
- one database-backed HttpOnly session
- one login page
- three role-specific portals

Login routing:
- `SUPER_ADMIN` → `/super-admin`
- `REGIONAL_ADMIN` → `/regional-admin`
- `SCIENCE_COMMUNICATOR` → `/instructor`

## RBAC

### Super Admin
Organization-wide control:
- organization/geography
- Regional Administrators and Field Staff
- roles and permissions
- mobile laboratories
- schools
- curriculum/experiments
- resources
- operations
- monitoring
- analytics/reports
- security/audit

### Regional Admin
Assigned-region operational scope:
- region/district/block/school visibility
- field staff assignments
- assigned labs
- schools and verification
- approved curriculum selection
- inventory/resource operations
- visits, schedules, routes, assignments and sessions
- monitoring, analytics and records

The backend derives region scope from the authenticated user session. A frontend-supplied `regionId` is not trusted.

### Science Communicator / Instructor
Field execution:
- assigned visits and schools
- assigned mobile laboratory
- route/travel visibility
- arrival and session execution
- attendance recording
- consumable consumption
- field issues
- session/visit records

## Security

- Argon2id password hashing
- database-backed sessions
- HttpOnly session cookie
- server-side role enforcement
- server-side permission enforcement
- regional data isolation
- audit logging
- no JWT dependency
- no plaintext passwords

## Run

### Backend

```bash
cd backend
npm install
npx prisma generate
npm run seed
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:5000`

## Environment

Copy `backend/.env.example` to `backend/.env`.

Required:
- `DATABASE_URL` (Supabase connection pooler URL, port 6543)
- `DIRECT_URL` (Supabase direct database URL, port 5432, for Prisma migrations)
- `SESSION_SECRET` (32+ characters and separate from the database password)
- `FRONTEND_URL`
- bootstrap Super Admin credentials

Optional integrations can remain unset during local development.

## Important

Do not run `prisma migrate reset` against a real database.

After changing `schema.prisma`:

```bash
npx prisma generate
npx prisma migrate dev --name <descriptive_name>
```

The Super Admin creates Regional Admin and Science Communicator accounts through the existing People & Access user workflow. The same login page then routes each account to its role-specific dashboard.

## Frontend visual direction

The dashboard UI is implemented in the React pages and `frontend/src/styles.css`, using the supplied Fleet Interface HTML files as visual references only. The styling follows the reference's warm linen grid, industrial charcoal navigation, terracotta action colour, sage status accents, compact technical labels, restrained borders, and responsive field-operations layout. The mockup HTML and its sample values are not used as runtime pages.

The role portals continue to use the existing authenticated API and database-backed records. No demo login or mock account bypass has been added.

## Environment files

- `backend/.env.example` — backend configuration template.
- `frontend/.env.example` — frontend configuration template.
- Copy each template to `.env` in its respective folder and replace placeholders locally.
- Never commit `.env` files or include them in project ZIPs. Frontend `VITE_*` variables are browser-visible and must not contain private secrets.

The Geoapify and Traccar entries are forward-looking configuration placeholders for planned route calculation and dedicated-device tracking. Adding these variables does not itself integrate those providers. The current backend already has a trip GPS-position endpoint for updates submitted through the SOW field workflow, but the Geoapify road-routing and Traccar ingestion integrations are not included in this visual refresh. The fleet network panel is explicitly labelled as a schematic, not a geographic live map.
