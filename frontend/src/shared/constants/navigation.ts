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
      { key: "schools", label: "School Management", icon: "⌁", path: "/admin/schools", permission: "schools.view" },
      { key: "curriculum", label: "Experiment Management", icon: "◇", path: "/admin/curriculum", permission: "curriculum.view" }
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
      { key: "audit-logs", label: "Audit Logs", icon: "🛡", path: "/admin/audit-logs", permission: "security.view" },
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

export const REGIONAL_NAVIGATION: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "⌂", path: "/regional/dashboard", permission: "dashboard.view", children: [] },
  { key: "schools", label: "Schools", icon: "⌁", path: "/regional/schools", permission: "schools.view", children: ["School Directory", "Registrations", "Priority"] },
  { key: "staff", label: "Field Staff", icon: "◉", path: "/regional/staff", permission: "people.view", children: ["Staff Directory", "Session Assignments"] },
  { key: "mobile-labs", label: "Mobile Labs", icon: "▣", path: "/regional/mobile-labs", permission: "labs.view", children: ["Assigned Labs", "Live Status", "Telemetry"] },
  { key: "schedules", label: "Schedules & Visits", icon: "➜", path: "/regional/schedules", permission: "operations.view", children: ["Today's Visits", "Upcoming Visits", "New Visit"] },
  { key: "routes", label: "Routes & Travel", icon: "◎", path: "/regional/routes", permission: "operations.view", children: ["Regional Routes", "Stops"] },
  { key: "inventory", label: "Inventory", icon: "◈", path: "/regional/inventory", permission: "resources.view", children: ["Consumables Stock", "Equipment Assets", "Transactions"] },
  { key: "maintenance", label: "Maintenance", icon: "▣", path: "/regional/maintenance", permission: "labs.view", children: ["Service Records", "Schedule Maintenance"] },
  { key: "reports", label: "Reports & Analytics", icon: "▥", path: "/regional/reports", permission: "analytics.view", children: ["Regional Summary", "CSV Exports"] }
];

export const FIELD_NAVIGATION: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "⌂", path: "/field/dashboard", permission: "dashboard.view", children: [] },
  { key: "assignments", label: "My Schedule", icon: "◎", path: "/field/assignments", permission: "field.schedule.view", children: ["Today's Visits", "Upcoming Visits"] },
  { key: "visits", label: "School Visits", icon: "⌁", path: "/field/visits", permission: "field.visit.view", children: ["Assigned Schools", "Arrival / Departure", "History"] },
  { key: "experiments", label: "Science Sessions", icon: "◇", path: "/field/experiments", permission: "field.session.view", children: ["Assigned Sessions", "Experiment Details"] },
  { key: "attendance", label: "Student Attendance", icon: "◉", path: "/field/attendance", permission: "field.session.view", children: ["Mark Attendance", "Records"] },
  { key: "equipment", label: "Lab & Equipment", icon: "▣", path: "/field/equipment", permission: "field.inventory.view", children: ["Lab Details", "Equipment Checklist", "Consumables Used"] },
  { key: "inspections", label: "Vehicle & Readiness", icon: "➜", path: "/field/inspections", permission: "field.safety.record", children: ["Readiness Checklist", "GPS Telemetry"] },
  { key: "incidents", label: "Issues & Support", icon: "!", path: "/field/incidents", permission: "field.issue.report", children: ["Report Issue", "Support Requests"] },
  { key: "history", label: "Records & History", icon: "▥", path: "/field/history", permission: "field.records.view", children: ["Completed Sessions", "Submitted Reports"] }
];
