// Navigation icon name type (maps to Lucide icon)
export type NavIconName = string;

export interface NavItem {
  key: string;
  label: string;
  icon: NavIconName;
  path: string;
  permission?: string;
  children?: string[];
}

export interface NavSubItem {
  key: string;
  label: string;
  icon: NavIconName;
  path: string;
  permission?: string;
}

export interface AdminNavSection {
  key: string;
  label: string;
  type: "heading" | "dropdown";
  icon?: NavIconName;
  items: NavSubItem[];
}

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    key: "overview",
    label: "Overview",
    type: "heading",
    items: [
      { key: "dashboard", label: "Dashboard", icon: "LayoutDashboard", path: "/admin/dashboard", permission: "dashboard.view" },
      { key: "analytics", label: "Operations Analytics", icon: "BarChart3", path: "/admin/analytics", permission: "analytics.view" },
      { key: "reports", label: "Reports", icon: "FileText", path: "/admin/reports", permission: "analytics.view" }
    ]
  },
  {
    key: "fleet",
    label: "Fleet & Assets",
    type: "dropdown",
    icon: "Bus",
    items: [
      { key: "mobile-labs", label: "Mobile Science Labs", icon: "Bus", path: "/admin/mobile-labs", permission: "labs.view" },
      { key: "equipment", label: "Lab Equipment", icon: "Microscope", path: "/admin/equipment", permission: "resources.view" },
      { key: "maintenance", label: "Fleet Maintenance Logs", icon: "Settings", path: "/admin/maintenance", permission: "labs.view" }
    ]
  },
  {
    key: "inventory-ops",
    label: "Inventory & Supplies",
    type: "dropdown",
    icon: "Package",
    items: [
      { key: "inventory", label: "Depot Inventory", icon: "Package", path: "/admin/inventory", permission: "resources.view" },
      { key: "inventory-allocation", label: "Bus Stock Allocations", icon: "ArrowRightLeft", path: "/admin/inventory-allocation", permission: "resources.view" },
      { key: "consumables", label: "Consumable Supplies", icon: "CheckCircle", path: "/admin/consumables", permission: "resources.view" },
      { key: "inventory-transactions", label: "Stock Movement Logs", icon: "Receipt", path: "/admin/inventory-transactions", permission: "resources.view" }
    ]
  },
  {
    key: "school-crm",
    label: "Schools & Geography",
    type: "dropdown",
    icon: "School",
    items: [
      { key: "schools", label: "School Directory", icon: "School", path: "/admin/schools", permission: "schools.view" },
      { key: "registrations", label: "School Registrations", icon: "ClipboardCheck", path: "/admin/registrations", permission: "schools.view" },
      { key: "organization", label: "Regional Geography", icon: "MapPin", path: "/admin/organization", permission: "organization.view" }
    ]
  },
  {
    key: "field-academic",
    label: "Field Operations",
    type: "dropdown",
    icon: "Microscope",
    items: [
      { key: "curriculum", label: "Curriculum & Experiments", icon: "Microscope", path: "/admin/curriculum", permission: "operations.view" },
      { key: "operations", label: "Visits & Routes", icon: "CalendarDays", path: "/admin/operations", permission: "operations.view" }
    ]
  },
  {
    key: "finance",
    label: "Finance & Procurement",
    type: "dropdown",
    icon: "Receipt",
    items: [
      { key: "finance-expenses", label: "Operational Expenses", icon: "Receipt", path: "/admin/finance?sub=Operational%20Expenses", permission: "organization.view" },
      { key: "finance-procurement", label: "Purchase Requisitions", icon: "Package", path: "/admin/finance?sub=Procurement%20Requisitions", permission: "organization.view" }
    ]
  },
  {
    key: "hcm",
    label: "Staff & Permissions",
    type: "dropdown",
    icon: "Users",
    items: [
      { key: "users", label: "Staff Directory", icon: "Users", path: "/admin/users", permission: "people.view" },
      { key: "roles", label: "Roles & Permissions", icon: "ShieldCheck", path: "/admin/roles-permissions", permission: "security.view" }
    ]
  },
  {
    key: "governance",
    label: "System & Settings",
    type: "heading",
    items: [
      { key: "audit-logs", label: "Audit Logs", icon: "ShieldCheck", path: "/admin/audit-logs", permission: "security.view" },
      { key: "settings", label: "System Configuration", icon: "Settings", path: "/admin/settings", permission: "organization.view" }
    ]
  }
];

export const ADMIN_NAVIGATION: NavItem[] = ADMIN_NAV_SECTIONS.flatMap((section) =>
  section.items.map((item) => ({
    key: item.key,
    label: item.label,
    icon: item.icon,
    path: item.path,
    permission: item.permission,
    children: []
  }))
);

