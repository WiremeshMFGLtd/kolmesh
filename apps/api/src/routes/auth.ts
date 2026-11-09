import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import argon2 from "argon2";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { and, eq, isNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, schema } from "../db/index.js";
import { env } from "../config.js";
import { signAccessToken, signMfaToken, verifyMfaToken, type AccessClaims } from "../lib/jwt.js";
import { decrypt, encrypt, randomToken, sha256 } from "../lib/crypto.js";
import { ACCESS_COOKIE, REFRESH_COOKIE, cookieBase } from "../plugins/auth.js";
import { audit } from "../lib/audit.js";

const ARGON = { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 } as const;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
const ACCESS_MAX_AGE = 15 * 60;

authenticator.options = { window: 1 }; // accept ±30s drift

const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128)
  .refine((p) => /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p), "Use upper, lower case letters and a number");

async function issueSession(reply: FastifyReply, req: FastifyRequest, admin: typeof schema.admins.$inferSelect, family?: string) {
  const claims: AccessClaims = { sub: admin.id, email: admin.email, role: admin.role, name: admin.name };
  const access = await signAccessToken(claims);
  const refresh = randomToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86400_000);
  await db.insert(schema.refreshTokens).values({
    adminId: admin.id,
    tokenHash: sha256(refresh),
    family: family ?? randomUUID(),
    expiresAt,
    ipAddress: req.ip,
    userAgent: (req.headers["user-agent"] ?? "").slice(0, 300),
  });
  reply.setCookie(ACCESS_COOKIE, access, { ...cookieBase, maxAge: ACCESS_MAX_AGE });
  reply.setCookie(REFRESH_COOKIE, refresh, { ...cookieBase, path: "/api/v1/auth", maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86400 });
  return claims;
}

function clearSession(reply: FastifyReply) {
  reply.clearCookie(ACCESS_COOKIE, { ...cookieBase });
  reply.clearCookie(REFRESH_COOKIE, { ...cookieBase, path: "/api/v1/auth" });
}

const publicUser = (a: typeof schema.admins.$inferSelect) => ({
  id: a.id,
  email: a.email,
  name: a.name,
  role: a.role,
  totpEnabled: a.totpEnabled,
  mustChangePassword: a.mustChangePassword,
  lastLoginAt: a.lastLoginAt,
});

