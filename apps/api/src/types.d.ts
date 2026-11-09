import type { AccessClaims } from "./lib/jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    admin?: AccessClaims;
  }
  interface FastifyInstance {
    requireAuth: (roles?: AccessClaims["role"][]) => (req: import("fastify").FastifyRequest, reply: import("fastify").FastifyReply) => Promise<void>;
  }
}
