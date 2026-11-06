import { prisma } from "../../../lib/prisma";

export async function audit(
  req: any,
  action: string,
  entity: string,
  entityId?: string,
  metadata?: any
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorUserId: req.userId,
      action,
      entity,
      entityId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata
    }
  }).catch(() => undefined);
}

