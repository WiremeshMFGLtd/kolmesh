/**
 * Creates the owner admin account, or resets its password if it already exists.
 *
 * Reads ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD from the environment
 * (or --email / --name / --password flags). Safe to run on every deploy:
 * when the variables are not set it does nothing.
 */
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db, pool, schema } from "../db/index.js";

const args = Object.fromEntries(
  process.argv.slice(2).reduce<string[][]>((acc, a, i, arr) => {
    if (a.startsWith("--") && a.length > 2) acc.push([a.slice(2), arr[i + 1] ?? ""]);
    return acc;
  }, []),
);

const email = (args.email || process.env.ADMIN_EMAIL || "").toLowerCase().trim();
const name = (args.name || process.env.ADMIN_NAME || "Administrator").trim();
const password = (args.password || process.env.ADMIN_PASSWORD || "").trim();

if (!email && !password) {
  console.log("ℹ️  admin:create skipped (ADMIN_EMAIL / ADMIN_PASSWORD not set)");
  await pool.end();
  process.exit(0);
}
if (!email || !email.includes("@")) {
  console.error("❌ admin:create: ADMIN_EMAIL is missing or invalid");
  await pool.end();
  process.exit(0);
}
if (password.length < 12) {
  console.error(`❌ admin:create: ADMIN_PASSWORD must be at least 12 characters (got ${password.length})`);
  await pool.end();
  process.exit(0);
}

const hash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 });
const existing = await db.query.admins.findFirst({ where: eq(schema.admins.email, email) });

if (existing) {
  await db
    .update(schema.admins)
    .set({ passwordHash: hash, name, isActive: true, failedAttempts: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(schema.admins.id, existing.id));
  // Sign out every existing session for this account
  await db.update(schema.refreshTokens).set({ revokedAt: new Date() }).where(eq(schema.refreshTokens.adminId, existing.id));
  console.log(`✅ admin:create: password reset and account unlocked for ${email} (role: ${existing.role})`);
} else {
  const owners = await db.select({ id: schema.admins.id }).from(schema.admins).where(eq(schema.admins.role, "owner"));
  const role = owners.length === 0 ? "owner" : "admin";
  await db.insert(schema.admins).values({ email, name, role, passwordHash: hash });
  console.log(`✅ admin:create: created ${role} account for ${email}`);
}

await pool.end();
