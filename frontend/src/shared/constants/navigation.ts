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
      { key: "dashboard", label: "Dashboard", icon: "LayoutDashboard", path: "/admin/dashboard", permission: "dashboard.view" }
    ]
  },
  {
    key: "organization",
    label: "Organization",
    type: "dropdown",
    icon: "Building2",
    items: [
      { key: "users", label: "User Management", icon: "Users", path: "/admin/users", permission: "people.view" },
      { key: "organization", label: "Regional Management", icon: "MapPin", path: "/admin/organization", permission: "organization.view" },
      { key: "mobile-labs", label: "Bus Management", icon: "Bus", path: "/admin/mobile-labs", permission: "labs.view" },
      { key: "schools", label: "School Management", icon: "School", path: "/admin/schools", permission: "schools.view" }
    ]
  },
  {
    key: "inventory-ops",
    label: "Inventory",
    type: "dropdown",
    icon: "Package",
    items: [
      { key: "inventory", label: "Inventory Management", icon: "Package", path: "/admin/inventory", permission: "resources.view" },
      { key: "inventory-allocation", label: "Inventory Allocation", icon: "ArrowRightLeft", path: "/admin/inventory-allocation", permission: "resources.view" }
    ]
  },
  {
    key: "monitoring",
    label: "Monitoring",
    type: "dropdown",
    icon: "BarChart3",
    items: [
      { key: "reports", label: "Reports & Analytics", icon: "BarChart3", path: "/admin/reports", permission: "analytics.view" },
      { key: "audit-logs", label: "Audit Logs", icon: "ShieldCheck", path: "/admin/audit-logs", permission: "security.view" }
    ]
  },
  {
    key: "settings-group",
    label: "System",
    type: "heading",
    items: [
      { key: "settings", label: "Settings", icon: "Settings", path: "/admin/settings", permission: "organization.view" }
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
      { key: "dashboard", label: "Dashboard", icon: "LayoutDashboard", path: "/regional/dashboard", permission: "dashboard.view" }
    ]
  },
  {
    key: "regional-management",
    label: "Regional Management",
    type: "dropdown",
    icon: "Building2",
    items: [
      { key: "schools", label: "School Management", icon: "School", path: "/regional/schools", permission: "schools.view" },
      { key: "mobile-labs", label: "Bus Management", icon: "Bus", path: "/regional/mobile-labs", permission: "labs.view" },
      { key: "staff", label: "Field Staff Management", icon: "Users", path: "/regional/staff", permission: "people.view" }
    ]
  },
  {
    key: "inventory-ops",
    label: "Inventory",
    type: "dropdown",
    icon: "Package",
    items: [
      { key: "inventory", label: "Regional Inventory", icon: "Package", path: "/regional/inventory", permission: "resources.view" },
      { key: "inventory-allocation", label: "Inventory Allocation", icon: "ArrowRightLeft", path: "/regional/inventory-allocation", permission: "resources.view" },
      { key: "inventory-transactions", label: "Inventory Transactions", icon: "Receipt", path: "/regional/inventory-transactions", permission: "resources.view" },
      { key: "equipment", label: "Equipment Management", icon: "Microscope", path: "/regional/equipment", permission: "resources.view" }
    ]
  },
  {
    key: "field-ops",
    label: "Field Operations",
    type: "dropdown",
    icon: "MapPin",
    items: [
      { key: "schedules", label: "Visit Scheduling", icon: "CalendarDays", path: "/regional/schedules", permission: "operations.view" },
      { key: "visits", label: "Visit Monitoring", icon: "ClipboardCheck", path: "/regional/visits", permission: "operations.view" },
      { key: "field-reports", label: "Field Reports", icon: "FileText", path: "/regional/field-reports", permission: "operations.view" }
    ]
  },
  {
    key: "monitoring",
    label: "Monitoring",
    type: "dropdown",
    icon: "BarChart3",
    items: [
      { key: "reports", label: "Reports & Analytics", icon: "BarChart3", path: "/regional/reports", permission: "analytics.view" },
      { key: "notifications", label: "Notifications", icon: "Bell", path: "/regional/notifications", permission: "dashboard.view" }
    ]
  },
  {
    key: "account",
    label: "Account",
    type: "heading",
    items: [
      { key: "profile", label: "My Profile", icon: "UserCircle", path: "/regional/profile", permission: "dashboard.view" },
      { key: "settings", label: "Settings", icon: "Settings", path: "/regional/settings", permission: "dashboard.view" }
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
  { key: "dashboard",    label: "Dashboard",      icon: "LayoutDashboard", path: "/field/dashboard",     permission: "dashboard.view",        children: [] },
  { key: "schedule",     label: "My Schedule",    icon: "CalendarDays",    path: "/field/schedule",      permission: "field.schedule.view",   children: [] },
  { key: "visits",       label: "School Visits",  icon: "School",          path: "/field/visits",        permission: "field.visit.view",      children: [] },
  { key: "inventory",    label: "Bus Inventory",  icon: "Package",         path: "/field/inventory",     permission: "field.inventory.view",  children: [] },
  { key: "reports",      label: "Visit Reports",  icon: "FileText",        path: "/field/reports",       permission: "field.session.view",    children: [] },
  { key: "issues",       label: "Report an Issue",icon: "AlertTriangle",   path: "/field/issues",        permission: "field.issue.report",    children: [] },
  { key: "notifications",label: "Notifications",  icon: "Bell",            path: "/field/notifications", permission: "dashboard.view",        children: [] },
  { key: "profile",      label: "My Profile",     icon: "UserCircle",      path: "/field/profile",       permission: "dashboard.view",        children: [] }
];
