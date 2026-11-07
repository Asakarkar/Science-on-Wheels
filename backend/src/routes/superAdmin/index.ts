import { Router } from "express";
import { requireAuth, requirePermission, requireSuperAdmin } from "../../middleware/auth";
import { getOverview, getHealth } from "./controllers/overviewController";
import {
  listResources,
  getRolePermissions,
  updateRolePermissions,
  createResource,
  updateResource,
  deleteResource,
  getUserHistory,
  getRegionProfile,
  assignRegionalAdmin,
  getBusProfile,
  assignBusStaff,
  assignBusRegion,
  addBusMaintenance,
  getSchoolProfile,
  assignSchoolRegion
} from "./controllers/crudController";
import { getReportsSummary, getAdvancedReports, exportResourceCsv } from "./controllers/reportController";
import { seedInventory, seedSchools } from "./controllers/seedController";
import {
  getInventoryOverview,
  adjustStock,
  listAllocations,
  createAllocation,
  dispatchAllocation,
  receiveAllocation,
  cancelAllocation
} from "./controllers/inventoryController";
import {
  getSettings,
  updateSettings,
  triggerBackup
} from "./controllers/settingsController";

export const superAdminRouter = Router();

// Enforce authentication & Super Admin role
superAdminRouter.use(requireAuth, requireSuperAdmin);

// Populate req.userId for audit convenience
superAdminRouter.use((req, res, next) => {
  (req as any).userId = res.locals.user?.id;
  next();
});

// Overview & Health
superAdminRouter.get("/overview", requirePermission("dashboard.view"), getOverview);
superAdminRouter.get("/health", requirePermission("security.view"), getHealth);

// Universal Resource CRUD
superAdminRouter.get(["/users/:id/history", "/resource/users/:id/history"], getUserHistory);
superAdminRouter.get(["/regions/:id/profile", "/resource/regions/:id/profile"], getRegionProfile);
superAdminRouter.post(["/regions/:id/assign-admin", "/resource/regions/:id/assign-admin"], assignRegionalAdmin);
superAdminRouter.get(["/buses/:id/profile", "/resource/labs/:id/profile"], getBusProfile);
superAdminRouter.post(["/buses/:id/assign-staff", "/resource/labs/:id/assign-staff"], assignBusStaff);
superAdminRouter.post(["/buses/:id/assign-region", "/resource/labs/:id/assign-region"], assignBusRegion);
superAdminRouter.post(["/buses/:id/maintenance", "/resource/labs/:id/maintenance"], addBusMaintenance);
superAdminRouter.get(["/schools/:id/profile", "/resource/schools/:id/profile"], getSchoolProfile);
superAdminRouter.post(["/schools/:id/assign-region", "/resource/schools/:id/assign-region"], assignSchoolRegion);

// Inventory Operations & Allocation Engine
superAdminRouter.get(["/inventory/overview", "/resource/inventory/overview"], requirePermission("resources.view"), getInventoryOverview);
superAdminRouter.post(["/inventory/adjust", "/resource/inventory/adjust"], requirePermission("resources.view"), adjustStock);
superAdminRouter.get(["/inventory/allocations", "/resource/inventory/allocations"], requirePermission("resources.view"), listAllocations);
superAdminRouter.post(["/inventory/allocations", "/resource/inventory/allocations"], requirePermission("resources.view"), createAllocation);
superAdminRouter.post(["/inventory/allocations/:id/dispatch", "/resource/inventory/allocations/:id/dispatch"], requirePermission("resources.view"), dispatchAllocation);
superAdminRouter.post(["/inventory/allocations/:id/receive", "/resource/inventory/allocations/:id/receive"], requirePermission("resources.view"), receiveAllocation);
superAdminRouter.post(["/inventory/allocations/:id/cancel", "/resource/inventory/allocations/:id/cancel"], requirePermission("resources.view"), cancelAllocation);

superAdminRouter.get(["/resource/:resource", "/:resource"], listResources);
superAdminRouter.get(["/roles/:id/permissions", "/resource/roles/:id/permissions"], getRolePermissions);
superAdminRouter.put(["/roles/:id/permissions", "/resource/roles/:id/permissions"], updateRolePermissions);
superAdminRouter.post(["/resource/:resource", "/:resource"], createResource);
superAdminRouter.patch(["/resource/:resource/:id", "/:resource/:id"], updateResource);
superAdminRouter.delete(["/resource/:resource/:id", "/:resource/:id"], deleteResource);

// Reports & CSV Export
superAdminRouter.get("/reports/summary", requirePermission("analytics.view"), getReportsSummary);
superAdminRouter.get("/reports/advanced", requirePermission("analytics.view"), getAdvancedReports);
superAdminRouter.get("/reports/:resource.csv", requirePermission("analytics.view"), exportResourceCsv);

// System Settings & Configuration
superAdminRouter.get(["/settings", "/resource/settings"], requirePermission("organization.view"), getSettings);
superAdminRouter.post(["/settings", "/resource/settings"], requirePermission("organization.view"), updateSettings);
superAdminRouter.post("/settings/backup", requirePermission("security.view"), triggerBackup);

// Automated Database Seed Triggers
superAdminRouter.post("/inventory/seed-csv", seedInventory);
superAdminRouter.post("/schools/seed-csv", seedSchools);

export default superAdminRouter;

