import { NextResponse } from "next/server";

/** Reject cross-origin mutations while allowing local development and same-origin deployments. */
export function requireSameOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const expected = new URL(request.url).origin;
  if (origin !== expected) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }
  return null;
}

export function requestExceedsBytes(request: Request, maxBytes: number): boolean {
  const length = Number(request.headers.get("content-length") ?? 0);
  return Number.isFinite(length) && length > maxBytes;
}
