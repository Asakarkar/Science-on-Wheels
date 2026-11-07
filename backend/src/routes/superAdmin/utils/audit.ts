import { logAudit } from "../../../lib/audit";

export async function audit(
  req: any,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: any
): Promise<void> {
  return logAudit(req.userId, action, entity, entityId, req, metadata);
}

export default audit;
