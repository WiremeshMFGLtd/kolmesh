import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index.js";

console.log("⏳ Running migrations…");
await migrate(db, { migrationsFolder: "drizzle" });
console.log("✅ Migrations complete");
await pool.end();
