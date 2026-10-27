import { Navigate, createBrowserRouter } from "react-router-dom";
import { AuthGuard } from "../guards/AuthGuard";
import { RoleGuard } from "../guards/RoleGuard";
import { AuthLayout, AdminLayout, RegionalLayout, FieldLayout } from "../layouts";
import { LoginPage } from "../features/auth/components/LoginPage";
import { ForbiddenPage, NotFoundPage } from "../shared/components/ErrorPages";

// Admin Portal Pages
import {
  DashboardPage as AdminDashboardPage,
  OrganizationPage,
  GeographyPage,
  UsersPage,
  RolesPermissionsPage,
  MobileLabsPage,
  SchoolsPage,
  CurriculumPage,
  InventoryPage,
  OperationsPage,
  AnalyticsPage,
  ReportsPage,
  SecurityAuditPage
} from "../portals/admin";

// Regional Portal Pages
import {
  RegionalDashboardPage,
  RegionalSchoolsPage,
  RegionalStaffPage,
  RegionalMobileLabsPage,
  RegionalSchedulesPage,
  RegionalRoutesPage,
  RegionalInventoryPage,
  RegionalMaintenancePage,
  RegionalDocumentsPage,
  RegionalReportsPage
} from "../portals/regional";

// Field Operations Portal Pages
import {
  FieldDashboardPage,
  FieldAssignmentsPage,
  FieldVisitsPage,
  FieldExperimentsPage,
  FieldAttendancePage,
  FieldEquipmentPage,
  FieldInspectionsPage,
  FieldIncidentsPage,
  FieldHistoryPage
} from "../portals/field";

import { useAuth } from "./providers/AuthProvider";

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="loading-state" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <div className="loader-ring" />
        Loading Science on Wheels…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === "SUPER_ADMIN") return <Navigate to="/admin/dashboard" replace />;
  if (user.role === "REGIONAL_ADMIN") return <Navigate to="/regional/dashboard" replace />;
  if (user.role === "SCIENCE_COMMUNICATOR") return <Navigate to="/field/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

export const router = createBrowserRouter([
  // Public Login
  {
    path: "/login",
    element: <AuthLayout />,
    children: [
      { index: true, element: <LoginPage /> }
    ]
  },

  // Root Redirection
  {
    path: "/",
    element: <RootRedirect />
  },

  // Protected Super Admin Portal (/admin)
  {
    path: "/admin",
    element: <AuthGuard />,
    children: [
      {
        element: <RoleGuard allowedRoles={["SUPER_ADMIN"]} />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: <Navigate to="/admin/dashboard" replace /> },
              { path: "dashboard", element: <AdminDashboardPage /> },
              { path: "organization", element: <OrganizationPage /> },
              { path: "geography", element: <GeographyPage /> },
              { path: "users", element: <UsersPage /> },
              { path: "roles", element: <RolesPermissionsPage /> },
              { path: "roles-permissions", element: <RolesPermissionsPage /> },
              { path: "mobile-labs", element: <MobileLabsPage /> },
              { path: "schools", element: <SchoolsPage /> },
              { path: "curriculum", element: <CurriculumPage /> },
              { path: "inventory", element: <InventoryPage /> },
              { path: "operations", element: <OperationsPage /> },
              { path: "analytics", element: <AnalyticsPage /> },
              { path: "reports", element: <ReportsPage /> },
              { path: "audit-logs", element: <SecurityAuditPage /> },
              { path: "security-audit", element: <SecurityAuditPage /> }
            ]
          }
        ]
      }
    ]
  },

  // Protected Regional Admin Portal (/regional)
  {
    path: "/regional",
    element: <AuthGuard />,
    children: [
      {
        element: <RoleGuard allowedRoles={["REGIONAL_ADMIN"]} />,
        children: [
          {
            element: <RegionalLayout />,
            children: [
              { index: true, element: <Navigate to="/regional/dashboard" replace /> },
              { path: "dashboard", element: <RegionalDashboardPage /> },
              { path: "schools", element: <RegionalSchoolsPage /> },
              { path: "staff", element: <RegionalStaffPage /> },
              { path: "mobile-labs", element: <RegionalMobileLabsPage /> },
              { path: "schedules", element: <RegionalSchedulesPage /> },
              { path: "routes", element: <RegionalRoutesPage /> },
              { path: "inventory", element: <RegionalInventoryPage /> },
              { path: "maintenance", element: <RegionalMaintenancePage /> },
              { path: "documents", element: <RegionalDocumentsPage /> },
              { path: "reports", element: <RegionalReportsPage /> }
            ]
          }
        ]
      }
    ]
  },

  // Protected Field Operations Portal (/field)
  {
    path: "/field",
    element: <AuthGuard />,
    children: [
      {
        element: <RoleGuard allowedRoles={["SCIENCE_COMMUNICATOR"]} />,
        children: [
          {
            element: <FieldLayout />,
            children: [
              { index: true, element: <Navigate to="/field/dashboard" replace /> },
              { path: "dashboard", element: <FieldDashboardPage /> },
              { path: "assignments", element: <FieldAssignmentsPage /> },
              { path: "my-assignments", element: <FieldAssignmentsPage /> },
              { path: "visits", element: <FieldVisitsPage /> },
              { path: "school-visits", element: <FieldVisitsPage /> },
              { path: "experiments", element: <FieldExperimentsPage /> },
              { path: "attendance", element: <FieldAttendancePage /> },
              { path: "equipment", element: <FieldEquipmentPage /> },
              { path: "inspections", element: <FieldInspectionsPage /> },
              { path: "vehicle-inspection", element: <FieldInspectionsPage /> },
              { path: "incidents", element: <FieldIncidentsPage /> },
              { path: "incident-reports", element: <FieldIncidentsPage /> },
              { path: "history", element: <FieldHistoryPage /> },
              { path: "visit-history", element: <FieldHistoryPage /> }
            ]
          }
        ]
      }
    ]
  },

  // Legacy route backwards-compatibility redirects
  { path: "/super-admin", element: <Navigate to="/admin/dashboard" replace /> },
  { path: "/super-admin/*", element: <Navigate to="/admin/dashboard" replace /> },
  { path: "/regional-admin", element: <Navigate to="/regional/dashboard" replace /> },
  { path: "/regional-admin/*", element: <Navigate to="/regional/dashboard" replace /> },
  { path: "/instructor", element: <Navigate to="/field/dashboard" replace /> },
  { path: "/instructor/*", element: <Navigate to="/field/dashboard" replace /> },

  // Errors & Catch-all
  { path: "/forbidden", element: <ForbiddenPage /> },
  { path: "*", element: <NotFoundPage /> }
]);
