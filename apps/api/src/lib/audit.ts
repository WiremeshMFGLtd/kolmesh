import type { FastifyRequest } from "fastify";
import { db, schema } from "../db/index.js";

export async function audit(
  req: FastifyRequest,
  action: string,
  opts: { entity?: string; entityId?: string; meta?: Record<string, unknown> } = {},
) {
  try {
    await db.insert(schema.auditLogs).values({
      adminId: req.admin?.sub ?? null,
      adminEmail: req.admin?.email ?? null,
      action,
      entity: opts.entity,
      entityId: opts.entityId,
      meta: opts.meta,
      ipAddress: req.ip,
    });
  } catch (err) {
    req.log.error({ err }, "audit log failed");
  }
}
