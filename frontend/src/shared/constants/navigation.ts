export interface NavItem {
  key: string;
  label: string;
  icon: string;
  path: string;
  permission?: string;
  children?: string[];
}

export interface NavSubItem {
  key: string;
  label: string;
  icon: string;
  path: string;
  permission?: string;
}

export interface AdminNavSection {
  key: string;
  label: string;
  type: "heading" | "dropdown";
  icon?: string;
  items: NavSubItem[];
}

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    key: "overview",
    label: "OVERVIEW",
    type: "heading",
    items: [
      { key: "dashboard", label: "Dashboard", icon: "⌂", path: "/admin/dashboard", permission: "dashboard.view" }
    ]
  },
  {
    key: "organization",
    label: "ORGANIZATION",
    type: "dropdown",
    icon: "◎",
    items: [
      { key: "users", label: "User Management", icon: "◉", path: "/admin/users", permission: "people.view" },
      { key: "organization", label: "Regional Management", icon: "◎", path: "/admin/organization", permission: "organization.view" },
      { key: "mobile-labs", label: "Bus Management", icon: "▣", path: "/admin/mobile-labs", permission: "labs.view" },
      { key: "schools", label: "School Management", icon: "⌁", path: "/admin/schools", permission: "schools.view" }
    ]
  },
  {
    key: "inventory-ops",
    label: "INVENTORY OPERATIONS",
    type: "dropdown",
    icon: "◈",
    items: [
      { key: "inventory", label: "Inventory Management", icon: "◈", path: "/admin/inventory", permission: "resources.view" },
      { key: "inventory-allocation", label: "Inventory Allocation", icon: "⇄", path: "/admin/inventory-allocation", permission: "resources.view" }
    ]
  },
  {
    key: "monitoring",
    label: "MONITORING",
    type: "dropdown",
    icon: "▥",
    items: [
      { key: "reports", label: "Reports & Analytics", icon: "▥", path: "/admin/reports", permission: "analytics.view" },
      { key: "audit-logs", label: "Audit Logs", icon: "🛡", path: "/admin/audit-logs", permission: "security.view" }
    ]
  },
  {
    key: "settings-group",
    label: "SYSTEM",
    type: "heading",
    items: [
      { key: "settings", label: "Settings", icon: "⚙", path: "/admin/settings", permission: "organization.view" }
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
    label: "OVERVIEW",
    type: "heading",
    items: [
      { key: "dashboard", label: "Dashboard", icon: "⌂", path: "/regional/dashboard", permission: "dashboard.view" }
    ]
  },
  {
    key: "regional-management",
    label: "REGIONAL MANAGEMENT",
    type: "dropdown",
    icon: "◎",
    items: [
      { key: "schools", label: "School Management", icon: "⌁", path: "/regional/schools", permission: "schools.view" },
      { key: "mobile-labs", label: "Bus Management", icon: "▣", path: "/regional/mobile-labs", permission: "labs.view" },
      { key: "staff", label: "Field Staff Management", icon: "◉", path: "/regional/staff", permission: "people.view" }
    ]
  },
  {
    key: "inventory-ops",
    label: "INVENTORY OPERATIONS",
    type: "dropdown",
    icon: "◈",
    items: [
      { key: "inventory", label: "Regional Inventory", icon: "◈", path: "/regional/inventory", permission: "resources.view" },
      { key: "inventory-allocation", label: "Inventory Allocation", icon: "⇄", path: "/regional/inventory-allocation", permission: "resources.view" },
      { key: "inventory-transactions", label: "Inventory Transactions", icon: "📋", path: "/regional/inventory-transactions", permission: "resources.view" },
      { key: "equipment", label: "Equipment Management", icon: "🔬", path: "/regional/equipment", permission: "resources.view" }
    ]
  },
  {
    key: "field-ops",
    label: "FIELD OPERATIONS",
    type: "dropdown",
    icon: "➜",
    items: [
      { key: "schedules", label: "School Visit Scheduling", icon: "➜", path: "/regional/schedules", permission: "operations.view" },
      { key: "visits", label: "Visit Monitoring", icon: "◎", path: "/regional/visits", permission: "operations.view" },
      { key: "field-reports", label: "Field Reports", icon: "📝", path: "/regional/field-reports", permission: "operations.view" }
    ]
  },
  {
    key: "monitoring",
    label: "MONITORING",
    type: "dropdown",
    icon: "▥",
    items: [
      { key: "reports", label: "Reports & Analytics", icon: "▥", path: "/regional/reports", permission: "analytics.view" },
      { key: "notifications", label: "Notifications", icon: "🔔", path: "/regional/notifications", permission: "dashboard.view" }
    ]
  },
  {
    key: "account",
    label: "ACCOUNT",
    type: "heading",
    items: [
      { key: "profile", label: "My Profile", icon: "👤", path: "/regional/profile", permission: "dashboard.view" },
      { key: "settings", label: "Settings", icon: "⚙", path: "/regional/settings", permission: "dashboard.view" }
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
  { key: "dashboard", label: "Dashboard", icon: "⌂", path: "/field/dashboard", permission: "dashboard.view", children: [] },
  { key: "schedule", label: "My Schedule", icon: "📅", path: "/field/schedule", permission: "field.schedule.view", children: [] },
  { key: "visits", label: "School Visits", icon: "🏫", path: "/field/visits", permission: "field.visit.view", children: [] },
  { key: "inventory", label: "Bus Inventory", icon: "🚌", path: "/field/inventory", permission: "field.inventory.view", children: [] },
  { key: "reports", label: "Visit Reports", icon: "📝", path: "/field/reports", permission: "field.session.view", children: [] },
  { key: "issues", label: "Report an Issue", icon: "⚠️", path: "/field/issues", permission: "field.issue.report", children: [] },
  { key: "notifications", label: "Notifications", icon: "🔔", path: "/field/notifications", permission: "dashboard.view", children: [] },
  { key: "profile", label: "My Profile", icon: "👤", path: "/field/profile", permission: "dashboard.view", children: [] }
];
