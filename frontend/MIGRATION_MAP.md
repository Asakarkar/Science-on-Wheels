# Science on Wheels Frontend Architecture Migration Map & Status

## Overview
All legacy monolithic components have been migrated to the role-based, modular architecture (`portal → module → page`) and dead code has been safely pruned.

| Original Component / Path | Current Modular Path | Portal / Module | Status | Notes |
|---|---|---|---|---|
| `src/lib/api.ts` | `src/services/api-client.ts` | Services | Complete | Replaced by centralized API client with fallback |
| (New) | `src/services/auth.service.ts` | Services | Complete | Dedicated session and auth service |
| (New) | `src/services/permissions.service.ts` | Services | Complete | Centralized permission & role logic |
| `src/types/auth.ts` | `src/shared/types/auth.ts` | Shared / Types | Complete | Core authentication and role types |
| `src/types/admin.ts` | `src/shared/types/admin.ts` | Shared / Types | Complete | Admin metadata & configuration models |
| `src/components/BrandLogo.tsx` | `src/shared/components/BrandLogo.tsx` | Shared / Components | Complete | Reusable vector branding asset |
| (New) | `src/shared/components/ScienceBackground.tsx` | Shared / Components | Complete | Multi-variant themed canvas background |
| (New) | `src/shared/components/DataTable.tsx` | Shared / Components | Complete | Reusable table with search & export |
| (New) | `src/shared/components/MetricCard.tsx` | Shared / Components | Complete | KPI card with sparkline visual |
| (New) | `src/shared/components/ErrorPages.tsx` | Shared / Components | Complete | 403 Forbidden & 404 Not Found pages |
| (New) | `src/app/providers/AuthProvider.tsx` | App / Providers | Complete | Auth context, user lifecycle, role state |
| (New) | `src/app/providers/QueryProvider.tsx` | App / Providers | Complete | Query & state provider shell |
| (New) | `src/guards/AuthGuard.tsx` | Guards | Complete | Enforces authenticated session |
| (New) | `src/guards/RoleGuard.tsx` | Guards | Complete | Enforces role-based portal access |
| (New) | `src/guards/PermissionGuard.tsx` | Guards | Complete | Fine-grained action permissions |
| (New) | `src/layouts/AuthLayout.tsx` | Layouts | Complete | Unauthenticated login shell |
| (New) | `src/layouts/AdminLayout.tsx` | Layouts | Complete | Super Admin sidebar & topbar layout |
| (New) | `src/layouts/RegionalLayout.tsx` | Layouts | Complete | Regional Admin sidebar & topbar layout |
| (New) | `src/layouts/FieldLayout.tsx` | Layouts | Complete | Field Operations layout for communicators |
| `src/pages/LoginPage.tsx` | `src/features/auth/components/LoginPage.tsx` | Features / Auth | Complete | Self-contained login feature |
| `src/pages/SuperAdminDashboard.tsx` | `src/portals/admin/*` | Portals / Admin | Complete | Split into 13 modular module pages |
| `src/pages/RegionalAdminDashboard.tsx` | `src/portals/regional/*` | Portals / Regional | Complete | Split into 10 modular module pages |
| `src/pages/FieldDashboard.tsx` | `src/portals/field/*` | Portals / Field | Complete | Split into 9 modular module pages |
| `src/App.tsx` | `src/app/App.tsx` | App | Complete | Re-exports App with providers and router |
| (New) | `src/app/router.tsx` | App | Complete | Declarative React Router v7 router |
