import fp from "fastify-plugin";
import { verifyAccessToken, type AccessClaims } from "../lib/jwt.js";
import { isProd } from "../config.js";

export const ACCESS_COOKIE = "kol_at";
export const REFRESH_COOKIE = "kol_rt";

export const cookieBase = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/",
  signed: true,
};

export default fp(async (app) => {
  app.decorate("requireAuth", (roles?: AccessClaims["role"][]) => async (req, reply) => {
    const raw = req.cookies[ACCESS_COOKIE];
    const unsigned = raw ? req.unsignCookie(raw) : null;
    if (!unsigned?.valid || !unsigned.value) return reply.code(401).send({ error: "Unauthorized" });
    try {
      const claims = await verifyAccessToken(unsigned.value);
      if (roles && !roles.includes(claims.role)) return reply.code(403).send({ error: "Forbidden" });
      req.admin = claims;
    } catch {
      return reply.code(401).send({ error: "Unauthorized", code: "TOKEN_EXPIRED" });
    }
  });
});
