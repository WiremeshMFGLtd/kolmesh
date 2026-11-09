import Fastify, { type FastifyError } from "fastify";
import { env, isProd } from "./config.js";
import security from "./plugins/security.js";
import auth from "./plugins/auth.js";
import publicRoutes from "./routes/public.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import { pool } from "./db/index.js";

const app = Fastify({
  logger: isProd ? { level: "info", redact: ["req.headers.authorization", "req.headers.cookie"] } : { level: "debug", transport: undefined },
  trustProxy: env.TRUST_PROXY,
  bodyLimit: 1024 * 1024, // 1 MB JSON bodies; uploads use multipart with its own cap
  requestIdHeader: false,
  disableRequestLogging: isProd,
});

await app.register(security);
await app.register(auth);

app.get("/health", async () => {
  await pool.query("select 1");
  return { ok: true, ts: new Date().toISOString() };
});

await app.register(publicRoutes, { prefix: "/v1" });
await app.register(authRoutes, { prefix: "/v1/auth" });
await app.register(adminRoutes, { prefix: "/v1/admin" });

app.setNotFoundHandler((_req, reply) => reply.code(404).send({ error: "Not Found" }));
app.setErrorHandler((error: unknown, req, reply) => {
  const err = error as FastifyError;
  const status = err.statusCode ?? 500;
  if (status >= 500) req.log.error({ err }, "unhandled error");
  // Never leak stack traces or internals to clients.
  reply.code(status).send({
    error: status >= 500 ? "Internal Server Error" : err.name,
    message: status >= 500 ? "Something went wrong" : err.message,
    ...(err.validation ? { details: err.validation } : {}),
  });
});

const shutdown = async (signal: string) => {
  app.log.info(`${signal} received, shutting down`);
  await app.close();
  await pool.end();
  process.exit(0);
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

try {
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
