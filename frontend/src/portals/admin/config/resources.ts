import type { ResourceConfig } from "../../../shared/types/admin";

export const configs: Record<string, ResourceConfig> = {
  regions: {
    key: "regions",
    title: "Regions",
    description: "Organization-wide operating regions and regional ownership.",
    fields: [
      { key: "name", label: "Region name", required: true },
      { key: "stateId", label: "State ID", required: true }
    ],
    columns: ["name", "stateId", "createdAt"]
  },
  states: {
    key: "states",
    title: "States",
    description: "Geographic master data used by the operating hierarchy.",
    fields: [
      { key: "name", label: "State name", required: true },
      { key: "code", label: "Code", required: true }
    ],
    columns: ["name", "code"]
  },
  districts: {
    key: "districts",
    title: "Districts",
    description: "Districts belonging to a region.",
    fields: [
      { key: "name", label: "District name", required: true },
      { key: "regionId", label: "Region ID", required: true }
    ],
    columns: ["name", "regionId"]
  },
  blocks: {
    key: "blocks",
    title: "Blocks",
    description: "Blocks belonging to districts.",
    fields: [
      { key: "name", label: "Block name", required: true },
      { key: "districtId", label: "District ID", required: true }
    ],
    columns: ["name", "districtId"]
  },
  users: {
    key: "users",
    title: "Users",
    description: "Identity, role, region scope and account lifecycle.",
    fields: [
      { key: "name", label: "Name", required: true },
      { key: "email", label: "Email", required: true },
      { key: "password", label: "Temporary password", type: "text", required: true },
      { key: "roleEnum", label: "Role", type: "select", options: ["SUPER_ADMIN", "REGIONAL_ADMIN", "SCIENCE_COMMUNICATOR", "TEACHER", "STUDENT"], required: true },
      { key: "regionId", label: "Region ID" },
      { key: "status", label: "Status", type: "select", options: ["ACTIVE", "LOCKED", "SUSPENDED", "DEACTIVATED"], required: true },
      { key: "isActive", label: "Active", type: "boolean" }
    ],
    columns: ["name", "email", "roleEnum", "status", "regionId", "lastLoginAt"]
  },
  roles: {
    key: "roles",
    title: "Roles",
    description: "Defined responsibility profiles for the platform.",
    fields: [
      { key: "name", label: "Role name", required: true },
      { key: "description", label: "Description", type: "textarea" }
    ],
    columns: ["name", "description"]
  },
  permissions: {
    key: "permissions",
    title: "Permissions",
    description: "Fine-grained API permissions enforced server-side.",
    fields: [
      { key: "key", label: "Permission key", required: true },
      { key: "description", label: "Description", type: "textarea" }
    ],
    columns: ["key", "description"]
  },
  labs: {
    key: "labs",
    title: "Mobile Laboratories",
    description: "Fleet directory, status, region, location and operational state.",
    fields: [
      { key: "registrationNumber", label: "Registration number", required: true },
      { key: "busCode", label: "Lab code" },
      { key: "regionId", label: "Region ID", required: true },
      { key: "driverId", label: "Driver ID" },
      { key: "status", label: "Status", type: "select", options: ["AVAILABLE", "ON_ROUTE", "AT_SCHOOL", "UNDER_MAINTENANCE", "EMERGENCY"] },
      { key: "insuranceExpiry", label: "Insurance expiry", type: "date", required: true },
      { key: "fitnessExpiry", label: "Fitness expiry", type: "date", required: true },
      { key: "currentLat", label: "Latitude", type: "number" },
      { key: "currentLng", label: "Longitude", type: "number" }
    ],
    columns: ["busCode", "registrationNumber", "status", "regionId", "currentLat", "currentLng"]
  },
  maintenance: {
    key: "maintenance",
    title: "Laboratory Maintenance",
    description: "Service history and next due dates.",
    fields: [
      { key: "busId", label: "Lab ID", required: true },
      { key: "serviceType", label: "Service type", type: "select", options: ["TYRE", "BATTERY", "ENGINE", "GPS", "GENERAL_SERVICING"] },
      { key: "costAmount", label: "Cost", type: "number", required: true },
      { key: "serviceDate", label: "Service date", type: "date", required: true },
      { key: "nextDueDate", label: "Next due date", type: "date", required: true },
      { key: "remarks", label: "Remarks", type: "textarea" }
    ],
    columns: ["busId", "serviceType", "costAmount", "serviceDate", "nextDueDate"]
  },
  schools: {
    key: "schools",
    title: "School Directory",
    description: "Central school records connecting geography, visits, sessions, students and feedback.",
    fields: [
      { key: "name", label: "School name", required: true },
      { key: "udiseCode", label: "UDISE code", required: true },
      { key: "regionId", label: "Region ID", required: true },
      { key: "districtId", label: "District ID", required: true },
      { key: "blockId", label: "Block ID", required: true },
      { key: "address", label: "Address", type: "textarea", required: true },
      { key: "latitude", label: "Latitude", type: "number", required: true },
      { key: "longitude", label: "Longitude", type: "number", required: true },
      { key: "contactPhone", label: "Contact phone", required: true },
      { key: "totalStudents", label: "Total students", type: "number", required: true },
      { key: "hasScienceLab", label: "Has science lab", type: "boolean" },
      { key: "hasElectricity", label: "Has electricity", type: "boolean" },
      { key: "hasInternet", label: "Has internet", type: "boolean" }
    ],
    columns: ["name", "udiseCode", "regionId", "districtId", "totalStudents", "priorityCategory"]
  },
  registrations: {
    key: "registrations",
    title: "School Registration",
    description: "School onboarding requests and preferred visit information.",
    fields: [
      { key: "schoolId", label: "School ID", required: true },
      { key: "preferredDate", label: "Preferred date", type: "date", required: true },
      { key: "expectedStudentCount", label: "Expected students", type: "number", required: true },
      { key: "topicsRequested", label: "Topics (comma separated)", type: "text" },
      { key: "status", label: "Status", type: "select", options: ["PENDING", "APPROVED", "REJECTED", "ON_HOLD"] },
      { key: "remarks", label: "Remarks", type: "textarea" }
    ],
    columns: ["schoolId", "preferredDate", "expectedStudentCount", "status"]
  },
  experiments: {
    key: "experiments",
    title: "Experiments",
    description: "Approved experiment master content used by regional planners and field staff.",
    fields: [
      { key: "title", label: "Experiment title", required: true },
      { key: "subject", label: "Subject", required: true },
      { key: "targetGradeRange", label: "Applicable class / grade", required: true },
      { key: "durationMinutes", label: "Duration (minutes)", type: "number", required: true },
      { key: "difficultyLevel", label: "Difficulty", required: true },
      { key: "description", label: "Description", type: "textarea", required: true },
      { key: "safetyInstructions", label: "Safety instructions", type: "textarea", required: true },
      { key: "riskLevel", label: "Risk level", type: "select", options: ["LOW", "MEDIUM", "HIGH"] }
    ],
    columns: ["title", "subject", "targetGradeRange", "durationMinutes", "riskLevel"]
  },
  equipment: {
    key: "equipment",
    title: "Equipment Master / Assets",
    description: "Physical equipment, asset tags, assignment and condition.",
    fields: [
      { key: "assetTag", label: "Asset tag", required: true },
      { key: "name", label: "Equipment name", required: true },
      { key: "category", label: "Category", required: true },
      { key: "status", label: "Status", type: "select", options: ["AVAILABLE", "ASSIGNED_TO_BUS", "IN_MAINTENANCE", "DAMAGED", "MISSING"] },
      { key: "busId", label: "Lab ID" },
      { key: "storageUnit", label: "Storage unit" },
      { key: "purchaseDate", label: "Purchase date", type: "date", required: true },
      { key: "cost", label: "Cost", type: "number", required: true }
    ],
    columns: ["assetTag", "name", "category", "status", "busId", "cost"]
  },
  consumables: {
    key: "consumables",
    title: "Consumables",
    description: "Stock levels, units, expiry and low-stock controls.",
    fields: [
      { key: "name", label: "Item", required: true },
      { key: "category", label: "Category", required: true },
      { key: "currentStock", label: "Current stock", type: "number", required: true },
      { key: "minimumStock", label: "Minimum stock", type: "number", required: true },
      { key: "unitMetric", label: "Unit", required: true },
      { key: "expiryDate", label: "Expiry date", type: "date" }
    ],
    columns: ["name", "category", "currentStock", "minimumStock", "unitMetric", "expiryDate"]
  },
  events: {
    key: "events",
    title: "Visits & Sessions",
    description: "Planned school visits and their operational lifecycle.",
    fields: [
      { key: "eventCode", label: "Event code", required: true },
      { key: "schoolId", label: "School ID", required: true },
      { key: "busId", label: "Lab ID", required: true },
      { key: "eventDate", label: "Event date", type: "date", required: true },
      { key: "startTime", label: "Start time", type: "datetime-local", required: true },
      { key: "endTime", label: "End time", type: "datetime-local", required: true },
      { key: "expectedStudentCount", label: "Expected students", type: "number", required: true },
      { key: "status", label: "Status", type: "select", options: ["SCHEDULED", "READINESS_VERIFIED", "IN_TRANSIT", "ON_SITE", "COMPLETED", "CANCELLED"] }
    ],
    columns: ["eventCode", "schoolId", "busId", "eventDate", "status", "readinessPercentage"]
  },
  routes: {
    key: "routes",
    title: "Routes",
    description: "Planned lab routes and ordered school stops.",
    fields: [
      { key: "routeCode", label: "Route code", required: true },
      { key: "routeName", label: "Route name", required: true },
      { key: "regionId", label: "Region ID" },
      { key: "status", label: "Status", type: "select", options: ["DRAFT", "PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"] },
      { key: "startLocation", label: "Start location", required: true },
      { key: "endLocation", label: "End location", required: true },
      { key: "totalDistanceKm", label: "Distance km", type: "number" },
      { key: "estimatedDurationMinutes", label: "Duration minutes", type: "number" }
    ],
    columns: ["routeCode", "routeName", "regionId", "status", "totalDistanceKm", "estimatedDurationMinutes"]
  },
  trips: {
    key: "trips",
    title: "Trips",
    description: "Execution of planned routes by laboratories.",
    fields: [
      { key: "tripCode", label: "Trip code", required: true },
      { key: "routeId", label: "Route ID", required: true },
      { key: "busId", label: "Lab ID", required: true },
      { key: "driverId", label: "Driver ID" },
      { key: "scheduledDate", label: "Scheduled date", type: "date", required: true },
      { key: "status", label: "Status", type: "select", options: ["PLANNED", "STARTED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "EMERGENCY"] }
    ],
    columns: ["tripCode", "routeId", "busId", "driverId", "scheduledDate", "status"]
  },
  procurement: {
    key: "procurement",
    title: "Procurement Requests",
    description: "Organization resource requests and approval status.",
    fields: [
      { key: "itemName", label: "Item", required: true },
      { key: "quantity", label: "Quantity", type: "number", required: true },
      { key: "estimatedCost", label: "Estimated cost", type: "number", required: true },
      { key: "requestedById", label: "Requested by user ID", required: true },
      { key: "status", label: "Status", type: "select", options: ["PENDING", "APPROVED", "REJECTED", "PURCHASED", "DELIVERED"] }
    ],
    columns: ["itemName", "quantity", "estimatedCost", "status", "createdAt"]
  },
  expenses: {
    key: "expenses",
    title: "Operational Expenses",
    description: "Organization expense records for operations, fuel, maintenance and travel.",
    fields: [
      { key: "category", label: "Category", type: "select", options: ["FUEL", "MAINTENANCE", "FOOD", "ACCOMMODATION", "TOLL_PERMIT", "MISC"] },
      { key: "amount", label: "Amount", type: "number", required: true },
      { key: "expenseDate", label: "Expense date", type: "date", required: true },
      { key: "submittedById", label: "Submitted by", required: true },
      { key: "description", label: "Description", type: "textarea", required: true }
    ],
    columns: ["category", "amount", "expenseDate", "submittedById", "description"]
  },
  announcements: {
    key: "announcements",
    title: "Announcements",
    description: "Organization-wide communications targeted by role.",
    fields: [
      { key: "title", label: "Title", required: true },
      { key: "content", label: "Content", type: "textarea", required: true }
    ],
    columns: ["title", "content", "publishedAt"]
  },
  students: {
    key: "students",
    title: "Students",
    description: "Organization-wide student reach and attendance records.",
    fields: [
      { key: "name", label: "Name", required: true },
      { key: "schoolId", label: "School ID", required: true },
      { key: "gradeClass", label: "Class", required: true },
      { key: "section", label: "Section" },
      { key: "rollNumber", label: "Roll number" }
    ],
    columns: ["name", "schoolId", "gradeClass", "section", "rollNumber", "totalPoints"]
  },
  teachers: {
    key: "teachers",
    title: "Teachers",
    description: "School-linked teacher records.",
    fields: [
      { key: "userId", label: "User ID", required: true },
      { key: "schoolId", label: "School ID", required: true },
      { key: "subjectTaught", label: "Subject", required: true },
      { key: "phone", label: "Phone", required: true }
    ],
    columns: ["userId", "schoolId", "subjectTaught", "phone"]
  },
  gpsDevices: {
    key: "gpsDevices",
    title: "GPS Devices",
    description: "Device association and telemetry health.",
    fields: [
      { key: "imeiNumber", label: "IMEI", required: true },
      { key: "busId", label: "Lab ID" },
      { key: "providerName", label: "Provider" },
      { key: "status", label: "Status", type: "select", options: ["ACTIVE", "OFFLINE", "FAULTY", "UNASSOCIATED"] }
    ],
    columns: ["imeiNumber", "busId", "providerName", "status", "lastSeenAt"]
  },
  systemConfig: {
    key: "systemConfig",
    title: "Organization Settings",
    description: "Central system configuration values.",
    fields: [
      { key: "key", label: "Setting key", required: true },
      { key: "value", label: "Value", type: "textarea", required: true },
      { key: "description", label: "Description", type: "textarea" }
    ],
    columns: ["key", "value", "description", "updatedAt"]
  },
  equipmentMasters: {
    key: "equipmentMasters",
    title: "Equipment Master",
    description: "Defines reusable equipment types, units, tracking and QR requirements.",
    fields: [
      { key: "name", label: "Equipment name", required: true },
      { key: "category", label: "Category", required: true },
      { key: "unit", label: "Unit" },
      { key: "trackable", label: "Trackable", type: "boolean" },
      { key: "qrRequired", label: "QR / barcode required", type: "boolean" },
      { key: "minimumStock", label: "Minimum stock", type: "number" },
      { key: "description", label: "Description", type: "textarea" }
    ],
    columns: ["name", "category", "unit", "trackable", "qrRequired", "minimumStock"]
  },
  curriculumNodes: {
    key: "curriculumNodes",
    title: "Curriculum Master",
    description: "Class → Subject → Chapter → Topic → Learning Objective hierarchy.",
    fields: [
      { key: "name", label: "Name", required: true },
      { key: "type", label: "Node type", type: "select", options: ["CLASS", "SUBJECT", "CHAPTER", "TOPIC", "LEARNING_OBJECTIVE"], required: true },
      { key: "parentId", label: "Parent node ID" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "orderIndex", label: "Order", type: "number" },
      { key: "isActive", label: "Active", type: "boolean" }
    ],
    columns: ["name", "type", "parentId", "orderIndex", "isActive"]
  },
  operationalIssues: {
    key: "operationalIssues",
    title: "Operational Issues",
    description: "Central workflow for equipment, inventory, vehicle, safety, technical and school-visit issues.",
    fields: [
      { key: "category", label: "Category", type: "select", options: ["EQUIPMENT", "INVENTORY", "VEHICLE", "SAFETY", "TECHNICAL", "SCHOOL_VISIT", "OTHER"], required: true },
      { key: "description", label: "Description", type: "textarea", required: true },
      { key: "location", label: "Location" },
      { key: "reportedById", label: "Reported by user ID", required: true },
      { key: "assignedResolverId", label: "Assigned resolver ID" },
      { key: "status", label: "Status", type: "select", options: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "CLOSED"] },
      { key: "resolution", label: "Resolution", type: "textarea" }
    ],
    columns: ["category", "description", "status", "reportedById", "assignedResolverId", "timestamp"]
  },
  inventoryTransactions: {
    key: "inventoryTransactions",
    title: "Inventory Transactions",
    description: "Receipt, issue, return, transfer, adjustment, damage, loss and consumption history.",
    fields: [
      { key: "consumableId", label: "Consumable ID", required: true },
      { key: "busId", label: "Lab ID" },
      { key: "quantity", label: "Quantity", type: "number", required: true },
      { key: "type", label: "Transaction type", type: "select", options: ["RECEIPT", "ISSUE", "RETURN", "TRANSFER", "ADJUSTMENT", "DAMAGE", "LOSS", "CONSUMPTION"], required: true },
      { key: "referenceType", label: "Reference type" },
      { key: "referenceId", label: "Reference ID" },
      { key: "performedById", label: "Performed by" },
      { key: "notes", label: "Notes", type: "textarea" }
    ],
    columns: ["consumableId", "busId", "quantity", "type", "performedById", "timestamp"]
  },
  auditLogs: {
    key: "auditLogs",
    title: "Audit Logs",
    description: "Immutable administrative trace of important changes.",
    fields: [],
    columns: ["timestamp", "action", "entity", "entityId", "actorUserId", "ipAddress"]
  }
};

export const sectionResource: Record<string, string> = {
  Regions: "regions",
  Geography: "states",
  "Organization Settings": "systemConfig",
  "All Users": "users",
  "Regional Administrators": "users",
  "Field Staff": "users",
  Roles: "roles",
  Permissions: "permissions",
  "Account / Security": "users",
  "All Labs": "labs",
  "Lab Details": "labs",
  Assignments: "labs",
  Maintenance: "maintenance",
  "GPS / Telemetry": "gpsDevices",
  "GPS / Location": "gpsDevices",
  Utilization: "labs",
  "School Directory": "schools",
  Registration: "registrations",
  Verification: "registrations",
  Priority: "schools",
  "School History": "schools",
  Experiments: "experiments",
  "Curriculum Master": "curriculumNodes",
  Classes: "experiments",
  Subjects: "experiments",
  Chapters: "experiments",
  Topics: "experiments",
  "Learning Objectives": "experiments",
  "Equipment Master": "equipmentMasters",
  Consumables: "consumables",
  Inventory: "consumables",
  Transactions: "inventoryTransactions",
  "Resource History": "equipment",
  Visits: "events",
  Schedules: "events",
  Routes: "routes",
  Sessions: "events",
  "Operational Issues": "operationalIssues",
  "Live Labs": "labs",
  Alerts: "consumables",
  Activity: "auditLogs",
  "System Health": "auditLogs",
  "Audit Logs": "auditLogs",
  "Login Activity": "auditLogs",
  "Permission Changes": "auditLogs",
  "Security Events": "auditLogs"
};

export const analyticsResource: Record<string, string> = {
  Overview: "regions",
  Organization: "regions",
  Regions: "regions",
  Schools: "schools",
  Labs: "labs",
  Students: "students",
  Sessions: "events",
  Inventory: "consumables",
  Staff: "users"
};

export function csvDownload(resource: string) {
  const url = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/super-admin/reports/${resource}.csv`;
  window.open(url, "_blank");
}