const authRoutes: FastifyPluginAsync = async (app) => {
  const strict = { config: { rateLimit: { max: 8, timeWindow: "15 minutes" } } };

  /* Step 1 — email + password */
  app.post("/login", strict, async (req, reply) => {
    const body = z.object({ email: z.string().email().max(120), password: z.string().min(1).max(128) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid credentials" });
    const email = body.data.email.toLowerCase().trim();
    const admin = await db.query.admins.findFirst({ where: eq(schema.admins.email, email) });

    // Constant-time-ish: always run a hash verify even if user is missing.
    const dummy = "$argon2id$v=19$m=65536,t=3,p=1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const ok = await argon2.verify(admin?.passwordHash ?? dummy, body.data.password).catch(() => false);

    if (!admin || !admin.isActive) {
      await audit(req, "auth.login_failed", { meta: { email, reason: "unknown_or_inactive" } });
      return reply.code(401).send({ error: "Invalid email or password" });
    }
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      return reply.code(423).send({ error: `Account locked. Try again in ${Math.ceil((admin.lockedUntil.getTime() - Date.now()) / 60000)} min.` });
    }
    if (!ok) {
      const failed = admin.failedAttempts + 1;
      await db
        .update(schema.admins)
        .set({ failedAttempts: failed, lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60000) : null })
        .where(eq(schema.admins.id, admin.id));
      await audit(req, "auth.login_failed", { entity: "admin", entityId: admin.id, meta: { failed } });
      return reply.code(401).send({ error: "Invalid email or password" });
    }

    await db.update(schema.admins).set({ failedAttempts: 0, lockedUntil: null }).where(eq(schema.admins.id, admin.id));

    if (admin.totpEnabled) {
      const mfaToken = await signMfaToken(admin.id);
      return { mfaRequired: true, mfaToken };
    }

    await db.update(schema.admins).set({ lastLoginAt: new Date(), lastLoginIp: req.ip }).where(eq(schema.admins.id, admin.id));
    await issueSession(reply, req, admin);
    await audit({ ...req, admin: { sub: admin.id, email: admin.email, role: admin.role, name: admin.name } } as FastifyRequest, "auth.login", { entity: "admin", entityId: admin.id });
    return { mfaRequired: false, user: publicUser(admin) };
  });

  /* Step 2 — TOTP code */
  app.post("/login/verify", strict, async (req, reply) => {
    const body = z.object({ mfaToken: z.string().max(2048), code: z.string().regex(/^\d{6}$/) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid code" });
    let adminId: string;
    try {
      adminId = await verifyMfaToken(body.data.mfaToken);
    } catch {
      return reply.code(401).send({ error: "Session expired, please sign in again" });
    }
    const admin = await db.query.admins.findFirst({ where: eq(schema.admins.id, adminId) });
    if (!admin?.totpSecret || !admin.isActive) return reply.code(401).send({ error: "Unauthorized" });
    if (!authenticator.check(body.data.code, decrypt(admin.totpSecret))) {
      await audit(req, "auth.mfa_failed", { entity: "admin", entityId: admin.id });
      return reply.code(401).send({ error: "Incorrect code" });
    }
    await db.update(schema.admins).set({ lastLoginAt: new Date(), lastLoginIp: req.ip }).where(eq(schema.admins.id, admin.id));
    await issueSession(reply, req, admin);
    await audit({ ...req, admin: { sub: admin.id, email: admin.email, role: admin.role, name: admin.name } } as FastifyRequest, "auth.login", { entity: "admin", entityId: admin.id, meta: { mfa: true } });
    return { user: publicUser(admin) };
  });

  /* Refresh with rotation + reuse detection */
  app.post("/refresh", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (req, reply) => {
    const raw = req.cookies[REFRESH_COOKIE];
    const unsigned = raw ? req.unsignCookie(raw) : null;
    if (!unsigned?.valid || !unsigned.value) return reply.code(401).send({ error: "Unauthorized" });

    const hash = sha256(unsigned.value);
    const token = await db.query.refreshTokens.findFirst({ where: eq(schema.refreshTokens.tokenHash, hash) });
    if (!token) {
      clearSession(reply);
      return reply.code(401).send({ error: "Unauthorized" });
    }
    if (token.revokedAt) {
      // Token reuse → someone replayed an old token. Kill the whole family.
      await db.update(schema.refreshTokens).set({ revokedAt: new Date() }).where(eq(schema.refreshTokens.family, token.family));
      await audit(req, "auth.refresh_reuse_detected", { entity: "admin", entityId: token.adminId, meta: { family: token.family } });
      clearSession(reply);
      return reply.code(401).send({ error: "Session invalidated" });
    }
    if (token.expiresAt < new Date()) {
      clearSession(reply);
      return reply.code(401).send({ error: "Session expired" });
    }
    const admin = await db.query.admins.findFirst({ where: eq(schema.admins.id, token.adminId) });
    if (!admin?.isActive) {
      clearSession(reply);
      return reply.code(401).send({ error: "Unauthorized" });
    }
    await db.update(schema.refreshTokens).set({ revokedAt: new Date() }).where(eq(schema.refreshTokens.id, token.id));
    const claims = await issueSession(reply, req, admin, token.family);
    return { user: publicUser(admin), claims: { role: claims.role } };
  });

  app.post("/logout", async (req, reply) => {
    const raw = req.cookies[REFRESH_COOKIE];
    const unsigned = raw ? req.unsignCookie(raw) : null;
    if (unsigned?.valid && unsigned.value) {
      await db.update(schema.refreshTokens).set({ revokedAt: new Date() }).where(eq(schema.refreshTokens.tokenHash, sha256(unsigned.value)));
    }
    clearSession(reply);
    return { ok: true };
  });

  /* ── Authenticated self-service ─────────────────────── */

  app.get("/me", { preHandler: app.requireAuth() }, async (req, reply) => {
    const admin = await db.query.admins.findFirst({ where: eq(schema.admins.id, req.admin!.sub) });
    if (!admin) return reply.code(401).send({ error: "Unauthorized" });
    return { user: publicUser(admin) };
  });

  app.post("/password", { preHandler: app.requireAuth() }, async (req, reply) => {
    const body = z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordSchema }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.issues[0]?.message ?? "Invalid input" });
    const admin = await db.query.admins.findFirst({ where: eq(schema.admins.id, req.admin!.sub) });
    if (!admin || !(await argon2.verify(admin.passwordHash, body.data.currentPassword))) {
      return reply.code(401).send({ error: "Current password is incorrect" });
    }
    await db
      .update(schema.admins)
      .set({ passwordHash: await argon2.hash(body.data.newPassword, ARGON), mustChangePassword: false, updatedAt: new Date() })
      .where(eq(schema.admins.id, admin.id));
    // Revoke all other sessions
    await db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(schema.refreshTokens.adminId, admin.id), isNull(schema.refreshTokens.revokedAt)));
    await audit(req, "auth.password_changed", { entity: "admin", entityId: admin.id });
    clearSession(reply);
    return { ok: true, reauth: true };
  });

  /* 2FA enrolment: generate secret → show QR → confirm with a code */
  app.post("/totp/setup", { preHandler: app.requireAuth() }, async (req) => {
    const secret = authenticator.generateSecret(20);
    const otpauth = authenticator.keyuri(req.admin!.email, "KOL Wire Mesh Admin", secret);
    const qr = await QRCode.toDataURL(otpauth, { margin: 1, width: 220 });
    // Store pending secret (encrypted) but keep totpEnabled=false until confirmed.
    await db.update(schema.admins).set({ totpSecret: encrypt(secret) }).where(and(eq(schema.admins.id, req.admin!.sub), eq(schema.admins.totpEnabled, false)));
    return { qr, secret };
  });

  app.post("/totp/confirm", { preHandler: app.requireAuth() }, async (req, reply) => {
    const body = z.object({ code: z.string().regex(/^\d{6}$/) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Enter the 6-digit code" });
    const admin = await db.query.admins.findFirst({ where: eq(schema.admins.id, req.admin!.sub) });
    if (!admin?.totpSecret) return reply.code(400).send({ error: "Start setup first" });
    if (!authenticator.check(body.data.code, decrypt(admin.totpSecret))) return reply.code(400).send({ error: "Incorrect code, try again" });
    await db.update(schema.admins).set({ totpEnabled: true, updatedAt: new Date() }).where(eq(schema.admins.id, admin.id));
    await audit(req, "auth.totp_enabled", { entity: "admin", entityId: admin.id });
    return { ok: true };
  });

  app.post("/totp/disable", { preHandler: app.requireAuth() }, async (req, reply) => {
    const body = z.object({ password: z.string().min(1).max(128), code: z.string().regex(/^\d{6}$/) }).safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: "Invalid input" });
    const admin = await db.query.admins.findFirst({ where: eq(schema.admins.id, req.admin!.sub) });
    if (!admin?.totpSecret || !(await argon2.verify(admin.passwordHash, body.data.password)) || !authenticator.check(body.data.code, decrypt(admin.totpSecret))) {
      return reply.code(401).send({ error: "Verification failed" });
    }
    await db.update(schema.admins).set({ totpEnabled: false, totpSecret: null, updatedAt: new Date() }).where(eq(schema.admins.id, admin.id));
    await audit(req, "auth.totp_disabled", { entity: "admin", entityId: admin.id });
    return { ok: true };
  });

  app.get("/sessions", { preHandler: app.requireAuth() }, async (req) => {
    return db
      .select({
        id: schema.refreshTokens.id,
        createdAt: schema.refreshTokens.createdAt,
        expiresAt: schema.refreshTokens.expiresAt,
        ipAddress: schema.refreshTokens.ipAddress,
        userAgent: schema.refreshTokens.userAgent,
      })
      .from(schema.refreshTokens)
      .where(and(eq(schema.refreshTokens.adminId, req.admin!.sub), isNull(schema.refreshTokens.revokedAt), sql`${schema.refreshTokens.expiresAt} > now()`))
      .orderBy(sql`${schema.refreshTokens.createdAt} desc`);
  });

  app.post("/sessions/revoke-all", { preHandler: app.requireAuth() }, async (req, reply) => {
    await db.update(schema.refreshTokens).set({ revokedAt: new Date() }).where(eq(schema.refreshTokens.adminId, req.admin!.sub));
    await audit(req, "auth.sessions_revoked", { entity: "admin", entityId: req.admin!.sub });
    clearSession(reply);
    return { ok: true };
  });
};

export { ARGON, passwordSchema };
export default authRoutes;
