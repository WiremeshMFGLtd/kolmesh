import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Edge guard for the dashboard. The API is the source of truth for every
 * data request; this simply stops unauthenticated visitors from ever
 * loading admin pages. Verifies the signed access-token cookie set by the API.
 */
const secret = process.env.JWT_SECRET ? new TextEncoder().encode(process.env.JWT_SECRET) : null;

async function hasValidSession(req: NextRequest) {
  const raw = req.cookies.get("kol_at")?.value;
  if (!raw) return false;
  // @fastify/cookie signs as "<value>.<signature>" — the JWT itself has 2 dots.
  const parts = raw.split(".");
  if (parts.length < 3) return false;
  const jwt = parts.slice(0, 3).join(".");
  if (!secret) return true; // cannot verify at the edge → defer to the API (which always verifies)
  try {
    await jwtVerify(jwt, secret, { issuer: "kolmesh-api", audience: "kolmesh-admin" });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isLogin = pathname === "/admin/login";
  const ok = await hasValidSession(req);

  if (!ok && !isLogin) {
    // Access token may simply have expired while a refresh token is still valid;
    // the login page silently attempts a refresh and bounces back.
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (ok && isLogin) {
    const url = req.nextUrl.clone();
    url.pathname = req.nextUrl.searchParams.get("next") ?? "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("x-robots-tag", "noindex, nofollow");
  return res;
}

export const config = { matcher: ["/admin/:path*"] };
