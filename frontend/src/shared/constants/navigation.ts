export interface NavItem {
  key: string;
  label: string;
  icon: string;
  path: string;
  permission?: string;
  children?: string[];
}

export const ADMIN_NAVIGATION: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "⌂", path: "/admin/dashboard", children: [] },
  { key: "organization", label: "Organization", icon: "◎", path: "/admin/organization", children: ["Regions", "Geography", "Organization Settings"] },
  { key: "users", label: "Users & Access", icon: "◉", path: "/admin/users", children: ["All Users", "Regional Administrators", "Field Staff"] },
  { key: "roles", label: "Roles & Permissions", icon: "◈", path: "/admin/roles", children: ["Roles", "Permissions"] },
  { key: "mobile-labs", label: "Mobile Laboratories", icon: "▣", path: "/admin/mobile-labs", children: ["All Labs", "Lab Details", "Maintenance", "GPS / Telemetry"] },
  { key: "schools", label: "Schools", icon: "⌁", path: "/admin/schools", children: ["School Directory", "Registration", "Verification", "Priority"] },
  { key: "curriculum", label: "Curriculum & Experiments", icon: "◇", path: "/admin/curriculum", children: ["Curriculum Master", "Experiments"] },
  { key: "inventory", label: "Inventory & Assets", icon: "◈", path: "/admin/inventory", children: ["Equipment Master", "Consumables", "Transactions"] },
  { key: "operations", label: "Operations", icon: "➜", path: "/admin/operations", children: ["Visits", "Schedules", "Routes", "Operational Issues"] },
  { key: "analytics", label: "Analytics & Reports", icon: "▥", path: "/admin/analytics", children: ["Overview", "Schools", "Labs", "Students", "Inventory"] },
  { key: "audit-logs", label: "Security & Audit", icon: "◇", path: "/admin/audit-logs", children: ["Audit Logs", "Login Activity", "Security Events"] }
];

export const REGIONAL_NAVIGATION: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "⌂", path: "/regional/dashboard", children: [] },
  { key: "schools", label: "Schools", icon: "⌁", path: "/regional/schools", children: ["School Directory", "Registrations", "Priority"] },
  { key: "staff", label: "Field Staff", icon: "◉", path: "/regional/staff", children: ["Staff Directory", "Session Assignments"] },
  { key: "mobile-labs", label: "Mobile Labs", icon: "▣", path: "/regional/mobile-labs", children: ["Assigned Labs", "Live Status", "Telemetry"] },
  { key: "schedules", label: "Schedules & Visits", icon: "➜", path: "/regional/schedules", children: ["Today's Visits", "Upcoming Visits", "New Visit"] },
  { key: "routes", label: "Routes & Travel", icon: "◎", path: "/regional/routes", children: ["Regional Routes", "Stops"] },
  { key: "inventory", label: "Inventory", icon: "◈", path: "/regional/inventory", children: ["Consumables Stock", "Equipment Assets", "Transactions"] },
  { key: "maintenance", label: "Maintenance", icon: "▣", path: "/regional/maintenance", children: ["Service Records", "Schedule Maintenance"] },
  { key: "reports", label: "Reports & Analytics", icon: "▥", path: "/regional/reports", children: ["Regional Summary", "CSV Exports"] }
];

export const FIELD_NAVIGATION: NavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: "⌂", path: "/field/dashboard", children: [] },
  { key: "assignments", label: "My Schedule", icon: "◎", path: "/field/assignments", children: ["Today's Visits", "Upcoming Visits"] },
  { key: "visits", label: "School Visits", icon: "⌁", path: "/field/visits", children: ["Assigned Schools", "Arrival / Departure", "History"] },
  { key: "experiments", label: "Science Sessions", icon: "◇", path: "/field/experiments", children: ["Assigned Sessions", "Experiment Details"] },
  { key: "attendance", label: "Student Attendance", icon: "◉", path: "/field/attendance", children: ["Mark Attendance", "Records"] },
  { key: "equipment", label: "Lab & Equipment", icon: "▣", path: "/field/equipment", children: ["Lab Details", "Equipment Checklist", "Consumables Used"] },
  { key: "inspections", label: "Vehicle & Readiness", icon: "➜", path: "/field/inspections", children: ["Readiness Checklist", "GPS Telemetry"] },
  { key: "incidents", label: "Issues & Support", icon: "!", path: "/field/incidents", children: ["Report Issue", "Support Requests"] },
  { key: "history", label: "Records & History", icon: "▥", path: "/field/history", children: ["Completed Sessions", "Submitted Reports"] }
];
