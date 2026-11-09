import fp from "fastify-plugin";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import cookie from "@fastify/cookie";
import sensible from "@fastify/sensible";
import { env, isProd } from "../config.js";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export default fp(async (app) => {
  await app.register(sensible);

  await app.register(helmet, {
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    crossOriginResourcePolicy: { policy: "same-site" },
    hsts: isProd ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
    referrerPolicy: { policy: "no-referrer" },
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      // Same-origin / server-to-server requests carry no Origin header.
      if (!origin) return cb(null, true);
      if (env.ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error("Origin not allowed"), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "authorization", "x-requested-with", "x-forwarded-host"],
    maxAge: 86400,
  });

  await app.register(cookie, { secret: env.COOKIE_SECRET, hook: "onRequest" });

  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: "1 minute",
    allowList: [],
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: (_req, ctx) => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: `Rate limit exceeded. Try again in ${Math.ceil(ctx.ttl / 1000)}s.`,
    }),
  });

  /**
   * CSRF defence for cookie-authenticated mutations:
   * 1) custom header requirement (browsers won't send it cross-origin without CORS pre-flight approval)
   * 2) Origin / Referer must match the allow-list when present.
   */
  app.addHook("onRequest", async (req, reply) => {
    if (!MUTATING.has(req.method)) return;
    if (req.url.startsWith("/health")) return;
    const xrw = req.headers["x-requested-with"];
    if (xrw !== "kolmesh") return reply.code(403).send({ error: "Forbidden", message: "Missing request header" });

    const origin = (req.headers.origin as string | undefined) ?? (req.headers.referer ? new URL(req.headers.referer).origin : undefined);
    if (origin && !env.ALLOWED_ORIGINS.includes(origin)) {
      return reply.code(403).send({ error: "Forbidden", message: "Origin not allowed" });
    }
  });

  // Remove fingerprinting headers
  app.addHook("onSend", async (_req, reply) => {
    reply.removeHeader("x-powered-by");
    reply.header("cache-control", reply.getHeader("cache-control") ?? "no-store");
  });
});