export const REGIONAL_NAV_SECTIONS: AdminNavSection[] = [
  {
    key: "overview",
    label: "Overview",
    type: "heading",
    items: [
      { key: "dashboard", label: "Dashboard", icon: "LayoutDashboard", path: "/regional/dashboard", permission: "dashboard.view" },
      { key: "reports", label: "Operations Reports", icon: "BarChart3", path: "/regional/reports", permission: "analytics.view" },
      { key: "notifications", label: "Alerts", icon: "Bell", path: "/regional/notifications", permission: "dashboard.view" }
    ]
  },
  {
    key: "fleet-regional",
    label: "Fleet & Assets",
    type: "dropdown",
    icon: "Bus",
    items: [
      { key: "mobile-labs", label: "Assigned Mobile Labs", icon: "Bus", path: "/regional/mobile-labs", permission: "labs.view" },
      { key: "maintenance", label: "Fleet Maintenance Logs", icon: "Settings", path: "/regional/maintenance", permission: "labs.view" },
      { key: "equipment", label: "Regional Equipment", icon: "Microscope", path: "/regional/equipment", permission: "resources.view" }
    ]
  },
  {
    key: "inventory-ops",
    label: "Inventory & Depot",
    type: "dropdown",
    icon: "Package",
    items: [
      { key: "inventory", label: "Regional Depot Inventory", icon: "Package", path: "/regional/inventory", permission: "resources.view" },
      { key: "inventory-allocation", label: "Bus Stock Allocation", icon: "ArrowRightLeft", path: "/regional/inventory-allocation", permission: "resources.view" },
      { key: "inventory-transactions", label: "Stock Movement Logs", icon: "Receipt", path: "/regional/inventory-transactions", permission: "resources.view" }
    ]
  },
  {
    key: "school-logistics",
    label: "Schools & Routes",
    type: "dropdown",
    icon: "School",
    items: [
      { key: "schools", label: "Connected Schools", icon: "School", path: "/regional/schools", permission: "schools.view" },
      { key: "routes", label: "Route Itineraries", icon: "MapPin", path: "/regional/routes", permission: "operations.view" },
      { key: "schedules", label: "Visit Schedules", icon: "CalendarDays", path: "/regional/schedules", permission: "operations.view" }
    ]
  },
  {
    key: "field-ops",
    label: "Field Visits",
    type: "dropdown",
    icon: "ClipboardCheck",
    items: [
      { key: "visits", label: "Visit Tracking", icon: "ClipboardCheck", path: "/regional/visits", permission: "operations.view" },
      { key: "field-reports", label: "Field Reports", icon: "FileText", path: "/regional/field-reports", permission: "operations.view" },
      { key: "documents", label: "Documents", icon: "Receipt", path: "/regional/documents", permission: "dashboard.view" }
    ]
  },
  {
    key: "personnel",
    label: "Staff",
    type: "dropdown",
    icon: "Users",
    items: [
      { key: "staff", label: "Field Communicators", icon: "Users", path: "/regional/staff", permission: "people.view" }
    ]
  },
  {
    key: "account",
    label: "Account & Settings",
    type: "heading",
    items: [
      { key: "profile", label: "Profile", icon: "UserCircle", path: "/regional/profile", permission: "dashboard.view" },
      { key: "settings", label: "Regional Settings", icon: "Settings", path: "/regional/settings", permission: "dashboard.view" }
    ]
  }
];

export const REGIONAL_NAVIGATION: NavItem[] = REGIONAL_NAV_SECTIONS.flatMap((section) =>
  section.items.map((item) => ({
    key: item.key,
    label: item.label,
    icon: item.icon,
    path: item.path,
    permission: item.permission,
    children: []
  }))
);

export const FIELD_NAVIGATION: NavItem[] = [
  { key: "dashboard",    label: "Operations Dashboard",  icon: "LayoutDashboard", path: "/field/dashboard",     permission: "dashboard.view",        children: [] },
  { key: "schedule",     label: "Assigned Schedule",     icon: "CalendarDays",    path: "/field/schedule",      permission: "field.schedule.view",   children: [] },
  { key: "visits",       label: "School Visits & Labs",  icon: "School",          path: "/field/visits",        permission: "field.visit.view",      children: [] },
  { key: "inventory",    label: "Bus Mobile Inventory",  icon: "Package",         path: "/field/inventory",     permission: "field.inventory.view",  children: [] },
  { key: "reports",      label: "Session Visit Reports", icon: "FileText",        path: "/field/reports",       permission: "field.session.view",    children: [] },
  { key: "issues",       label: "Escalate Field Issue",  icon: "AlertTriangle",   path: "/field/issues",        permission: "field.issue.report",    children: [] },
  { key: "notifications",label: "Mission Alerts",        icon: "Bell",            path: "/field/notifications", permission: "dashboard.view",        children: [] },
  { key: "profile",      label: "My Profile",            icon: "UserCircle",      path: "/field/profile",       permission: "dashboard.view",        children: [] }
];
