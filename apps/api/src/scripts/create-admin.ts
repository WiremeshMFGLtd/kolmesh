/**
 * Creates the first (owner) admin account.
 * Usage: pnpm admin:create -- --email you@kolmesh.com --name "Your Name" --password "StrongPassw0rd!"
 */
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db, pool, schema } from "../db/index.js";

const args = Object.fromEntries(
  process.argv.slice(2).reduce<string[][]>((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1] ?? ""]);
    return acc;
  }, []),
);

const email = (args.email ?? "").toLowerCase().trim();
const name = args.name ?? "Administrator";
const password = args.password ?? "";

if (!email || !password || password.length < 12) {
  console.error("Usage: pnpm admin:create -- --email you@kolmesh.com --name \"Your Name\" --password \"<min 12 chars>\"");
  process.exit(1);
}

const existing = await db.query.admins.findFirst({ where: eq(schema.admins.email, email) });
if (existing) {
  console.error(`An admin with ${email} already exists.`);
  process.exit(1);
}
const owners = await db.select({ id: schema.admins.id }).from(schema.admins).where(eq(schema.admins.role, "owner"));
await db.insert(schema.admins).values({
  email,
  name,
  role: owners.length === 0 ? "owner" : "admin",
  passwordHash: await argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 1 }),
});
console.log(`✅ Created ${owners.length === 0 ? "owner" : "admin"} account for ${email}. Sign in at /admin/login and enable 2FA.`);
await pool.end();
