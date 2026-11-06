import { Router } from "express";
import { requireAuth, requirePermission, requireSuperAdmin } from "../../middleware/auth";
import { getOverview, getHealth } from "./controllers/overviewController";
import {
  listResources,
  getRolePermissions,
  updateRolePermissions,
  createResource,
  updateResource,
  deleteResource
} from "./controllers/crudController";
import { getReportsSummary, exportResourceCsv } from "./controllers/reportController";
import { seedInventory, seedSchools } from "./controllers/seedController";

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
superAdminRouter.get(["/resource/:resource", "/:resource"], listResources);
superAdminRouter.get(["/roles/:id/permissions", "/resource/roles/:id/permissions"], getRolePermissions);
superAdminRouter.put(["/roles/:id/permissions", "/resource/roles/:id/permissions"], updateRolePermissions);
superAdminRouter.post(["/resource/:resource", "/:resource"], createResource);
superAdminRouter.patch(["/resource/:resource/:id", "/:resource/:id"], updateResource);
superAdminRouter.delete(["/resource/:resource/:id", "/:resource/:id"], deleteResource);

// Reports & CSV Export
superAdminRouter.get("/reports/summary", requirePermission("analytics.view"), getReportsSummary);
superAdminRouter.get("/reports/:resource.csv", requirePermission("analytics.view"), exportResourceCsv);

// Automated Database Seed Triggers
superAdminRouter.post("/inventory/seed-csv", seedInventory);
superAdminRouter.post("/schools/seed-csv", seedSchools);

export default superAdminRouter;

