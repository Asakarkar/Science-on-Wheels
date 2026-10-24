export interface NavItem {
  key: string;
  label: string;
  icon: string;
  path: string;
  permission?: string;
  children?: string[];
}

export const ADMIN_NAVIGATION: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "⌂", path: "/admin/dashboard", permission: "dashboard.view", children: [] },
  { key: "organization", label: "Organization", icon: "◎", path: "/admin/organization", permission: "organization.view", children: ["Regions", "Geography", "Organization Settings"] },
  { key: "users", label: "Users & Access", icon: "◉", path: "/admin/users", permission: "people.view", children: ["All Users", "Regional Administrators", "Field Staff"] },
  { key: "roles", label: "Roles & Permissions", icon: "◈", path: "/admin/roles", permission: "security.view", children: ["Roles", "Permissions"] },
  { key: "mobile-labs", label: "Mobile Laboratories", icon: "▣", path: "/admin/mobile-labs", permission: "labs.view", children: ["All Labs", "Lab Details", "Maintenance", "GPS / Telemetry"] },
  { key: "schools", label: "Schools", icon: "⌁", path: "/admin/schools", permission: "schools.view", children: ["School Directory", "Registration", "Verification", "Priority"] },
  { key: "curriculum", label: "Curriculum & Experiments", icon: "◇", path: "/admin/curriculum", permission: "curriculum.view", children: ["Curriculum Master", "Experiments"] },
  { key: "inventory", label: "Inventory & Assets", icon: "◈", path: "/admin/inventory", permission: "resources.view", children: ["Equipment Master", "Consumables", "Transactions"] },
  { key: "operations", label: "Operations", icon: "➜", path: "/admin/operations", permission: "operations.view", children: ["Visits", "Schedules", "Routes", "Operational Issues"] },
  { key: "analytics", label: "Analytics & Reports", icon: "▥", path: "/admin/analytics", permission: "analytics.view", children: ["Overview", "Schools", "Labs", "Students", "Inventory"] },
  { key: "audit-logs", label: "Security & Audit", icon: "◇", path: "/admin/audit-logs", permission: "security.view", children: ["Audit Logs", "Login Activity", "Security Events"] }
];

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
