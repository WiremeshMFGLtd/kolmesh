import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema.js";
import { env } from "../config.js";

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: env.DATABASE_URL.includes("localhost") ? undefined : { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
export type DB = typeof db;
export { schema };
