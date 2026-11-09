import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";

export async function POST(req: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET;
  const got = req.headers.get("x-revalidate-secret") ?? "";
  if (!expected || got.length !== expected.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { tags?: unknown };
  const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string" && t.length < 120).slice(0, 20) : [];
  for (const t of tags) revalidateTag(t);
  return NextResponse.json({ revalidated: tags });
}
