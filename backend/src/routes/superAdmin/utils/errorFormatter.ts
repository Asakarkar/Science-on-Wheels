export function formatPrismaError(error: any): string {
  if (error?.code === "P2003") {
    const constraint = String(error.meta?.field_name || error.meta?.constraint || error.message || "");
    if (constraint.includes("Bus_regionId_fkey")) {
      return "Cannot delete this Region because active Mobile Laboratories (Buses) are assigned to it. Please reassign or delete the associated buses first.";
    }
    if (constraint.includes("District_regionId_fkey")) {
      return "Cannot delete this Region because Districts belong to it. Please remove or reassign the associated districts first.";
    }
    if (constraint.includes("School_regionId_fkey")) {
      return "Cannot delete this Region because Schools are registered under it. Please remove or reassign the associated schools first.";
    }
    if (constraint.includes("User_regionId_fkey")) {
      return "Cannot delete this Region because Staff/User accounts are assigned to it. Please reassign staff to another region first.";
    }
    if (constraint.includes("Route_regionId_fkey")) {
      return "Cannot delete this Region because Routes belong to it.";
    }
    if (constraint.includes("StaffTravelAssignment_regionId_fkey")) {
      return "Cannot delete this Region because Staff Travel Assignments reference it.";
    }
    if (constraint.includes("OperationalIssue_regionId_fkey")) {
      return "Cannot delete this Region because Operational Issues are logged against it.";
    }
    if (constraint.includes("Block_districtId_fkey")) {
      return "Cannot delete this District because Blocks belong to it. Please remove or reassign the blocks first.";
    }
    if (constraint.includes("School_districtId_fkey")) {
      return "Cannot delete this District because Schools belong to it. Please remove or reassign the schools first.";
    }
    if (constraint.includes("School_blockId_fkey")) {
      return "Cannot delete this Block because Schools are assigned to it. Please remove or reassign the schools first.";
    }
    if (constraint.includes("Equipment_busId_fkey")) {
      return "Cannot delete this Mobile Lab because physical Equipment assets are assigned to it. Please transfer equipment to another lab first.";
    }
    if (constraint.includes("Event_busId_fkey")) {
      return "Cannot delete this Mobile Lab because Visit Events are scheduled for it.";
    }
    if (constraint.includes("Trip_busId_fkey")) {
      return "Cannot delete this Mobile Lab because travel Trips reference it.";
    }
    if (constraint.includes("Event_schoolId_fkey")) {
      return "Cannot delete this School because Visit Events are scheduled or completed for it.";
    }
    if (constraint.includes("SchoolRegistration_schoolId_fkey")) {
      return "Cannot delete this School because Registration requests reference it.";
    }
    if (constraint.includes("RouteStop_schoolId_fkey")) {
      return "Cannot delete this School because Route Stops reference it.";
    }
    if (constraint.includes("Student_schoolId_fkey")) {
      return "Cannot delete this School because Student records are associated with it.";
    }
    if (constraint.includes("Teacher_schoolId_fkey")) {
      return "Cannot delete this School because Teacher records are associated with it.";
    }
    if (constraint.includes("User_roleId_fkey")) {
      return "Cannot delete this Role because User accounts currently have this role assigned.";
    }
    if (constraint.includes("Equipment_equipmentMasterId_fkey")) {
      return "Cannot delete this Equipment Master item because physical Equipment assets are linked to it.";
    }
    if (constraint.includes("ConsumableUsage_consumableId_fkey")) {
      return "Cannot delete this Consumable because lab usage records reference it.";
    }
    if (constraint.includes("InventoryTransaction_consumableId_fkey")) {
      return "Cannot delete this Consumable because inventory transactions reference it.";
    }
    if (constraint.includes("EventsOnCommunicator_userId_fkey")) {
      return "Cannot delete this user because they are assigned to visit events as a communicator. Please remove or reassign the event assignments first.";
    }
    if (constraint.includes("EventsOnCommunicator_eventId_fkey")) {
      return "Cannot delete this event because communicators are assigned to it.";
    }
    const match = constraint.match(/`?([A-Za-z0-9]+)_([A-Za-z0-9]+)_fkey`?/);
    if (match) {
      const [, table, field] = match;
      return `Cannot delete this record because dependent '${table}' records still reference it via '${field}'. Please remove or reassign related records first.`;
    }
    return "Cannot delete this record because other records in the system depend on it. Please remove or reassign dependent records first.";
  }

  if (error?.code === "P2025") {
    return "Record not found or has already been deleted.";
  }

  if (error?.code === "P2002") {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : error.meta?.target || "unique field";
    return `A record with this ${target} already exists.`;
  }

  const raw = String(error?.message || "Operation failed");
  const missingMatch = raw.match(/Argument `([^`]+)` is missing/);
  if (missingMatch) {
    return `Required field '${missingMatch[1]}' is missing.`;
  }

  const clean = raw
    .replace(/Invalid `[^`]+` invocation in [^\n]+\n/g, "")
    .replace(/\n\s*→\s*\d+\s+[^\n]+/g, "")
    .replace(/Foreign key constraint violated on the constraint:\s*`?[A-Za-z0-9_]+`?/g, "A dependent record prevents this deletion.")
    .trim();

  return clean || "Operation failed";
}

