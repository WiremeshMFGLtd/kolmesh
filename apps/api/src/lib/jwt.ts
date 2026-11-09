import { SignJWT, jwtVerify } from "jose";
import { env } from "../config.js";

const secret = new TextEncoder().encode(env.JWT_SECRET);
const ISSUER = "kolmesh-api";
const AUDIENCE = "kolmesh-admin";

export type AccessClaims = { sub: string; email: string; role: "owner" | "admin" | "editor"; name: string };

export async function signAccessToken(claims: AccessClaims) {
  return new SignJWT({ email: claims.email, role: claims.role, name: claims.name })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(env.ACCESS_TOKEN_TTL)
    .sign(secret);
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, secret, { issuer: ISSUER, audience: AUDIENCE, algorithms: ["HS256"] });
  return {
    sub: payload.sub!,
    email: payload.email as string,
    role: payload.role as AccessClaims["role"],
    name: payload.name as string,
  };
}

/** Short-lived token used between password step and TOTP step. */
export async function signMfaToken(adminId: string) {
  return new SignJWT({ stage: "mfa" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(adminId)
    .setIssuer(ISSUER)
    .setAudience("kolmesh-mfa")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret);
}

export async function verifyMfaToken(token: string) {
  const { payload } = await jwtVerify(token, secret, { issuer: ISSUER, audience: "kolmesh-mfa", algorithms: ["HS256"] });
  if (payload.stage !== "mfa") throw new Error("invalid stage");
  return payload.sub!;
}
