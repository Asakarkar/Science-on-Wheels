export const resourceMap: Record<string, string> = {
  states: "state",
  regions: "region",
  districts: "district",
  blocks: "block",
  users: "user",
  roles: "role",
  permissions: "permission",
  labs: "bus",
  maintenance: "busMaintenanceRecord",
  schools: "school",
  schoolScheduleEntries: "importedSchoolSchedule",
  inventoryInvoiceLines: "importedInventoryLine",
  registrations: "schoolRegistration",
  experiments: "experiment",
  equipment: "equipment",
  consumables: "consumable",
  events: "event",
  routes: "route",
  trips: "trip",
  procurement: "procurementRequest",
  expenses: "operationalExpense",
  announcements: "announcement",
  students: "student",
  teachers: "teacher",
  gpsDevices: "gpsDevice",
  auditLogs: "auditLog",
  systemConfig: "systemConfig",
  equipmentMasters: "equipmentMaster",
  curriculumNodes: "curriculumNode",
  operationalIssues: "operationalIssue",
  inventoryTransactions: "inventoryTransaction"
};

export const idModels = new Set(Object.keys(resourceMap));

export const dateFields = new Set([
  "createdAt", "updatedAt", "lastLoginAt", "expiresAt", "lastActivityAt", "timestamp", "eventDate", "invoiceDate",
  "purchaseDate", "serviceDate", "nextDueDate", "expiryDate", "preferredDate", "alternativeDate", "publishedAt", "scheduledDate",
  "startedAt", "completedAt", "assignedAt", "installedAt", "lastSeenAt", "issueDate", "usedAt", "expenseDate", "recordedAt",
  "plannedArrival", "plannedDeparture", "actualArrival", "actualDeparture", "verifiedAt"
]);

export const searchableFields: Record<string, string[]> = {
  states: ["name", "code"],
  regions: ["name"],
  districts: ["name"],
  blocks: ["name"],
  users: ["name", "email", "status"],
  roles: ["name"],
  permissions: ["key"],
  labs: ["busCode", "registrationNumber", "status"],
  schools: ["name", "udiseCode", "principalName"],
  experiments: ["title", "subject", "difficultyLevel"],
  equipment: ["assetTag", "name", "category"],
  schoolScheduleEntries: ["schoolCollegeName", "district", "regionSection", "dateOrDateRange"],
  inventoryInvoiceLines: ["invoiceNo", "supplierName", "buyerName", "labCategory", "itemName", "hsnCode"],
  consumables: ["name", "category"],
  events: ["eventCode", "status"],
  routes: ["routeCode", "routeName", "status"],
  trips: ["tripCode", "status"],
  procurement: ["itemName", "status"],
  expenses: ["category", "description"],
  announcements: ["title"],
  students: ["name", "gradeClass"],
  teachers: ["subjectTaught"],
  gpsDevices: ["imeiNumber", "status"],
  auditLogs: ["action", "entity"],
  systemConfig: ["key", "description"]
};

