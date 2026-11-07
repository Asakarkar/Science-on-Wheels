import { prisma } from "./prisma";

export async function logAudit(
  actorUserId: string | undefined,
  action: string,
  entity?: string,
  entityId?: string,
  req?: any,
  metadata?: any
): Promise<void> {
  const actor =
    actorUserId ||
    req?.userId ||
    req?.res?.locals?.user?.id ||
    undefined;

  await prisma.auditLog
    .create({
      data: {
        actorUserId: actor,
        action,
        entity,
        entityId,
        ipAddress: req?.ip,
        userAgent: typeof req?.get === "function" ? req.get("user-agent") : undefined,
        metadata,
      },
    })
    .catch(() => undefined);
}

export const audit = logAudit;

